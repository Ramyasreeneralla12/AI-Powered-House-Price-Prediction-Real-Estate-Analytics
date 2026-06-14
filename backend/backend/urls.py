from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_root_health_check(request):
    return JsonResponse({
        "status": "healthy",
        "message": "AI-Powered House Price Prediction & Real Estate Analytics API is running.",
        "endpoints": {
            "api_root": "/api/",
            "admin_panel": "/admin/"
        }
    })

urlpatterns = [
    path('', api_root_health_check, name='api_root_health_check'),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

