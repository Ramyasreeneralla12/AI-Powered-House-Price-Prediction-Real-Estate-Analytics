import os
import sys
import django

# Add the backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import MLModelMetadata

User = get_user_model()

def seed_data():
    print("Seeding initial database content...")
    
    # 1. Seed ML Model Metadata from our training outputs
    rf, created_rf = MLModelMetadata.objects.get_or_create(
        model_name='Random Forest',
        version='1.0',
        defaults={
            'r2_score': 0.9942,
            'mae': 3.46,
            'mse': 11.97,
            'is_active': False,
            'dataset_name': 'default_dataset.csv'
        }
    )
    if created_rf:
        print("Seeded Random Forest metadata.")
        
    xgb, created_xgb = MLModelMetadata.objects.get_or_create(
        model_name='XGBoost',
        version='1.0',
        defaults={
            'r2_score': 0.9993,
            'mae': 1.08,
            'mse': 1.16,
            'is_active': True,
            'dataset_name': 'default_dataset.csv'
        }
    )
    if created_xgb:
        print("Seeded XGBoost metadata.")
        
    # 2. Seed Admin Superuser
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser(
            username='admin',
            email='admin@houseprice.com',
            password='admin123',
            role='ADMIN',
            first_name='Admin',
            last_name='User'
        )
        print("Superuser created: username='admin', password='admin123'")
        
    # 3. Seed Regular User for testing
    if not User.objects.filter(username='user').exists():
        User.objects.create_user(
            username='user',
            email='user@houseprice.com',
            password='user123',
            role='USER',
            first_name='Regular',
            last_name='User'
        )
        print("Regular user created: username='user', password='user123'")
        
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_data()
