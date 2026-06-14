import os
import sys
import json
import requests
import django

# Add backend directory to system path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

BASE_URL = "http://127.0.0.1:8000/api"

def run_integration_tests():
    print("Starting automated integration verification tests...")
    
    # 1. Test registration
    print("\n1. Testing User Registration...")
    reg_payload = {
        "username": "test_user_unique",
        "email": "test_unique@houseprice.com",
        "password": "StrongPassword123!",
        "confirm_password": "StrongPassword123!",
        "full_name": "Test User Integration"
    }
    
    # Clean user if exists from previous run
    from django.contrib.auth import get_user_model
    User = get_user_model()
    User.objects.filter(username="test_user_unique").delete()
    
    try:
        res = requests.post(f"{BASE_URL}/auth/register/", json=reg_payload)
        if res.status_code == 201:
            print("SUCCESS: User registration endpoint works!")
        else:
            print(f"FAILED: Registration returned {res.status_code} - {res.text}")
            sys.exit(1)
    except Exception as e:
        print(f"FAILED: Connection to backend failed: {e}")
        sys.exit(1)
        
    # 2. Test Login & JWT retrieval
    print("\n2. Testing User Login & JWT Auth...")
    login_payload = {
        "username": "test_user_unique",
        "password": "StrongPassword123!"
    }
    res = requests.post(f"{BASE_URL}/auth/login/", json=login_payload)
    if res.status_code == 200:
        data = res.json()
        token = data.get("access")
        print("SUCCESS: Login endpoint works and returned JWT token!")
    else:
        print(f"FAILED: Login returned {res.status_code} - {res.text}")
        sys.exit(1)
        
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Test Prediction valuation run (without image first)
    print("\n3. Testing Property Valuation Prediction API...")
    predict_payload = {
        "latitude": 12.9800,
        "longitude": 77.6000,
        "area_sqft": 1500,
        "bedrooms": 3,
        "bathrooms": 2,
        "floors": 2,
        "house_age": 4,
        "parking_available": True,
        "balcony_count": 2,
        "furnishing_status": "SEMI_FURNISHED",
        "property_type": "APARTMENT"
    }
    
    res = requests.post(f"{BASE_URL}/predictions/", json=predict_payload, headers=headers)
    if res.status_code == 201:
        pred_data = res.json()
        pred_id = pred_data.get("id")
        price = pred_data.get("predicted_price")
        print(f"SUCCESS: Valuation Prediction endpoint works! Predicted Price: Rs. {price} Lakhs (ID: {pred_id})")
        
        # Check components
        if "amenity" in pred_data:
            print("  - Geospatial proximity distances calculated successfully!")
        if "shap_explanation" in pred_data:
            print("  - SHAP explainability weights generated successfully!")
        if "forecast" in pred_data:
            print("  - Time-series future price projections fitted successfully!")
        if "investment_recommendation" in pred_data:
            print(f"  - AI Investment recommendation generated: {pred_data['investment_recommendation']}")
    else:
        # Safely decode and print text to prevent Windows cp1252 encoding crashes
        text_safe = res.text.encode('ascii', 'replace').decode('ascii')
        print(f"FAILED: Prediction returned status code {res.status_code}")
        print(f"Response: {text_safe}")
        sys.exit(1)
        
    # 4. Test PDF Report Generation
    print("\n4. Testing PDF Report Export...")
    res = requests.get(f"{BASE_URL}/predictions/{pred_id}/export_pdf/", headers=headers)
    if res.status_code == 200 and res.headers.get("content-type") == "application/pdf":
        print(f"SUCCESS: PDF Report generated successfully ({len(res.content)} bytes)!")
    else:
        print(f"FAILED: PDF Export returned {res.status_code} - {res.text}")
        sys.exit(1)
        
    # 5. Clean test user
    User.objects.filter(username="test_user_unique").delete()
    
    print("\n==============================================")
    print("ALL AUTOMATED INTEGRATION TESTS COMPLETED SUCCESSFULLY!")
    print("==============================================")
    sys.exit(0)

if __name__ == "__main__":
    run_integration_tests()
