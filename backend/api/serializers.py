from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import PredictionHistory, NearbyAmenity, FavoriteProperty, MLModelMetadata, Notification

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'profile_picture')
        read_only_fields = ('id', 'role')

class RegisterSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True, required=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'confirm_password', 'full_name')
        
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
            
        # Validate password strength using Django's built-in rules
        try:
            validate_password(attrs['password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
            
        # Username validation
        username = attrs.get('username')
        if username and User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "A user with this username already exists."})
            
        # Email validation
        email = attrs.get('email')
        if not email:
            raise serializers.ValidationError({"email": "Email address is required."})
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "A user with this email address already exists."})
            
        return attrs
        
    def create(self, validated_data):
        # Extract full_name and map to first_name/last_name
        full_name = validated_data.pop('full_name')
        name_parts = full_name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # Remove confirm_password
        validated_data.pop('confirm_password')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name
        )
        return user

class NearbyAmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = NearbyAmenity
        fields = ('distance_school', 'distance_hospital', 'distance_shopping', 'distance_transport', 'distance_park')

class PredictionHistorySerializer(serializers.ModelSerializer):
    amenity = NearbyAmenitySerializer(read_only=True)
    is_favorite = serializers.SerializerMethodField()
    
    class Meta:
        model = PredictionHistory
        fields = '__all__'
        read_only_fields = ('id', 'user', 'predicted_price', 'price_range_min', 'price_range_max', 
                            'confidence_score', 'model_used', 'price_forecast_1yr', 'price_forecast_3yr',
                            'historical_index_json', 'investment_recommendation', 'investment_score',
                            'investment_description', 'visual_condition', 'cv_confidence', 'created_at')
                            
    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return FavoriteProperty.objects.filter(user=request.user, prediction=obj).exists()
        return False

class FavoritePropertySerializer(serializers.ModelSerializer):
    prediction_details = PredictionHistorySerializer(source='prediction', read_only=True)
    
    class Meta:
        model = FavoriteProperty
        fields = ('id', 'prediction', 'prediction_details', 'created_at')
        read_only_fields = ('id', 'created_at')

class MLModelMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLModelMetadata
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('id', 'created_at')
