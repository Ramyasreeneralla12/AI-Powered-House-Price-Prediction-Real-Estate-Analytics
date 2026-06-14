import os
import pandas as pd
from celery import shared_task
from django.contrib.auth import get_user_model
from .models import MLModelMetadata, Notification
from ml.pipeline import train_and_save_models, DATASET_PATH

User = get_user_model()

@shared_task
def retrain_models_task(user_id=None, dataset_name='default_dataset.csv'):
    """
    Asynchronously retrain the Random Forest and XGBoost models
    on the loaded dataset and save the new binaries and metrics.
    """
    try:
        # Load dataset
        if not os.path.exists(DATASET_PATH):
            raise FileNotFoundError(f"Training dataset not found at: {DATASET_PATH}")
            
        df = pd.read_csv(DATASET_PATH)
        
        # Train and save
        metrics = train_and_save_models(df)
        
        # Get next version number
        last_rf = MLModelMetadata.objects.filter(model_name='Random Forest').order_back('-id').first()
        version = "1.0"
        if last_rf:
            try:
                v_num = float(last_rf.version)
                version = f"{v_num + 0.1:.1f}"
            except ValueError:
                version = "1.1"
                
        # Disable previous models
        MLModelMetadata.objects.filter(is_active=True).update(is_active=False)
        
        # Register new models metadata
        MLModelMetadata.objects.create(
            model_name='Random Forest',
            version=version,
            r2_score=metrics['rf']['r2'],
            mae=metrics['rf']['mae'],
            mse=metrics['rf']['mse'],
            is_active=True,
            dataset_name=dataset_name
        )
        
        MLModelMetadata.objects.create(
            model_name='XGBoost',
            version=version,
            r2_score=metrics['xgb']['r2'],
            mae=metrics['xgb']['mae'],
            mse=metrics['xgb']['mse'],
            is_active=True,
            dataset_name=dataset_name
        )
        
        # Send Notification
        admin_user = User.objects.get(id=user_id) if user_id else None
        
        # Broadcast to all admins / users
        Notification.objects.create(
            user=admin_user,
            title="Model Retraining Succeeded",
            message=f"Machine Learning models successfully retrained to version v{version} on dataset {dataset_name}. RF R2: {metrics['rf']['r2']:.4f}, XGB R2: {metrics['xgb']['r2']:.4f}.",
            type='SUCCESS'
        )
        return f"Successfully retrained models to v{version}"
        
    except Exception as e:
        # Create failure notification
        admin_user = User.objects.get(id=user_id) if user_id else None
        Notification.objects.create(
            user=admin_user,
            title="Model Retraining Failed",
            message=f"Model retraining failed with error: {str(e)}",
            type='WARNING'
        )
        raise e
