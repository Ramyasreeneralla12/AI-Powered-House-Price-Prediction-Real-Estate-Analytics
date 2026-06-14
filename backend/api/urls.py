from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomTokenObtainPairView, RegisterView, UserProfileView,
    PredictionHistoryViewSet, FavoritePropertyViewSet,
    PredictionCompareView, NotificationViewSet,
    AdminUserManagementViewSet, AdminStatsView, AdminRetrainView, AdminUploadDatasetView
)
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'predictions', PredictionHistoryViewSet, basename='prediction')
router.register(r'favorites', FavoritePropertyViewSet, basename='favorite')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'admin/users', AdminUserManagementViewSet, basename='admin-user')

urlpatterns = [
    # Auth endpoints
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('auth/profile/', UserProfileView.as_view(), name='auth_profile'),
    
    # Custom business endpoints
    path('predictions/compare/', PredictionCompareView.as_view(), name='prediction_compare'),
    
    # Admin endpoints
    path('admin/stats/', AdminStatsView.as_view(), name='admin_stats'),
    path('admin/retrain/', AdminRetrainView.as_view(), name='admin_retrain'),
    path('admin/upload-dataset/', AdminUploadDatasetView.as_view(), name='admin_upload_dataset'),
    
    # Router endpoints
    path('', include(router.urls)),
]
