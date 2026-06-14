from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('USER', 'Regular User'),
        ('ADMIN', 'Administrator'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='USER')
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

class PredictionHistory(models.Model):
    FURNISHING_CHOICES = (
        ('UNFURNISHED', 'Unfurnished'),
        ('SEMI_FURNISHED', 'Semi-Furnished'),
        ('FULLY_FURNISHED', 'Fully Furnished'),
    )
    PROPERTY_TYPE_CHOICES = (
        ('APARTMENT', 'Apartment'),
        ('HOUSE', 'Individual House'),
        ('CONDO', 'Condominium'),
        ('VILLA', 'Luxury Villa'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='predictions', null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    area_sqft = models.FloatField()
    bedrooms = models.IntegerField()
    bathrooms = models.IntegerField()
    floors = models.IntegerField()
    house_age = models.IntegerField()
    parking_available = models.BooleanField(default=False)
    furnishing_status = models.CharField(max_length=20, choices=FURNISHING_CHOICES, default='UNFURNISHED')
    balcony_count = models.IntegerField(default=0)
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPE_CHOICES, default='APARTMENT')
    
    # Computer Vision parameters
    image_path = models.CharField(max_length=255, null=True, blank=True)
    visual_condition = models.CharField(max_length=20, null=True, blank=True)  # Premium, Standard, Luxury
    cv_confidence = models.FloatField(null=True, blank=True)
    
    # ML Prediction parameters
    predicted_price = models.FloatField()  # In Lakhs
    price_range_min = models.FloatField()  # In Lakhs
    price_range_max = models.FloatField()  # In Lakhs
    confidence_score = models.IntegerField()  # Out of 100
    model_used = models.CharField(max_length=50, default='XGBoost')
    
    # Forecasting parameters
    price_forecast_1yr = models.FloatField(null=True, blank=True)
    price_forecast_3yr = models.FloatField(null=True, blank=True)
    historical_index_json = models.TextField(null=True, blank=True) # JSON array of historical prices
    
    # Investment recommendation
    investment_recommendation = models.CharField(max_length=50, null=True, blank=True)
    investment_score = models.IntegerField(default=50)
    investment_description = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Prediction {self.id} - Rs. {self.predicted_price} Lakhs by {self.user.username if self.user else 'Anonymous'}"

class NearbyAmenity(models.Model):
    prediction = models.OneToOneField(PredictionHistory, on_delete=models.CASCADE, related_name='amenity')
    distance_school = models.FloatField()  # In km
    distance_hospital = models.FloatField()
    distance_shopping = models.FloatField()
    distance_transport = models.FloatField()
    distance_park = models.FloatField()
    
    def __str__(self):
        return f"Amenities for Prediction {self.prediction.id}"

class FavoriteProperty(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    prediction = models.ForeignKey(PredictionHistory, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'prediction')
        
    def __str__(self):
        return f"{self.user.username} favorited Prediction {self.prediction.id}"

class MLModelMetadata(models.Model):
    model_name = models.CharField(max_length=100) # e.g. 'Random Forest', 'XGBoost'
    version = models.CharField(max_length=20)
    r2_score = models.FloatField()
    mae = models.FloatField()
    mse = models.FloatField()
    is_active = models.BooleanField(default=False)
    trained_at = models.DateTimeField(auto_now_add=True)
    dataset_name = models.CharField(max_length=255, default='default_dataset.csv')
    
    def __str__(self):
        return f"{self.model_name} v{self.version} (Active={self.is_active})"

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('SUCCESS', 'Success'),
        ('INFO', 'Information'),
        ('WARNING', 'Warning'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    title = models.CharField(max_length=150)
    message = models.TextField()
    type = models.CharField(max_length=10, choices=NOTIFICATION_TYPES, default='INFO')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Notification for {self.user.username if self.user else 'All'}: {self.title}"
