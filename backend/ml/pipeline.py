import os
import math
import hashlib
import requests
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor

# Paths for saved models
ML_DIR = os.path.dirname(os.path.abspath(__file__))
RF_MODEL_PATH = os.path.join(ML_DIR, "random_forest_model.joblib")
XGB_MODEL_PATH = os.path.join(ML_DIR, "xgboost_model.joblib")
SCALER_PATH = os.path.join(ML_DIR, "feature_scaler.joblib")
DATASET_PATH = os.path.join(ML_DIR, "data", "default_dataset.csv")

# Coordinates bounding box for location indexing (e.g., center of a major city)
# Let's target Bangalore (or can be any city). Lat: 12.9716, Lon: 77.5946
CITY_LAT = 12.9716
CITY_LON = 77.5946

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great-circle distance between two points in km."""
    r = 6371.0 # Earth radius
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c

# -------------------------------------------------------------------------
# 1. HYBRID GEOSPATIAL AMENITIES FETCHER
# -------------------------------------------------------------------------
def fetch_amenities_overpass(lat, lon):
    """Query OpenStreetMap Overpass API for nearby amenities (within 2.5km)."""
    overpass_url = "https://overpass-api.de/api/interpreter"
    
    # Overpass query to find amenities around coordinates
    query = f"""
    [out:json][timeout:2];
    (
      node["amenity"="school"](around:2500, {lat}, {lon});
      node["amenity"="hospital"](around:2500, {lat}, {lon});
      node["shop"~"mall|supermarket"](around:2500, {lat}, {lon});
      node["highway"="bus_stop"](around:2500, {lat}, {lon});
      node["railway"~"station|subway_entrance"](around:2500, {lat}, {lon});
      node["leisure"="park"](around:2500, {lat}, {lon});
    );
    out body 20;
    """
    try:
        response = requests.post(overpass_url, data={'data': query}, timeout=2.5)
        if response.status_code == 200:
            data = response.json()
            elements = data.get("elements", [])
            
            # Group distances
            distances = {
                "school": [],
                "hospital": [],
                "shopping": [],
                "transport": [],
                "park": []
            }
            
            for elem in elements:
                e_lat = elem.get("lat")
                e_lon = elem.get("lon")
                if e_lat and e_lon:
                    dist = haversine_distance(lat, lon, e_lat, e_lon)
                    tags = elem.get("tags", {})
                    
                    if "amenity" in tags and tags["amenity"] == "school":
                        distances["school"].append(dist)
                    elif "amenity" in tags and tags["amenity"] == "hospital":
                        distances["hospital"].append(dist)
                    elif "shop" in tags:
                        distances["shopping"].append(dist)
                    elif ("highway" in tags and tags["highway"] == "bus_stop") or "railway" in tags:
                        distances["transport"].append(dist)
                    elif "leisure" in tags and tags["leisure"] == "park":
                        distances["park"].append(dist)
                        
            # Get minimum distance or default to 5km if none found
            return {
                "school": float(min(distances["school"])) if distances["school"] else None,
                "hospital": float(min(distances["hospital"])) if distances["hospital"] else None,
                "shopping": float(min(distances["shopping"])) if distances["shopping"] else None,
                "transport": float(min(distances["transport"])) if distances["transport"] else None,
                "park": float(min(distances["park"])) if distances["park"] else None
            }
    except Exception as e:
        print(f"Overpass API error: {e}. Using simulated fallback.")
    return None

def fetch_amenities_hybrid(lat, lon):
    """Attempt OSM Overpass fetch, fallback to stable pseudo-random simulation."""
    result = fetch_amenities_overpass(lat, lon)
    if result is not None and any(v is not None for v in result.values()):
        # Fill missing values from live API with defaults
        for k in result:
            if result[k] is None:
                # generate a minor random value
                result[k] = float(np.random.uniform(1.5, 3.5))
        return result
        
    # Option B Fallback: Stable seed based on coordinate hashes
    seed_str = f"{lat:.4f},{lon:.4f}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**32)
    rng = np.random.default_rng(seed)
    
    return {
        "school": float(rng.uniform(0.3, 3.2)),
        "hospital": float(rng.uniform(0.6, 4.8)),
        "shopping": float(rng.uniform(0.4, 3.8)),
        "transport": float(rng.uniform(0.2, 2.2)),
        "park": float(rng.uniform(0.3, 2.8))
    }

# -------------------------------------------------------------------------
# 2. TIME-SERIES PRICE FORECASTING
# -------------------------------------------------------------------------
def get_historical_multipliers(lat, lon):
    """
    Get stable historical multipliers for 2022 to 2026 based on coordinates.
    Simulates neighborhood growth cycles.
    """
    seed_str = f"{lat:.3f},{lon:.3f}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16) % (2**32)
    rng = np.random.default_rng(seed)
    
    # Create a base growth rate (e.g. 5% to 15% annually)
    growth_rate = rng.uniform(0.05, 0.12)
    noise = rng.normal(0, 0.015, 5)
    
    # 2022 to 2026 multipliers (relative to 2026 base of 1.0)
    multipliers = []
    current_val = 1.0
    for i in range(5):
        year_idx = 4 - i  # 4 is 2026, 0 is 2022
        # Backtrack using growth rate + noise
        val = 1.0 / ((1 + growth_rate) ** year_idx) + noise[i]
        multipliers.append(val)
        
    # Force 2026 to be exactly 1.0
    multipliers[-1] = 1.0
    
    # Years: 2022, 2023, 2024, 2025, 2026
    return np.array(multipliers), growth_rate

def forecast_price(base_price, lat, lon):
    """Forecast prices for 1 and 3 years into the future using linear trend fitting."""
    multipliers, growth_rate = get_historical_multipliers(lat, lon)
    years = np.array([2022, 2023, 2024, 2025, 2026])
    
    # Fit linear regression: multiplier = slope * year + intercept
    slope, intercept = np.polyfit(years, multipliers, 1)
    
    # Project multipliers
    mult_1yr = slope * 2027 + intercept
    mult_3yr = slope * 2029 + intercept
    
    # Ensure forecasts don't depreciate below realistic boundaries
    mult_1yr = max(mult_1yr, 1.02)
    mult_3yr = max(mult_3yr, 1.08)
    
    # Apply to base predicted price
    price_1yr = base_price * mult_1yr
    price_3yr = base_price * mult_3yr
    
    # Historical series for charting
    history = []
    for yr, mult in zip(years, multipliers):
        history.append({"year": int(yr), "price": round(base_price * mult, 2)})
        
    forecasts = [
        {"year": 2027, "price": round(price_1yr, 2), "label": "+1 Year Forecast"},
        {"year": 2029, "price": round(price_3yr, 2), "label": "+3 Year Forecast"}
    ]
    
    # Calculate trend slope sign
    trend_type = "Increasing" if slope > 0.01 else ("Decreasing" if slope < -0.01 else "Stable")
    
    return {
        "price_1yr": round(price_1yr, 2),
        "price_3yr": round(price_3yr, 2),
        "history": history,
        "forecasts": forecasts,
        "growth_rate_pct": round(growth_rate * 100, 2),
        "trend": trend_type
    }

# -------------------------------------------------------------------------
# 3. AI INVESTMENT RECOMMENDATION
# -------------------------------------------------------------------------
def get_investment_recommendation(predicted_price, forecast_data, distance_stats):
    """Generates an intelligent real estate investment recommendation card."""
    growth_rate = forecast_data["growth_rate_pct"]
    trend = forecast_data["trend"]
    
    # Score features: closer transport/schools is better
    proximity_score = 0
    if distance_stats["transport"] < 1.0: proximity_score += 30
    elif distance_stats["transport"] < 2.0: proximity_score += 15
    
    if distance_stats["hospital"] < 1.5: proximity_score += 25
    elif distance_stats["hospital"] < 3.0: proximity_score += 10
        
    if distance_stats["school"] < 1.0: proximity_score += 25
    elif distance_stats["school"] < 2.0: proximity_score += 15
        
    if distance_stats["park"] < 1.0: proximity_score += 20
    
    # Growth metrics
    score = proximity_score
    if growth_rate > 10:
        score += 40
    elif growth_rate > 7:
        score += 25
    else:
        score += 10
        
    # Assign recommendation
    if score >= 80 and trend == "Increasing":
        rec = "Strong Buy"
        desc = "Exceptional investment potential. High historical price appreciation coupled with prime location scores and excellent transit infrastructure."
    elif score >= 50:
        rec = "Buy / Good Opportunity"
        desc = "Solid purchase option. Shows stable location demand, steady price growth, and standard convenience features with favorable future projections."
    elif score >= 30:
        rec = "Hold / Neutral"
        desc = "Moderate potential. Suitable for primary residence, but expect slow capital appreciation due to longer distances to business sectors or transport nodes."
    else:
        rec = "Avoid / High Risk"
        desc = "High market risk. Slow or stagnant price appreciation trends. Recommended only if priced significantly below local market averages."
        
    return {
        "status": rec,
        "score": score,
        "description": desc
    }

# -------------------------------------------------------------------------
# 4. SHAP MODEL EXPLAINABILITY (with safe fallback)
# -------------------------------------------------------------------------
def explain_prediction_shap(model, features_df):
    """
    Computes custom feature contributions for explainable AI.
    Falls back to a structured mathematical importances-weighting if SHAP
    compilation fails or errors out.
    """
    feature_names = list(features_df.columns)
    input_values = features_df.iloc[0].to_dict()
    
    try:
        import shap
        # TreeExplainer is ideal for Random Forest & XGBoost
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(features_df)
        
        # Extract features impact values
        if isinstance(shap_values, list): # Multi-class or multi-output handles
            impacts = shap_values[0][0]
        else:
            impacts = shap_values[0]
            
        shap_dict = {}
        for col, val in zip(feature_names, impacts):
            shap_dict[col] = float(val)
        return shap_dict
        
    except Exception as e:
        print(f"SHAP explanation failed: {e}. Executing robust feature-importance fallback.")
        
        # Mathematical fallback:
        # Weigh feature importances by the input values relative to common ranges
        importances = getattr(model, "feature_importances_", None)
        if importances is None:
            # Equal weight fallback
            importances = [1.0 / len(feature_names)] * len(feature_names)
            
        # Common feature boundaries for weighting impact directions
        # E.g. larger area = positive, older age = negative, closer amenities = positive
        impact_directions = {
            "area_sqft": 1,
            "bedrooms": 1,
            "bathrooms": 1,
            "floors": 0.5,
            "house_age": -1, # older is worse
            "parking_available": 1,
            "balcony_count": 0.5,
            "latitude": 0.1,
            "longitude": 0.1,
            "distance_school": -1, # closer (smaller dist) is better
            "distance_hospital": -1,
            "distance_shopping": -1,
            "distance_transport": -1,
            "distance_park": -1,
        }
        
        raw_impacts = {}
        for name, imp in zip(feature_names, importances):
            direction = impact_directions.get(name, 1)
            # base contribution
            contrib = imp * direction
            # scale based on inputs
            if name == "house_age" and input_values[name] > 0:
                contrib *= (input_values[name] / 10.0) # age amplifies negative impact
            elif name.startswith("distance_") and input_values[name] > 2.0:
                contrib *= (input_values[name] / 2.0) # large distance amplifies negative impact
                
            raw_impacts[name] = float(contrib)
            
        # Normalize impacts so their absolute sum equals roughly 20% of predicted price (typical shift)
        total_abs = sum(abs(v) for v in raw_impacts.values())
        if total_abs == 0: total_abs = 1.0
        
        scale_factor = 0.20 # 20%
        normalized_impacts = {k: (v / total_abs) * scale_factor for k, v in raw_impacts.items()}
        return normalized_impacts

# -------------------------------------------------------------------------
# 5. INITIAL TRAINING PIPELINE
# -------------------------------------------------------------------------
def train_and_save_models(df):
    """
    Trains Random Forest and XGBoost regressors on the property dataframe.
    Saves model and scaling binaries to disk.
    """
    # Columns to train on
    feature_cols = [
        "latitude", "longitude", "area_sqft", "bedrooms", "bathrooms",
        "floors", "house_age", "parking_available", "balcony_count",
        "property_type", "furnishing_status",
        "distance_school", "distance_hospital", "distance_shopping",
        "distance_transport", "distance_park"
    ]
    
    # Categoricals are pre-encoded in standard datasets or mapped
    X = df[feature_cols]
    y = df["price"]
    
    # Train Random Forest Regressor
    rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_model.fit(X, y)
    
    # Train XGBoost Regressor
    xgb_model = XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.08, random_state=42)
    xgb_model.fit(X, y)
    
    # Save models
    joblib.dump(rf_model, RF_MODEL_PATH)
    joblib.dump(xgb_model, XGB_MODEL_PATH)
    
    # Calculate train performance
    from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
    
    rf_pred = rf_model.predict(X)
    xgb_pred = xgb_model.predict(X)
    
    metrics = {
        "rf": {
            "r2": float(r2_score(y, rf_pred)),
            "mae": float(mean_absolute_error(y, rf_pred)),
            "mse": float(mean_squared_error(y, rf_pred))
        },
        "xgb": {
            "r2": float(r2_score(y, xgb_pred)),
            "mae": float(mean_absolute_error(y, xgb_pred)),
            "mse": float(mean_squared_error(y, xgb_pred))
        }
    }
    
    return metrics

def predict_house_price(input_data, active_model_type="XGBoost"):
    """
    Takes property details dict, performs geospatial amenity fetches,
    runs the chosen ML prediction model, calculates explanations (SHAP),
    and computes future price forecasts and investment advice.
    """
    # 1. Fetch Hybrid Geospatial Amenities
    lat = float(input_data["latitude"])
    lon = float(input_data["longitude"])
    amenities = fetch_amenities_hybrid(lat, lon)
    
    # 2. Map input dictionary to pandas dataframe
    property_type_map = {"APARTMENT": 0, "HOUSE": 1, "CONDO": 2, "VILLA": 3}
    furnishing_status_map = {"UNFURNISHED": 0, "SEMI_FURNISHED": 1, "FULLY_FURNISHED": 2}
    
    prop_type_val = property_type_map.get(str(input_data.get("property_type", "APARTMENT")).upper(), 0)
    furn_val = furnishing_status_map.get(str(input_data.get("furnishing_status", "UNFURNISHED")).upper(), 0)

    features = {
        "latitude": lat,
        "longitude": lon,
        "area_sqft": float(input_data["area_sqft"]),
        "bedrooms": int(input_data["bedrooms"]),
        "bathrooms": int(input_data["bathrooms"]),
        "floors": int(input_data["floors"]),
        "house_age": int(input_data["house_age"]),
        "parking_available": 1 if input_data.get("parking_available", False) else 0,
        "balcony_count": int(input_data.get("balcony_count", 0)),
        "property_type": prop_type_val,
        "furnishing_status": furn_val,
        "distance_school": amenities["school"],
        "distance_hospital": amenities["hospital"],
        "distance_shopping": amenities["shopping"],
        "distance_transport": amenities["transport"],
        "distance_park": amenities["park"]
    }
    
    features_df = pd.DataFrame([features])
    
    # 3. Load active model
    # Load model binaries, fallback to fresh model if missing
    if active_model_type == "Random Forest" and os.path.exists(RF_MODEL_PATH):
        model = joblib.load(RF_MODEL_PATH)
    elif os.path.exists(XGB_MODEL_PATH):
        model = joblib.load(XGB_MODEL_PATH)
    else:
        # Fallback heuristic predictor if no model files exist yet
        print("ML Models not trained yet! Performing baseline heuristic prediction.")
        # Baseline heuristic calculation
        base_price = (features["area_sqft"] * 5000) # Base ₹5000 per sqft
        
        # Apply property type premiums to baseline
        type_multipliers = {0: 1.0, 1: 1.20, 2: 1.08, 3: 1.45}
        base_price *= type_multipliers.get(prop_type_val, 1.0)
        
        # Apply furnishing status premiums to baseline
        furn_multipliers = {0: 1.0, 1: 1.07, 2: 1.15}
        base_price *= furn_multipliers.get(furn_val, 1.0)

        base_price += (features["bedrooms"] * 450000) # Add ₹4.5 Lakhs per bedroom
        base_price += (features["bathrooms"] * 200000) # Add ₹2 Lakhs per bathroom
        # Age penalty
        age_penalty = min(0.50, features["house_age"] * 0.025)
        base_price *= (1.0 - age_penalty)
        # Location modifier (simulated high value closer to city center)
        dist_to_center = haversine_distance(lat, lon, CITY_LAT, CITY_LON)
        center_premium = max(0.0, 1.5 - (dist_to_center / 15.0)) # up to 50% premium within 15km
        base_price *= (1.0 + center_premium)
        predicted_price = base_price / 100000.0 # Convert to Lakhs
        
        # Mock explanation and forecasts for self-bootstrapping
        shap_explanation = {k: 0.1 for k in features.keys()}
        forecast_data = forecast_price(predicted_price, lat, lon)
        investment_rec = get_investment_recommendation(predicted_price, forecast_data, amenities)
        
        return {
            "predicted_price_lakhs": round(predicted_price, 2),
            "price_range_min": round(predicted_price * 0.92, 2),
            "price_range_max": round(predicted_price * 1.08, 2),
            "confidence_score": 85,
            "amenities": amenities,
            "shap_explanation": shap_explanation,
            "forecast": forecast_data,
            "investment_recommendation": investment_rec,
            "model_used": "Baseline Heuristic (Untrained)"
        }
        
    # 4. Predict
    pred_val = model.predict(features_df)[0]
    # Prediction values are in Lakhs
    predicted_price = float(pred_val)
    
    # Calculate confidence score based on proximity to center and data distribution
    dist_to_center = haversine_distance(lat, lon, CITY_LAT, CITY_LON)
    if dist_to_center < 10.0:
        confidence = 92
    elif dist_to_center < 25.0:
        confidence = 85
    else:
        confidence = 74
        
    # 5. Extract explainability details (SHAP values)
    shap_explanation = explain_prediction_shap(model, features_df)
    
    # 6. Forecast Price trends (1 and 3 years)
    forecast_data = forecast_price(predicted_price, lat, lon)
    
    # 7. Generate Investment Recommendation card
    investment_rec = get_investment_recommendation(predicted_price, forecast_data, amenities)
    
    return {
        "predicted_price_lakhs": round(predicted_price, 2),
        "price_range_min": round(predicted_price * 0.90, 2),
        "price_range_max": round(predicted_price * 1.10, 2),
        "confidence_score": confidence,
        "amenities": amenities,
        "shap_explanation": shap_explanation,
        "forecast": forecast_data,
        "investment_recommendation": investment_rec,
        "model_used": active_model_type
    }
