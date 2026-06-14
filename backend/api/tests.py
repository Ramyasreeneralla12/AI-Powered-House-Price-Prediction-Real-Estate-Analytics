from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock

from api.models import (
    PredictionHistory, NearbyAmenity, FavoriteProperty, 
    MLModelMetadata, Notification
)

User = get_user_model()

class RealEstateAnalyticsTests(APITestCase):
    
    def setUp(self):
        # Create an active model metadata for predictions
        self.model_meta = MLModelMetadata.objects.create(
            model_name="XGBoost",
            version="1.0",
            r2_score=0.9993,
            mae=1.08,
            mse=1.5,
            is_active=True,
            dataset_name="default_dataset.csv"
        )
        
        # Create standard test user
        self.user_password = "userpassword123"
        self.user = User.objects.create_user(
            username="test_user",
            email="test_user@example.com",
            password=self.user_password,
            role="USER"
        )
        
        # Create admin test user
        self.admin = User.objects.create_user(
            username="test_admin",
            email="admin@example.com",
            password=self.user_password,
            role="ADMIN"
        )
        
        # Paths for API endpoints
        self.register_url = reverse('auth_register')
        self.login_url = reverse('auth_login')
        self.profile_url = reverse('auth_profile')
        self.prediction_list_url = reverse('prediction-list')
        self.favorites_url = reverse('favorite-list')
        self.compare_url = reverse('prediction_compare')
        self.notifications_url = reverse('notification-list')
        self.admin_stats_url = reverse('admin_stats')
        self.admin_retrain_url = reverse('admin_retrain')

    def test_user_registration(self):
        """Test user registration endpoint."""
        payload = {
            "username": "new_user",
            "email": "new_user@example.com",
            "password": "NewUserPassword123!",
            "confirm_password": "NewUserPassword123!",
            "full_name": "New User"
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.filter(username="new_user").count(), 1)

    def test_user_login(self):
        """Test obtaining JWT tokens."""
        payload = {
            "username": "test_user",
            "password": self.user_password
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["username"], "test_user")

    def test_get_user_profile(self):
        """Test retrieving user profile details (authenticated)."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "test_user")
        self.assertEqual(response.data["role"], "USER")

    @patch('api.views.predict_house_price')
    def test_create_prediction(self, mock_predict):
        """Test prediction creation and GIS distance calculation."""
        # Setup mock return value for prediction pipeline
        mock_predict.return_value = {
            "predicted_price_lakhs": 85.5,
            "confidence_score": 95,
            "model_used": "XGBoost",
            "forecast": {
                "price_1yr": 90.0,
                "price_3yr": 105.0,
                "history": [
                    {"year": 2024, "price": 80.0},
                    {"year": 2025, "price": 83.0}
                ]
            },
            "investment_recommendation": {
                "status": "Buy",
                "score": 88,
                "description": "Good location trends."
            },
            "amenities": {
                "school": 0.5,
                "hospital": 1.2,
                "shopping": 2.0,
                "transport": 0.4,
                "park": 0.8
            },
            "shap_explanation": [
                {"feature": "Area (sqft)", "effect": 12.5},
                {"feature": "Bedrooms", "effect": 4.2}
            ]
        }
        
        self.client.force_authenticate(user=self.user)
        payload = {
            "latitude": 12.9716,
            "longitude": 77.5946,
            "area_sqft": 1200,
            "bedrooms": 2,
            "bathrooms": 2,
            "floors": 1,
            "house_age": 5,
            "parking_available": True,
            "balcony_count": 1,
            "furnishing_status": "SEMI_FURNISHED",
            "property_type": "APARTMENT"
        }
        
        response = self.client.post(self.prediction_list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["predicted_price"], 85.5)
        self.assertEqual(response.data["model_used"], "XGBoost")
        
        # Verify database insertion
        pred_history = PredictionHistory.objects.get(id=response.data["id"])
        self.assertEqual(pred_history.user, self.user)
        self.assertEqual(pred_history.amenity.distance_school, 0.5)
        
        # Verify notification created
        self.assertTrue(Notification.objects.filter(user=self.user, title="Valuation Prediction Saved").exists())

    @patch('api.views.generate_prediction_pdf')
    def test_export_pdf_report(self, mock_generate_pdf):
        """Test PDF report generation retrieval."""
        mock_generate_pdf.return_value = b"%PDF-1.4 mock pdf data"
        
        # Create a mock prediction record
        prediction = PredictionHistory.objects.create(
            user=self.user,
            latitude=12.97,
            longitude=77.59,
            area_sqft=1500,
            bedrooms=3,
            bathrooms=2,
            floors=2,
            house_age=3,
            predicted_price=95.0,
            price_range_min=90.0,
            price_range_max=100.0,
            confidence_score=90,
            model_used="XGBoost"
        )
        
        self.client.force_authenticate(user=self.user)
        pdf_url = reverse('prediction-detail', kwargs={'pk': prediction.id}) + 'export_pdf/'
        response = self.client.get(pdf_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers['Content-Type'], 'application/pdf')
        self.assertEqual(response.content, b"%PDF-1.4 mock pdf data")

    def test_export_pdf_permission_denied(self):
        """Test that user cannot export another user's PDF report."""
        other_user = User.objects.create_user(
            username="other_user",
            email="other@example.com",
            password=self.user_password,
            role="USER"
        )
        
        prediction = PredictionHistory.objects.create(
            user=other_user,
            latitude=12.97,
            longitude=77.59,
            area_sqft=1500,
            bedrooms=3,
            bathrooms=2,
            floors=2,
            house_age=3,
            predicted_price=95.0,
            price_range_min=90.0,
            price_range_max=100.0,
            confidence_score=90,
            model_used="XGBoost"
        )
        
        self.client.force_authenticate(user=self.user)
        pdf_url = reverse('prediction-detail', kwargs={'pk': prediction.id}) + 'export_pdf/'
        response = self.client.get(pdf_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_favorite_properties(self):
        """Test favoriting a prediction history entry."""
        prediction = PredictionHistory.objects.create(
            user=self.user,
            latitude=12.97,
            longitude=77.59,
            area_sqft=1500,
            bedrooms=3,
            bathrooms=2,
            floors=2,
            house_age=3,
            predicted_price=95.0,
            price_range_min=90.0,
            price_range_max=100.0,
            confidence_score=90,
            model_used="XGBoost"
        )
        
        self.client.force_authenticate(user=self.user)
        payload = {"prediction": prediction.id}
        
        # Save favorite
        response = self.client.post(self.favorites_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(FavoriteProperty.objects.filter(user=self.user, prediction=prediction).exists())
        
        # List favorites
        response = self.client.get(self.favorites_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_compare_predictions(self):
        """Test property comparison endpoint."""
        pred1 = PredictionHistory.objects.create(
            user=self.user, latitude=12.9, longitude=77.5, area_sqft=1000,
            bedrooms=2, bathrooms=2, floors=1, house_age=5, predicted_price=50.0,
            price_range_min=45.0, price_range_max=55.0, confidence_score=85
        )
        pred2 = PredictionHistory.objects.create(
            user=self.user, latitude=12.95, longitude=77.55, area_sqft=2000,
            bedrooms=4, bathrooms=3, floors=2, house_age=1, predicted_price=120.0,
            price_range_min=110.0, price_range_max=130.0, confidence_score=92
        )
        
        self.client.force_authenticate(user=self.user)
        payload = {"ids": [pred1.id, pred2.id]}
        
        response = self.client.post(self.compare_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_notifications(self):
        """Test notifications endpoint and marking as read."""
        Notification.objects.create(
            user=self.user,
            title="Notification 1",
            message="Test Message 1",
            type="INFO",
            is_read=False
        )
        Notification.objects.create(
            user=self.user,
            title="Notification 2",
            message="Test Message 2",
            type="SUCCESS",
            is_read=False
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.notifications_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        # Mark all read
        mark_read_url = reverse('notification-list') + 'mark_all_read/'
        response = self.client.post(mark_read_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(user=self.user, is_read=False).count(), 0)

    def test_admin_permissions(self):
        """Test that regular users cannot access admin actions."""
        self.client.force_authenticate(user=self.user)
        
        # Attempt to get stats
        response = self.client.get(self.admin_stats_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Attempt to retrain
        response = self.client.post(self.admin_retrain_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('api.views.retrain_models_task.delay')
    def test_admin_actions(self, mock_retrain_task):
        """Test admin actions when authenticated as admin."""
        # Setup celery task mock
        mock_task = MagicMock()
        mock_task.id = "mock-task-id-123"
        mock_retrain_task.return_value = mock_task
        
        self.client.force_authenticate(user=self.admin)
        
        # Check stats
        response = self.client.get(self.admin_stats_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_predictions", response.data)
        self.assertIn("total_users", response.data)
        
        # Trigger retraining
        response = self.client.post(self.admin_retrain_url)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data["status"], "Retraining job queued.")
        self.assertEqual(response.data["task_id"], "mock-task-id-123")
        mock_retrain_task.assert_called_once_with(user_id=self.admin.id)
