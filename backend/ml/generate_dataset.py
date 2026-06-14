import os
import csv
import math
import numpy as np
import pandas as pd
from pipeline import train_and_save_models, CITY_LAT, CITY_LON, haversine_distance

ML_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ML_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
DATASET_PATH = os.path.join(DATA_DIR, "default_dataset.csv")

def generate_synthetic_data(num_samples=800):
    print(f"Generating {num_samples} realistic property records...")
    
    np.random.seed(42)
    
    data = []
    
    for i in range(num_samples):
        # 1. Coordinates: Random offset around City Center (Bangalore center)
        # Bounded within roughly 25km radius
        offset_lat = np.random.uniform(-0.15, 0.15)
        offset_lon = np.random.uniform(-0.15, 0.15)
        lat = CITY_LAT + offset_lat
        lon = CITY_LON + offset_lon
        
        # Calculate distance to center
        dist_to_center = haversine_distance(lat, lon, CITY_LAT, CITY_LON)
        
        # 2. Features
        area_sqft = float(np.random.randint(500, 4500))
        
        # Property Type: 0=APARTMENT, 1=HOUSE, 2=CONDO, 3=VILLA
        property_type = np.random.choice([0, 1, 2, 3], p=[0.5, 0.3, 0.1, 0.1])
        
        # Furnishing Status: 0=UNFURNISHED, 1=SEMI_FURNISHED, 2=FULLY_FURNISHED
        furnishing_status = np.random.choice([0, 1, 2], p=[0.3, 0.5, 0.2])

        # Bedrooms correlated with area
        if property_type == 3: # Villa
            bedrooms = np.random.choice([3, 4, 5])
        elif area_sqft < 900:
            bedrooms = 1
        elif area_sqft < 1600:
            bedrooms = 2
        elif area_sqft < 2800:
            bedrooms = 3
        else:
            bedrooms = np.random.choice([4, 5])
            
        # Bathrooms correlated with bedrooms
        bathrooms = bedrooms + np.random.choice([0, 1]) if bedrooms > 1 else 1
        
        # Floors
        if property_type == 3: # Villa
            floors = np.random.choice([2, 3])
        elif property_type == 1: # House
            floors = np.random.choice([1, 2, 3])
        else:
            floors = np.random.choice([1, 2, 3], p=[0.7, 0.25, 0.05]) if area_sqft > 1200 else 1
        
        # Age
        house_age = int(np.random.exponential(8.0))
        house_age = min(house_age, 50)  # cap age at 50
        
        # Balconies
        balcony_count = np.random.choice([0, 1, 2, 3], p=[0.2, 0.4, 0.3, 0.1]) if bedrooms > 1 else np.random.choice([0, 1])
        
        # Parking
        parking_available = int(np.random.choice([0, 1], p=[0.4, 0.6]))
        
        # 3. Amenities (Simulated distances)
        # Closer to city center = closer transport, hospitals, shopping
        dist_school = float(np.clip(np.random.exponential(1.2) + 0.2, 0.2, 8.0))
        dist_hospital = float(np.clip(np.random.exponential(1.5) + (dist_to_center * 0.1), 0.3, 10.0))
        dist_shopping = float(np.clip(np.random.exponential(1.8) + (dist_to_center * 0.15), 0.2, 12.0))
        dist_transport = float(np.clip(np.random.exponential(0.8) + 0.1, 0.1, 5.0))
        dist_park = float(np.clip(np.random.exponential(1.0) + 0.2, 0.2, 6.0))
        
        # 4. Target Price calculations (Realistic correlations)
        # Base price: ₹5000 per sqft in center, dropping by distance
        sqft_rate = 6000.0 - (dist_to_center * 120)  # drops as we go further out
        sqft_rate = max(sqft_rate, 3200.0)  # base floor rate
        
        price = (area_sqft * sqft_rate)
        
        # Property Type multipliers
        type_multipliers = {0: 1.0, 1: 1.20, 2: 1.08, 3: 1.45}
        price *= type_multipliers[property_type]
        
        # Furnishing status multipliers
        furn_multipliers = {0: 1.0, 1: 1.07, 2: 1.15}
        price *= furn_multipliers[furnishing_status]

        # Room multipliers
        price += (bedrooms * 450000)
        price += (bathrooms * 200000)
        price += (balcony_count * 50000)
        
        if parking_available:
            price += 150000
            
        # Age depreciation (2.5% per year, cap at 50% for realistic depreciation)
        depreciation = min(0.50, house_age * 0.025)
        price *= (1.0 - depreciation)
        
        # Proximity adjustments (higher values for closer amenities)
        # E.g. Transit proximity premium
        if dist_transport < 1.0:
            price *= 1.05
        elif dist_transport > 4.0:
            price *= 0.95
            
        if dist_hospital < 1.5:
            price *= 1.03
            
        if dist_shopping < 1.5:
            price *= 1.04
            
        # Add random market noise (+/- 5%)
        noise = np.random.uniform(0.95, 1.05)
        price *= noise
        
        # Convert to Lakhs (1 Lakh = 100,000)
        price_lakhs = float(price / 100000.0)
        
        data.append({
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "area_sqft": round(area_sqft, 1),
            "bedrooms": int(bedrooms),
            "bathrooms": int(bathrooms),
            "floors": int(floors),
            "house_age": int(house_age),
            "parking_available": int(parking_available),
            "balcony_count": int(balcony_count),
            "property_type": int(property_type),
            "furnishing_status": int(furnishing_status),
            "distance_school": round(dist_school, 2),
            "distance_hospital": round(dist_hospital, 2),
            "distance_shopping": round(dist_shopping, 2),
            "distance_transport": round(dist_transport, 2),
            "distance_park": round(dist_park, 2),
            "price": round(price_lakhs, 2)
        })
        
    # Write to CSV
    df = pd.DataFrame(data)
    df.to_csv(DATASET_PATH, index=False)
    print(f"Dataset generated and written to: {DATASET_PATH}")
    
    # Train models
    print("Training ML Models...")
    metrics = train_and_save_models(df)
    print("ML Models trained successfully!")
    print(f"Random Forest - R2 Score: {metrics['rf']['r2']:.4f}, MAE: {metrics['rf']['mae']:.2f} Lakhs")
    print(f"XGBoost       - R2 Score: {metrics['xgb']['r2']:.4f}, MAE: {metrics['xgb']['mae']:.2f} Lakhs")

if __name__ == "__main__":
    generate_synthetic_data()
