import os
import json
import pandas as pd
from rest_framework import viewsets, generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404

from .models import PredictionHistory, NearbyAmenity, FavoriteProperty, MLModelMetadata, Notification
from .serializers import (
    UserSerializer, RegisterSerializer, PredictionHistorySerializer,
    FavoritePropertySerializer, MLModelMetadataSerializer, NotificationSerializer
)
from .pdf_generator import generate_prediction_pdf
from ml.pipeline import predict_house_price, DATASET_PATH
from ml.cv_model import get_classifier
from .tasks import retrain_models_task

User = get_user_model()

# -------------------------------------------------------------------------
# JWT AUTH OVERRIDE
# -------------------------------------------------------------------------
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

# -------------------------------------------------------------------------
# USER AUTH VIEWS
# -------------------------------------------------------------------------
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user

# -------------------------------------------------------------------------
# PREDICTION VIEWS
# -------------------------------------------------------------------------
class PredictionHistoryViewSet(viewsets.ModelViewSet):
    queryset = PredictionHistory.objects.all().order_by('-created_at')
    serializer_class = PredictionHistorySerializer
    
    def get_queryset(self):
        # Users can only see their own predictions unless they are admin
        if self.request.user.role == 'ADMIN':
            return PredictionHistory.objects.all().order_by('-created_at')
        return PredictionHistory.objects.filter(user=self.request.user).order_by('-created_at')
        
    def perform_create(self, serializer):
        # We handle prediction creation inside the create override below
        pass
        
    def create(self, request, *args, **kwargs):
        # 1. Parse input characteristics
        data = request.data
        
        # Determine the active model
        active_model = MLModelMetadata.objects.filter(is_active=True).first()
        model_type = active_model.model_name if active_model else 'XGBoost'
        
        # 2. Check if a property image was uploaded
        image_file = request.FILES.get('image')
        image_path = None
        visual_condition = None
        cv_confidence = None
        cv_metrics = {}
        filename = None
        
        if image_file:
            # Save uploaded image to media directory
            filename = default_storage.save(f"properties/{image_file.name}", image_file)
            image_path = default_storage.path(filename)
            
            # Run CV model
            try:
                classifier = get_classifier()
                cv_result = classifier.analyze_image(image_path)
                visual_condition = cv_result["condition"]
                cv_confidence = cv_result["confidence"]
                cv_metrics = cv_result["metrics"]
            except Exception as e:
                print(f"Error executing image analysis CV model: {e}")
                visual_condition = "Standard"
                cv_confidence = 0.60
                
        # 3. Compile ML Input details
        try:
            input_data = {
                "latitude": float(data.get("latitude") or 0.0),
                "longitude": float(data.get("longitude") or 0.0),
                "area_sqft": float(data.get("area_sqft") or 0.0),
                "bedrooms": int(data.get("bedrooms") or 0),
                "bathrooms": int(data.get("bathrooms") or 0),
                "floors": int(data.get("floors") or 0),
                "house_age": int(data.get("house_age") or 0),
                "parking_available": data.get("parking_available") in ['true', True, 1, '1'],
                "balcony_count": int(data.get("balcony_count") or 0),
                "property_type": data.get("property_type", "APARTMENT")
            }
        except (ValueError, TypeError) as e:
            return Response({"error": f"Invalid input format: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        
        # If visual condition is premium/luxury, give a slight premium score input or let it adjust output
        # Here we run standard prediction
        prediction_res = predict_house_price(input_data, active_model_type=model_type)
        
        # Adjust predicted price based on CV visual analysis if available
        # Premium adds 5%, Luxury adds 12%, Standard leaves it as is
        predicted_price = prediction_res["predicted_price_lakhs"]
        if visual_condition == "Premium":
            predicted_price *= 1.05
        elif visual_condition == "Luxury":
            predicted_price *= 1.12
            
        price_min = predicted_price * 0.90
        price_max = predicted_price * 1.10
        
        # 4. Save PredictionHistory record
        prediction_obj = PredictionHistory.objects.create(
            user=request.user if request.user.is_authenticated else None,
            latitude=input_data["latitude"],
            longitude=input_data["longitude"],
            area_sqft=input_data["area_sqft"],
            bedrooms=input_data["bedrooms"],
            bathrooms=input_data["bathrooms"],
            floors=input_data["floors"],
            house_age=input_data["house_age"],
            parking_available=input_data["parking_available"],
            furnishing_status=data.get("furnishing_status", "UNFURNISHED"),
            balcony_count=input_data["balcony_count"],
            property_type=input_data["property_type"],
            image_path=filename,
            visual_condition=visual_condition,
            cv_confidence=cv_confidence,
            predicted_price=round(predicted_price, 2),
            price_range_min=round(price_min, 2),
            price_range_max=round(price_max, 2),
            confidence_score=prediction_res["confidence_score"],
            model_used=prediction_res["model_used"],
            price_forecast_1yr=prediction_res["forecast"]["price_1yr"] * (1.05 if visual_condition == "Premium" else (1.12 if visual_condition == "Luxury" else 1.0)),
            price_forecast_3yr=prediction_res["forecast"]["price_3yr"] * (1.05 if visual_condition == "Premium" else (1.12 if visual_condition == "Luxury" else 1.0)),
            historical_index_json=json.dumps(prediction_res["forecast"]["history"]),
            investment_recommendation=prediction_res["investment_recommendation"]["status"],
            investment_score=prediction_res["investment_recommendation"]["score"],
            investment_description=prediction_res["investment_recommendation"]["description"]
        )
        
        # 5. Save NearbyAmenity record
        amenities = prediction_res["amenities"]
        NearbyAmenity.objects.create(
            prediction=prediction_obj,
            distance_school=amenities["school"],
            distance_hospital=amenities["hospital"],
            distance_shopping=amenities["shopping"],
            distance_transport=amenities["transport"],
            distance_park=amenities["park"]
        )
        
        # 6. Create saved notification
        if request.user.is_authenticated:
            Notification.objects.create(
                user=request.user,
                title="Valuation Prediction Saved",
                message=f"A valuation of Rs. {prediction_obj.predicted_price:.2f} Lakhs for {prediction_obj.get_property_type_display()} was successfully saved.",
                type='SUCCESS'
            )
            
        # 7. Construct Response with predictions, SHAP details, and CV data
        serializer = self.get_serializer(prediction_obj)
        res_data = serializer.data
        res_data["shap_explanation"] = prediction_res["shap_explanation"]
        res_data["cv_metrics"] = cv_metrics
        
        return Response(res_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def export_pdf(self, request, pk=None):
        """Export a prediction report as PDF."""
        prediction = get_object_or_404(PredictionHistory, pk=pk)
        
        # Check permissions: must own it or be admin
        if request.user.is_authenticated and request.user.role != 'ADMIN' and prediction.user != request.user:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        # Generate PDF bytes
        pdf_bytes = generate_prediction_pdf(prediction)
        
        # Serve PDF as download attachment
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="property_valuation_report_{pk}.pdf"'
        return response

# -------------------------------------------------------------------------
# FAVORITES VIEWS
# -------------------------------------------------------------------------
class FavoritePropertyViewSet(viewsets.ModelViewSet):
    serializer_class = FavoritePropertySerializer
    
    def get_queryset(self):
        return FavoriteProperty.objects.filter(user=self.request.user).order_by('-created_at')
        
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# -------------------------------------------------------------------------
# COMPARISONS VIEW
# -------------------------------------------------------------------------
class PredictionCompareView(APIView):
    def post(self, request):
        ids = request.data.get("ids", [])
        if not ids:
            return Response({"error": "No prediction ids provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        predictions = PredictionHistory.objects.filter(id__in=ids)
        
        # Check ownership: only show user's own predictions unless admin
        if request.user.role != 'ADMIN':
            predictions = predictions.filter(user=request.user)
            
        serializer = PredictionHistorySerializer(predictions, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

# -------------------------------------------------------------------------
# NOTIFICATIONS VIEW
# -------------------------------------------------------------------------
class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        # Return notifications belonging to this user, plus general broadcast notifications (user is null)
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')
        
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=self.request.user, is_read=False).update(is_read=True)
        return Response({"status": "all marked as read"}, status=status.HTTP_200_OK)

# -------------------------------------------------------------------------
# ADMIN VIEWS
# -------------------------------------------------------------------------
class AdminUserManagementViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer
    queryset = User.objects.all().order_by('username')
    
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        # Block if not admin
        if request.user.role != 'ADMIN':
            self.permission_denied(request, message="Administrator access required.")

class AdminStatsView(APIView):
    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        total_predictions = PredictionHistory.objects.count()
        total_users = User.objects.count()
        favorite_count = FavoriteProperty.objects.count()
        
        # Location price statistics (Average predicted price by property type)
        types = ['APARTMENT', 'HOUSE', 'CONDO', 'VILLA']
        type_averages = {}
        for t in types:
            preds = PredictionHistory.objects.filter(property_type=t)
            avg = sum(p.predicted_price for p in preds) / preds.count() if preds.exists() else 0
            type_averages[t] = round(avg, 2)
            
        # Model metadata
        models_meta = MLModelMetadataSerializer(MLModelMetadata.objects.all().order_by('-trained_at'), many=True).data
        
        # Recent predictions distribution by coordinates
        recent_preds = PredictionHistory.objects.all().order_by('-created_at')[:10]
        heat_points = [
            {"lat": float(p.latitude), "lng": float(p.longitude), "price": float(p.predicted_price)}
            for p in PredictionHistory.objects.all()
        ]
        
        return Response({
            "total_predictions": total_predictions,
            "total_users": total_users,
            "total_favorites": favorite_count,
            "type_averages": type_averages,
            "models_metadata": models_meta,
            "heat_points": heat_points,
            "recent_predictions": PredictionHistorySerializer(recent_preds, many=True).data
        }, status=status.HTTP_200_OK)

class AdminRetrainView(APIView):
    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        # Trigger Celery retraining task
        task = retrain_models_task.delay(user_id=request.user.id)
        
        # Create user notification that retraining started
        Notification.objects.create(
            user=request.user,
            title="Model Retraining Initiated",
            message="Model retraining has been sent to the background task manager. You will receive an alert upon completion.",
            type='INFO'
        )
        
        return Response({"status": "Retraining job queued.", "task_id": task.id}, status=status.HTTP_202_ACCEPTED)

class AdminUploadDatasetView(APIView):
    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not csv_file.name.endswith('.csv'):
            return Response({"error": "File must be a CSV."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Overwrite the default dataset with the uploaded one
            with default_storage.open("datasets/default_dataset.csv", 'wb+') as destination:
                for chunk in csv_file.chunks():
                    destination.write(chunk)
            
            # Copy file to DATASET_PATH
            os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)
            with open(DATASET_PATH, 'wb+') as dest:
                csv_file.seek(0)
                for chunk in csv_file.chunks():
                    dest.write(chunk)
                    
            # Queue model retraining
            task = retrain_models_task.delay(user_id=request.user.id, dataset_name=csv_file.name)
            
            Notification.objects.create(
                user=request.user,
                title="New Dataset Uploaded",
                message=f"Dataset '{csv_file.name}' was successfully uploaded. Model retraining has been queued.",
                type='INFO'
            )
            
            return Response({
                "status": "Dataset uploaded and retraining queued.",
                "filename": csv_file.name,
                "task_id": task.id
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            return Response({"error": f"Failed to process file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
