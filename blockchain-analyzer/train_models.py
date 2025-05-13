import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import json
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_curve, auc
from sklearn.model_selection import learning_curve, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from app.services.model_trainer import ModelTrainer
from app.services.dataset_loader import EllipticDatasetLoader
import time
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

# NumPy dizisini JSON serileştirilebilir hale getiren yardımcı fonksiyon
def convert_numpy_types(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(i) for i in obj]
    else:
        return obj

def train_with_progress(model, X, y, n_trees=100, verbose=True):
    """Ağaç sayısını kademeli olarak artırarak RandomForest modelini eğitir"""
    if not isinstance(model, RandomForestClassifier):
        # RandomForest değilse normal eğit
        start_time = time.time()
        model.fit(X, y)
        end_time = time.time()
        return model, end_time - start_time
    
    # Ağaç sayısını kademeli olarak artırarak RandomForest eğit
    step_size = max(1, n_trees // 10)  # 10 adımda eğitmek için
    progress_data = []
    
    # Orijinal ağaç sayısını kaydet
    original_n_estimators = model.n_estimators
    start_time = time.time()
    
    for n_estimators in tqdm(range(step_size, n_trees + 1, step_size), 
                           desc="Ağaçlar eğitiliyor", disable=not verbose):
        # Ağaç sayısını güncelle
        model.n_estimators = n_estimators
        model.fit(X, y)
        
        # Performansı ölç
        train_pred = model.predict(X)
        train_acc = accuracy_score(y, train_pred)
        
        # Çapraz doğrulama skoru
        cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy', n_jobs=-1)
        cv_acc = np.mean(cv_scores)
        
        progress_data.append({
            'n_estimators': n_estimators,
            'train_accuracy': train_acc,
            'cv_accuracy': cv_acc
        })
        
        if verbose:
            print(f"Ağaç sayısı: {n_estimators}/{n_trees}, "
                  f"Eğitim doğruluğu: {train_acc:.4f}, "
                  f"CV doğruluğu: {cv_acc:.4f}")
    
    end_time = time.time()
    
    # Ağaç sayısını orijinal değere geri yükle
    model.n_estimators = original_n_estimators
    
    # Eğitim ilerlemesini görselleştir
    if verbose and progress_data:
        plt.figure(figsize=(10, 6))
        df = pd.DataFrame(progress_data)
        plt.plot(df['n_estimators'], df['train_accuracy'], 'b-', label='Eğitim Doğruluğu')
        plt.plot(df['n_estimators'], df['cv_accuracy'], 'r-', label='CV Doğruluğu')
        plt.xlabel('Ağaç Sayısı')
        plt.ylabel('Doğruluk')
        plt.title('RandomForest Eğitim İlerlemesi')
        plt.grid(True)
        plt.legend()
        plt.savefig('rf_training_progress.png')
        plt.close()
        print("Eğitim ilerlemesi grafiği 'rf_training_progress.png' dosyasına kaydedildi.")
    
    return model, end_time - start_time, progress_data

def main():
    # Veri setinin bulunduğu dizin
    data_dir = './elliptic_bitcoin_dataset'
    
    # Eğer veri seti dizini yoksa, kullanıcıyı bilgilendir
    if not os.path.exists(data_dir):
        print(f"HATA: {data_dir} dizini bulunamadı. Lütfen veri setini indirip bu dizine yerleştirin.")
        print("Veri seti: https://www.kaggle.com/ellipticco/elliptic-data-set")
        return
    
    print("Elliptic veri seti yükleniyor...")
    
    try:
        # Veri yükleyici oluştur
        loader = EllipticDatasetLoader(data_dir=data_dir)
        
        # Veri setini yükle
        features, edges, classes = loader.load_data()
        
        # Veri seti istatistiklerini görüntüle
        stats = loader.get_statistics()
        print("\nVeri Seti İstatistikleri:")
        for key, value in stats.items():
            print(f"{key}: {value}")
        
        # Eğitim ve test setlerini al
        X_train, X_test, y_train, y_test = loader.get_train_test_split(test_size=0.3)
        
        print(f"\nEğitim seti boyutu: {X_train.shape}")
        print(f"Test seti boyutu: {X_test.shape}")
        
        # Model eğitici oluştur
        trainer = ModelTrainer()
        trainer.loader = loader  # Önceden yüklediğimiz veri yükleyiciyi kullan
        
        # Özel model eğitimi (ilerleme göstergesi ile)
        print("\nDetaylı eğitim ilerleme göstergesiyle modeller eğitiliyor...")
        
        # Modelleri tanımla
        models = {
            'RandomForest': RandomForestClassifier(n_estimators=100, random_state=42),
            'RandomForest_Large': RandomForestClassifier(n_estimators=200, random_state=42)
        }
        
        # Her modeli eğit ve sonuçları kaydet
        classification_results = {}
        training_progress = {}
        
        for name, model in models.items():
            print(f"\n{name} modeli eğitiliyor...")
            if isinstance(model, RandomForestClassifier):
                model, train_time, progress = train_with_progress(model, X_train, y_train, 
                                                   n_trees=model.n_estimators, verbose=True)
                training_progress[name] = progress
                print(f"{name} eğitim süresi: {train_time:.2f} saniye")
            else:
                start_time = time.time()
                model.fit(X_train, y_train)
                train_time = time.time() - start_time
                print(f"{name} eğitim süresi: {train_time:.2f} saniye")
            
            # Test setinde değerlendir
            y_pred = model.predict(X_test)
            test_accuracy = accuracy_score(y_test, y_pred)
            test_precision = precision_score(y_test, y_pred, average='weighted')
            test_recall = recall_score(y_test, y_pred, average='weighted')
            test_f1 = f1_score(y_test, y_pred, average='weighted')
            
            # Eğitim setinde değerlendir
            y_train_pred = model.predict(X_train)
            train_accuracy = accuracy_score(y_train, y_train_pred)
            train_precision = precision_score(y_train, y_train_pred, average='weighted')
            train_recall = recall_score(y_train, y_train_pred, average='weighted')
            train_f1 = f1_score(y_train, y_train_pred, average='weighted')
            
            # Confusion Matrix
            from sklearn.metrics import confusion_matrix
            cm = confusion_matrix(y_test, y_pred)
            
            # Sonuçları kaydet
            classification_results[name] = {
                'model': model,
                'metrics': {
                    'accuracy': test_accuracy,
                    'precision': test_precision,
                    'recall': test_recall,
                    'f1': test_f1,
                    'train_accuracy': train_accuracy,
                    'train_precision': train_precision,
                    'train_recall': train_recall,
                    'train_f1': train_f1,
                    'training_time': train_time
                },
                'confusion_matrix': cm.tolist()  # NumPy dizisini liste olarak kaydet
            }
            
            # Performans sonuçlarını görüntüle
            print(f"\n{name} Performans Metrikleri:")
            print("Metrik           | Eğitim Seti     | Test Seti       | Fark")
            print("-" * 60)
            print(f"Accuracy         | {train_accuracy:.4f}      | {test_accuracy:.4f}      | {train_accuracy-test_accuracy:.4f}")
            print(f"Precision        | {train_precision:.4f}      | {test_precision:.4f}      | {train_precision-test_precision:.4f}")
            print(f"Recall           | {train_recall:.4f}      | {test_recall:.4f}      | {train_recall-test_recall:.4f}")
            print(f"F1 Score         | {train_f1:.4f}      | {test_f1:.4f}      | {train_f1-test_f1:.4f}")
            
            # Overfitting analizi
            if train_accuracy - test_accuracy > 0.05:
                print("\nUYARI: Modelde overfitting olabilir! Eğitim ve test doğruluk oranları arasında önemli fark var.")
            elif train_accuracy < 0.8 and test_accuracy < 0.8:
                print("\nUYARI: Modelde underfitting olabilir! Hem eğitim hem de test doğruluk oranları düşük.")
            else:
                print("\nModel iyi dengelenmiş görünüyor.")
            
            # Confusion matrix görselleştir
            try:
                plt.figure(figsize=(8, 6))
                sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', cbar=True)
                plt.title(f'{name} Confusion Matrix')
                labels = ['Legal', 'Illegal']
                tick_marks = np.arange(len(labels))
                plt.xticks(tick_marks, labels)
                plt.yticks(tick_marks, labels)
                plt.ylabel('Gerçek Sınıf')
                plt.xlabel('Tahmin Edilen Sınıf')
                plt.tight_layout()
                plt.savefig(f'confusion_matrix_{name.lower()}.png')
                plt.close()
                print(f"Confusion matrix '{name}' için kaydedildi.")
            except Exception as e:
                print(f"Confusion matrix oluşturulurken hata: {e}")
            
            # Öğrenme eğrisi (Learning curve)
            try:
                train_sizes, train_scores, test_scores = learning_curve(
                    model, X_train, y_train, cv=5, 
                    train_sizes=np.linspace(0.1, 1.0, 10),  # 10 noktayı ölç
                    scoring='f1_weighted', n_jobs=-1)
                
                train_scores_mean = np.mean(train_scores, axis=1)
                train_scores_std = np.std(train_scores, axis=1)
                test_scores_mean = np.mean(test_scores, axis=1)
                test_scores_std = np.std(test_scores, axis=1)
                
                plt.figure(figsize=(10, 6))
                plt.title(f"{name} - Öğrenme Eğrisi")
                plt.xlabel("Eğitim Örnekleri Sayısı")
                plt.ylabel("F1 Skoru")
                plt.grid()
                
                plt.fill_between(train_sizes, train_scores_mean - train_scores_std,
                                train_scores_mean + train_scores_std, alpha=0.1, color="r")
                plt.fill_between(train_sizes, test_scores_mean - test_scores_std,
                                test_scores_mean + test_scores_std, alpha=0.1, color="g")
                plt.plot(train_sizes, train_scores_mean, 'o-', color="r", label="Eğitim skoru")
                plt.plot(train_sizes, test_scores_mean, 'o-', color="g", label="Çapraz doğrulama skoru")
                
                plt.legend(loc="best")
                plt.savefig(f'learning_curve_{name.lower()}.png')
                plt.close()
                print(f"Öğrenme eğrisi '{name}' için kaydedildi.")
            except Exception as e:
                print(f"Öğrenme eğrisi oluşturulurken hata: {e}")
        
        # Tüm modellerin karşılaştırma tablosunu oluştur
        comparison_data = []
        for name, result in classification_results.items():
            comparison_data.append({
                'Model': name,
                'Train Accuracy': result['metrics']['train_accuracy'],
                'Test Accuracy': result['metrics']['accuracy'],
                'Train F1': result['metrics']['train_f1'],
                'Test F1': result['metrics']['f1'],
                'Training Time (s)': result['metrics']['training_time']
            })
        
        if comparison_data:
            comparison_df = pd.DataFrame(comparison_data)
            print("\nModel Karşılaştırma Tablosu:")
            print(comparison_df.to_string(index=False))
            comparison_df.to_csv('model_comparison.csv', index=False)
            print("Model karşılaştırma tablosu 'model_comparison.csv' dosyasına kaydedildi.")
        
        # Eğitim ilerlemesi grafiğini karşılaştırmalı olarak çiz
        if training_progress:
            plt.figure(figsize=(12, 6))
            for name, progress in training_progress.items():
                if progress:
                    df = pd.DataFrame(progress)
                    plt.plot(df['n_estimators'], df['train_accuracy'], '-', label=f'{name} - Eğitim')
                    plt.plot(df['n_estimators'], df['cv_accuracy'], '--', label=f'{name} - CV')
            
            plt.xlabel('Ağaç Sayısı')
            plt.ylabel('Doğruluk')
            plt.title('RandomForest Modelleri Eğitim İlerlemesi')
            plt.grid(True)
            plt.legend()
            plt.savefig('combined_training_progress.png')
            plt.close()
            print("Karşılaştırmalı eğitim ilerlemesi grafiği 'combined_training_progress.png' dosyasına kaydedildi.")
        
        # Anomali tespiti için modeller eğit
        print("\nAnomali tespit modelleri eğitiliyor...")
        anomaly_results = trainer.train_anomaly_models()
        
        print("\nAnomali Tespit Sonuçları:")
        for name, result in anomaly_results.items():
            print(f"\n{name}:")
            if 'silhouette_score' in result['metrics']:
                print(f"Silhouette Score: {result['metrics']['silhouette_score']:.3f}")
            if 'calinski_harabasz_score' in result['metrics']:
                print(f"Calinski Harabasz Score: {result['metrics']['calinski_harabasz_score']:.3f}")
            if 'anomaly_ratio' in result['metrics']:
                print(f"Anomaly Ratio: {result['metrics']['anomaly_ratio']:.3f}")
        
        # En iyi modeli bul ve tahmin için kullan
        best_model_name = max(classification_results.items(), 
                             key=lambda x: x[1]['metrics']['f1'])[0]
        best_model = classification_results[best_model_name]['model']
        print(f"\nEn iyi model: {best_model_name}")
        
        # Bilinmeyen etiketli örnekler için tahmin
        unknown_data = features[features['class'] == -1]
        if not unknown_data.empty:
            print(f"\nBilinmeyen {len(unknown_data)} işlem için tahmin yapılıyor...")
            X_unknown = unknown_data.drop(['txId', 'class'], axis=1)
            predictions = best_model.predict(X_unknown)
            
            # Sonuçları analiz et
            illegal_count = np.sum(predictions == 1)
            legal_count = np.sum(predictions == 0)
            illegal_percent = illegal_count / len(predictions) * 100
            legal_percent = legal_count / len(predictions) * 100
            
            print(f"İllegal tahmin edilen işlemler: {illegal_count} ({illegal_percent:.2f}%)")
            print(f"Legal tahmin edilen işlemler: {legal_count} ({legal_percent:.2f}%)")
            
            # Tahminleri CSV olarak kaydet
            predictions_df = pd.DataFrame({
                'txId': unknown_data['txId'].values,
                'predicted_class': predictions
            })
            predictions_df.to_csv('unknown_predictions.csv', index=False)
            print("Tahminler 'unknown_predictions.csv' dosyasına kaydedildi.")
        
        # A/B testini ekleyelim (eğer iki farklı model varsa)
        if len(classification_results) >= 2:
            print("\nA/B test yapılıyor...")
            try:
                # İlk iki modeli seç
                model_names = list(classification_results.keys())
                model_a = classification_results[model_names[0]]['model']
                model_b = classification_results[model_names[1]]['model']
                
                # A/B test için tester oluştur
                from app.services.ab_testing import ABTester
                tester = ABTester('fraud_detection_ab_test')
                
                # Modellerin tahminlerini al
                y_pred_a = model_a.predict(X_test)
                y_pred_a_list = y_pred_a.tolist()  # NumPy dizisini listeye dönüştür
                tester.add_predictions('A', y_pred_a_list, y_test.tolist())
                
                y_pred_b = model_b.predict(X_test)
                y_pred_b_list = y_pred_b.tolist()  # NumPy dizisini listeye dönüştür
                tester.add_predictions('B', y_pred_b_list, y_test.tolist())
                
                # İstatistiksel testi uygula
                test_results = tester.run_statistical_test()
                # NumPy değerlerini Python değerlerine dönüştür
                test_results = convert_numpy_types(test_results)
                
                print("\nA/B Test Sonuçları:")
                print(f"T-statistic: {test_results['t_statistic']}")
                print(f"P-value: {test_results['p_value']}")
                print(f"Significant: {test_results['significant']}")
                
                # Karşılaştırmayı görselleştir
                tester.visualize_comparison('ab_test_results.png')
                
                # Sonuçları kaydet
                tester.save_results('ab_test_results.json')
            except Exception as e:
                print(f"A/B test sırasında hata: {e}")
                import traceback
                traceback.print_exc()
        
        # Sonuçları JSON olarak kaydet - NumPy dizileri için dönüştürme yapılıyor
        results = {
            'dataset_statistics': stats,
            'classification_results': {
                name: {
                    'metrics': result['metrics'],
                    'confusion_matrix': result['confusion_matrix']
                }
                for name, result in classification_results.items()
            },
            'anomaly_results': {
                name: {
                    'metrics': convert_numpy_types(result['metrics'])
                }
                for name, result in anomaly_results.items()
            }
        }
        
        # JSON'a dönüştürmeden önce NumPy tiplerini dönüştür
        results = convert_numpy_types(results)
        
        with open('training_results.json', 'w') as f:
            json.dump(results, f, indent=4)
        
        print("\nEğitim tamamlandı! Sonuçlar 'training_results.json' dosyasında kaydedildi.")
    
    except Exception as e:
        print(f"Bir hata oluştu: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()