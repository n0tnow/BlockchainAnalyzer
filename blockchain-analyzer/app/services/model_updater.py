import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.model_selection import train_test_split
from datetime import datetime, timedelta
import joblib
import os
from .model_evaluator import ModelEvaluator

class ModelUpdater:
    def __init__(self, model, model_name, model_type, update_interval_days=7):
        self.base_model = model
        self.model_name = model_name
        self.model_type = model_type
        self.update_interval_days = update_interval_days
        self.last_update = None
        self.current_model = clone(model)
        self.evaluator = ModelEvaluator(model_name, model_type)
        
    def needs_update(self):
        """Modelin güncellenmesi gerekip gerekmediğini kontrol et"""
        if self.last_update is None:
            return True
        
        days_since_update = (datetime.now() - self.last_update).days
        return days_since_update >= self.update_interval_days
    
    def update_model(self, X, y=None):
        """Modeli yeni verilerle güncelle"""
        if not self.needs_update():
            return False
        
        # Modeli klonla ve yeni verilerle eğit
        new_model = clone(self.base_model)
        
        if self.model_type == 'classification':
            new_model.fit(X, y)
            y_pred = new_model.predict(X)
            metrics, cm = self.evaluator.evaluate_classification(new_model, X, y, y_pred)
        else:
            predictions = new_model.fit_predict(X)
            metrics = self.evaluator.evaluate_anomaly(new_model, X, predictions)
        
        # Performans iyileştiyse modeli güncelle
        if metrics.get('f1', metrics.get('silhouette_score', 0)) > self.evaluator.best_score:
            self.current_model = new_model
            self.last_update = datetime.now()
            self._save_model()
            return True
        
        return False
    
    def incremental_update(self, X_new, y_new=None):
        """Modeli yeni verilerle artımlı olarak güncelle"""
        if self.model_type == 'classification':
            # Sınıflandırma için artımlı öğrenme
            self.current_model.fit(X_new, y_new)
        else:
            # Anomali tespiti için yeni verileri ekle
            self.current_model.fit(X_new)
        
        self.last_update = datetime.now()
        self._save_model()
    
    def _save_model(self):
        """Güncel modeli kaydet"""
        model_dir = 'models'
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        model_path = os.path.join(model_dir, f'{self.model_name}_{timestamp}.joblib')
        joblib.dump(self.current_model, model_path)
        
        # En son modeli de kaydet
        latest_path = os.path.join(model_dir, f'{self.model_name}_latest.joblib')
        joblib.dump(self.current_model, latest_path)
    
    @classmethod
    def load_model(cls, model_name, model_type):
        """Kaydedilmiş modeli yükle"""
        model_path = os.path.join('models', f'{model_name}_latest.joblib')
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model bulunamadı: {model_path}")
        
        model = joblib.load(model_path)
        updater = cls(model, model_name, model_type)
        updater.current_model = model
        updater.last_update = datetime.fromtimestamp(os.path.getmtime(model_path))
        
        return updater
    
    def get_model_info(self):
        """Model bilgilerini döndür"""
        return {
            'model_name': self.model_name,
            'model_type': self.model_type,
            'last_update': self.last_update.isoformat() if self.last_update else None,
            'next_update': (self.last_update + timedelta(days=self.update_interval_days)).isoformat() 
                if self.last_update else None,
            'best_score': self.evaluator.best_score,
            'metrics_history': self.evaluator.metrics_history
        }

# Kullanım örneği:
"""
# Model güncelleyici oluştur
updater = ModelUpdater(
    model=RandomForestClassifier(),
    model_name='fraud_detection',
    model_type='classification',
    update_interval_days=7
)

# Yeni verilerle güncelle
if updater.needs_update():
    updater.update_model(X_new, y_new)

# Artımlı güncelleme
updater.incremental_update(X_incremental, y_incremental)

# Model bilgilerini al
model_info = updater.get_model_info()

# Kaydedilmiş modeli yükle
loaded_updater = ModelUpdater.load_model('fraud_detection', 'classification')
""" 