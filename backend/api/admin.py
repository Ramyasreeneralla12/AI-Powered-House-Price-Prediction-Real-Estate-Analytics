from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, PredictionHistory, NearbyAmenity, FavoriteProperty, MLModelMetadata, Notification

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'role', 'is_staff', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'profile_picture')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role', 'profile_picture')}),
    )

class NearbyAmenityInline(admin.StackedInline):
    model = NearbyAmenity
    can_delete = False
    verbose_name_plural = 'Geospatial Amenities'

class PredictionHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'property_type', 'predicted_price', 'confidence_score', 'visual_condition', 'created_at']
    list_filter = ['property_type', 'visual_condition', 'created_at']
    search_fields = ['user__username', 'id']
    inlines = [NearbyAmenityInline]

admin.site.register(User, CustomUserAdmin)
admin.site.register(PredictionHistory, PredictionHistoryAdmin)
admin.site.register(NearbyAmenity)
admin.site.register(FavoriteProperty)
admin.site.register(MLModelMetadata)
admin.site.register(Notification)
