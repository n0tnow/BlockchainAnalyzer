import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.neighbors import LocalOutlierFactor
from .dataset_loader import EllipticDatasetLoader
from .model_evaluator import ModelEvaluator
from .model_updater import ModelUpdater
from .ab_testing import ABTester
import joblib
import os

class ModelTrainer:
    def __init__(self):
        self.loader = EllipticDatasetLoader()
        self.classification_evaluator = ModelEvaluator('fraud_detection', 'classification')
        self.anomaly_evaluator = ModelEvaluator('anomaly_detection', 'anomaly')
        
    def train_classification_models(self):
        """Sınıflandırma modellerini eğit"""
        # Veriyi yükle
        self.loader.load_data()
        X_train, X_test, y_train, y_test = self.loader.get_train_test_split()
        
        # Modelleri oluştur
        models = {
            'RandomForest': RandomForestClassifier(n_estimators=100, random_state=42),
            'RandomForest_Large': RandomForestClassifier(n_estimators=200, random_state=42)
        }
        
        # Modelleri eğit ve değerlendir
        results = {}
        for name, model in models.items():
            # Modeli eğit
            model.fit(X_train, y_train)
            
            # Tahminleri al
            y_pred = model.predict(X_test)
            
            # Modeli değerlendir
            metrics, cm = self.classification_evaluator.evaluate_classification(
                model, X_test, y_test, y_pred
            )
            
            results[name] = {
                'model': model,
                'metrics': metrics,
                'confusion_matrix': cm
            }
            
            # Modeli kaydet
            self._save_model(model, f'{name.lower()}_classifier.joblib')
        
        return results
    
    def train_anomaly_models(self):
        """Anomali tespit modellerini eğit"""
        # Veriyi yükle
        anomaly_data = self.loader.get_anomaly_data()
        
        # Modelleri oluştur
        models = {
            'IsolationForest': IsolationForest(contamination=0.1, random_state=42),
            'OneClassSVM': OneClassSVM(kernel='rbf', nu=0.1),
            'LocalOutlierFactor': LocalOutlierFactor(n_neighbors=20, contamination=0.1)
        }
        
        # Modelleri eğit ve değerlendir
        results = {}
        for name, model in models.items():
            # Modeli eğit
            predictions = model.fit_predict(anomaly_data)
            
            # Modeli değerlendir
            metrics = self.anomaly_evaluator.evaluate_anomaly(model, anomaly_data, predictions)
            
            results[name] = {
                'model': model,
                'metrics': metrics,
                'predictions': predictions
            }
            
            # Modeli kaydet
            self._save_model(model, f'{name.lower()}_anomaly.joblib')
        
        return results
    
    def run_ab_test(self, model_a, model_b, X_test, y_test):
        """A/B testi yap"""
        tester = ABTester('fraud_detection_ab_test')
        
        # Model A tahminleri
        y_pred_a = model_a.predict(X_test)
        tester.add_predictions('A', y_pred_a, y_test)
        
        # Model B tahminleri
        y_pred_b = model_b.predict(X_test)
        tester.add_predictions('B', y_pred_b, y_test)
        
        # İstatistiksel test
        test_results = tester.run_statistical_test()
        
        # Karşılaştırmayı görselleştir
        tester.visualize_comparison('ab_test_results.png')
        
        # Sonuçları kaydet
        tester.save_results('ab_test_results.json')
        
        return test_results
    
    def _save_model(self, model, filename):
        """Modeli kaydet"""
        model_dir = 'models'
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
        
        model_path = os.path.join(model_dir, filename)
        joblib.dump(model, model_path)
    
    def get_dataset_statistics(self):
        """Veri seti istatistiklerini al"""
        return self.loader.get_statistics()

# Kullanım örneği:
"""
# Model eğitici oluştur
trainer = ModelTrainer()

# Veri seti istatistiklerini görüntüle
stats = trainer.get_dataset_statistics()
print("Veri Seti İstatistikleri:")
for key, value in stats.items():
    print(f"{key}: {value}")

# Sınıflandırma modellerini eğit
classification_results = trainer.train_classification_models()
print("\nSınıflandırma Sonuçları:")
for name, result in classification_results.items():
    print(f"\n{name}:")
    print(f"Accuracy: {result['metrics']['accuracy']:.3f}")
    print(f"F1 Score: {result['metrics']['f1']:.3f}")

# Anomali tespit modellerini eğit
anomaly_results = trainer.train_anomaly_models()
print("\nAnomali Tespit Sonuçları:")
for name, result in anomaly_results.items():
    print(f"\n{name}:")
    print(f"Silhouette Score: {result['metrics']['silhouette_score']:.3f}")

# A/B testi yap
ab_test_results = trainer.run_ab_test(
    classification_results['RandomForest']['model'],
    classification_results['RandomForest_Large']['model'],
    X_test,
    y_test
)
print("\nA/B Test Sonuçları:")
print(f"P-value: {ab_test_results['p_value']:.3f}")
print(f"Significant: {ab_test_results['significant']}")
""" 