import numpy as np
import pandas as pd
from scipy import stats
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import json
import os

class ABTester:
    def __init__(self, experiment_name):
        self.experiment_name = experiment_name
        self.results = {
            'A': {'predictions': [], 'metrics': {}},
            'B': {'predictions': [], 'metrics': {}}
        }
        self.start_time = datetime.now()
    
    def add_predictions(self, model_name, predictions, y_true):
        """Model tahminlerini ekle"""
        if model_name not in ['A', 'B']:
            raise ValueError("Model adı 'A' veya 'B' olmalıdır")
        
        self.results[model_name]['predictions'] = predictions
        
        # Metrikleri hesapla
        metrics = {
            'accuracy': accuracy_score(y_true, predictions),
            'precision': precision_score(y_true, predictions, average='weighted'),
            'recall': recall_score(y_true, predictions, average='weighted'),
            'f1': f1_score(y_true, predictions, average='weighted')
        }
        
        self.results[model_name]['metrics'] = metrics
    
    def run_statistical_test(self, metric='f1'):
        """İstatistiksel test uygula"""
        if not all('metrics' in self.results[m] for m in ['A', 'B']):
            raise ValueError("Her iki model için de metrikler hesaplanmalıdır")
        
        # T-test uygula
        t_stat, p_value = stats.ttest_ind(
            self.results['A']['predictions'],
            self.results['B']['predictions']
        )
        
        return {
            't_statistic': t_stat,
            'p_value': p_value,
            'significant': p_value < 0.05
        }
    
    def visualize_comparison(self, save_path=None):
        """Model karşılaştırmasını görselleştir"""
        metrics = ['accuracy', 'precision', 'recall', 'f1']
        model_a_metrics = [self.results['A']['metrics'][m] for m in metrics]
        model_b_metrics = [self.results['B']['metrics'][m] for m in metrics]
        
        x = np.arange(len(metrics))
        width = 0.35
        
        fig, ax = plt.subplots(figsize=(10, 6))
        rects1 = ax.bar(x - width/2, model_a_metrics, width, label='Model A')
        rects2 = ax.bar(x + width/2, model_b_metrics, width, label='Model B')
        
        ax.set_ylabel('Score')
        ax.set_title('Model A vs Model B Performance Comparison')
        ax.set_xticks(x)
        ax.set_xticklabels(metrics)
        ax.legend()
        
        def autolabel(rects):
            for rect in rects:
                height = rect.get_height()
                ax.annotate(f'{height:.3f}',
                           xy=(rect.get_x() + rect.get_width()/2, height),
                           xytext=(0, 3),
                           textcoords="offset points",
                           ha='center', va='bottom')
        
        autolabel(rects1)
        autolabel(rects2)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path)
            plt.close()
        else:
            plt.show()
    
    def save_results(self, filepath):
        """Test sonuçlarını kaydet"""
        results = {
            'experiment_name': self.experiment_name,
            'start_time': self.start_time.isoformat(),
            'end_time': datetime.now().isoformat(),
            'results': self.results
        }
        
        with open(filepath, 'w') as f:
            json.dump(results, f, indent=4)
    
    @classmethod
    def load_results(cls, filepath):
        """Kaydedilmiş test sonuçlarını yükle"""
        with open(filepath, 'r') as f:
            results = json.load(f)
        
        tester = cls(results['experiment_name'])
        tester.results = results['results']
        tester.start_time = datetime.fromisoformat(results['start_time'])
        
        return tester

# Kullanım örneği:
"""
# A/B test oluştur
tester = ABTester('fraud_detection_ab_test')

# Model tahminlerini ekle
tester.add_predictions('A', model_a_predictions, y_true)
tester.add_predictions('B', model_b_predictions, y_true)

# İstatistiksel test uygula
test_results = tester.run_statistical_test()

# Karşılaştırmayı görselleştir
tester.visualize_comparison('ab_test_results.png')

# Sonuçları kaydet
tester.save_results('ab_test_results.json')

# Kaydedilmiş sonuçları yükle
loaded_tester = ABTester.load_results('ab_test_results.json')
""" 