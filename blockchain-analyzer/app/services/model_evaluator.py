import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    silhouette_score, calinski_harabasz_score
)
from sklearn.model_selection import cross_val_score, train_test_split
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import json
import os

class ModelEvaluator:
    def __init__(self, model_name, model_type):
        self.model_name = model_name
        self.model_type = model_type  # 'classification' or 'anomaly'
        self.metrics_history = []
        self.best_model = None
        self.best_score = float('-inf')
        
    def evaluate_classification(self, model, X_test, y_test, y_pred):
        """Sınıflandırma modelleri için performans metriklerini hesapla"""
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, average='weighted'),
            'recall': recall_score(y_test, y_pred, average='weighted'),
            'f1': f1_score(y_test, y_pred, average='weighted'),
            'roc_auc': roc_auc_score(y_test, y_pred) if len(np.unique(y_test)) == 2 else None
        }
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        
        # Metrikleri kaydet
        self._save_metrics(metrics, cm)
        
        return metrics, cm
    
    def evaluate_anomaly(self, model, X, predictions):
        """Anomali tespit modelleri için performans metriklerini hesapla"""
        metrics = {
            'silhouette_score': silhouette_score(X, predictions),
            'calinski_harabasz_score': calinski_harabasz_score(X, predictions),
            'anomaly_ratio': np.mean(predictions == -1)
        }
        
        # Metrikleri kaydet
        self._save_metrics(metrics)
        
        return metrics
    
    def cross_validate(self, model, X, y, cv=5):
        """Cross-validation ile model performansını değerlendir"""
        if self.model_type == 'classification':
            scores = cross_val_score(model, X, y, cv=cv, scoring='f1_weighted')
        else:
            scores = cross_val_score(model, X, y, cv=cv, scoring='silhouette')
        
        return {
            'mean_score': np.mean(scores),
            'std_score': np.std(scores),
            'scores': scores.tolist()
        }
    
    def compare_models(self, models, X, y):
        """Farklı modellerin performansını karşılaştır"""
        results = {}
        for name, model in models.items():
            if self.model_type == 'classification':
                y_pred = model.predict(X)
                metrics = self.evaluate_classification(model, X, y, y_pred)[0]
            else:
                predictions = model.fit_predict(X)
                metrics = self.evaluate_anomaly(model, X, predictions)
            
            results[name] = metrics
        
        return results
    
    def visualize_performance(self, save_path=None):
        """Performans metriklerini görselleştir"""
        if not self.metrics_history:
            return None
        
        # Metrik geçmişini DataFrame'e çevir
        df = pd.DataFrame(self.metrics_history)
        
        # Zaman serisi grafikleri
        plt.figure(figsize=(15, 10))
        
        if self.model_type == 'classification':
            metrics = ['accuracy', 'precision', 'recall', 'f1']
        else:
            metrics = ['silhouette_score', 'calinski_harabasz_score', 'anomaly_ratio']
        
        for i, metric in enumerate(metrics, 1):
            plt.subplot(2, 2, i)
            plt.plot(df['timestamp'], df[metric], marker='o')
            plt.title(f'{metric.capitalize()} Over Time')
            plt.xticks(rotation=45)
            plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path)
            plt.close()
        else:
            plt.show()
    
    def _save_metrics(self, metrics, confusion_matrix=None):
        """Metrikleri geçmişe kaydet"""
        metrics['timestamp'] = datetime.now().isoformat()
        metrics['model_name'] = self.model_name
        
        if confusion_matrix is not None:
            metrics['confusion_matrix'] = confusion_matrix.tolist()
        
        self.metrics_history.append(metrics)
        
        # En iyi modeli güncelle
        if self.model_type == 'classification':
            current_score = metrics['f1']
        else:
            current_score = metrics['silhouette_score']
        
        if current_score > self.best_score:
            self.best_score = current_score
            self.best_model = metrics
    
    def save_evaluation_results(self, filepath):
        """Değerlendirme sonuçlarını JSON olarak kaydet"""
        results = {
            'model_name': self.model_name,
            'model_type': self.model_type,
            'best_score': self.best_score,
            'best_model': self.best_model,
            'metrics_history': self.metrics_history
        }
        
        with open(filepath, 'w') as f:
            json.dump(results, f, indent=4)
    
    @classmethod
    def load_evaluation_results(cls, filepath):
        """Kaydedilmiş değerlendirme sonuçlarını yükle"""
        with open(filepath, 'r') as f:
            results = json.load(f)
        
        evaluator = cls(results['model_name'], results['model_type'])
        evaluator.best_score = results['best_score']
        evaluator.best_model = results['best_model']
        evaluator.metrics_history = results['metrics_history']
        
        return evaluator

# Kullanım örneği:
"""
# Sınıflandırma modeli için
evaluator = ModelEvaluator('RandomForest', 'classification')
metrics, cm = evaluator.evaluate_classification(model, X_test, y_test, y_pred)
evaluator.visualize_performance('performance_plots.png')

# Anomali tespiti için
evaluator = ModelEvaluator('IsolationForest', 'anomaly')
metrics = evaluator.evaluate_anomaly(model, X, predictions)
evaluator.visualize_performance('anomaly_performance.png')

# Model karşılaştırma
models = {
    'RandomForest': rf_model,
    'SVM': svm_model,
    'XGBoost': xgb_model
}
comparison_results = evaluator.compare_models(models, X, y)

# Sonuçları kaydet
evaluator.save_evaluation_results('model_evaluation.json')
""" 