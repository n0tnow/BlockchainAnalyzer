import json
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
from sklearn.neighbors import LocalOutlierFactor
from sklearn.svm import OneClassSVM

DATA_PATH = os.path.join(os.path.dirname(__file__), '../../data/raw_transactions.json')

class MLAnomalyDetector:
    def __init__(self, data_path=DATA_PATH):
        self.data_path = data_path
        self.df = self._load_data()
        self.features = None
        self.model = None
        self.scores = None

    def _load_data(self):
        with open(self.data_path, 'r', encoding='utf-8') as f:
            txs = json.load(f)
        return pd.DataFrame(txs)

    def extract_features(self):
        df = self.df
        df = df[df['isError'] == '0']
        df['value_eth'] = df['value'].astype(float) / 1e18
        df['time'] = pd.to_datetime(df['timeStamp'], unit='s')
        df = df.sort_values(['from', 'time'])
        # Günlük işlem sayısı
        df['date'] = df['time'].dt.date
        # Adres bazında öznitelikler
        grouped = df.groupby('from').agg(
            tx_count=('hash', 'count'),
            total_sent=('value_eth', 'sum'),
            avg_sent=('value_eth', 'mean'),
            max_sent=('value_eth', 'max'),
            min_sent=('value_eth', 'min'),
            median_sent=('value_eth', 'median'),
            std_sent=('value_eth', 'std'),
            unique_receivers=('to', 'nunique'),
            first_tx=('time', 'min'),
            last_tx=('time', 'max'),
            unique_days=('date', 'nunique')
        ).reset_index()
        # Aktif olduğu gün sayısı
        grouped['active_days'] = (grouped['last_tx'] - grouped['first_tx']).dt.days + 1
        grouped['tx_per_day'] = grouped['tx_count'] / grouped['active_days'].replace(0, 1)
        # İlk ve son transfer arası gün farkı
        grouped['first_last_diff'] = (grouped['last_tx'] - grouped['first_tx']).dt.days
        # Burstiness: bir günde yapılan en fazla işlem
        burst = df.groupby(['from', 'date']).size().groupby('from').max().rename('burstiness')
        grouped = grouped.merge(burst, on='from', how='left')
        # İşlemler arası en uzun bekleme süresi (saat cinsinden)
        def max_gap(times):
            if len(times) < 2:
                return 0
            gaps = np.diff(np.sort(times.values.astype(np.int64) // 10**9))
            return np.max(gaps) / 3600  # saate çevir
        grouped['max_gap'] = df.groupby('from')['time'].apply(max_gap).values
        self.features = grouped.fillna(0)
        return self.features

    def fit_isolation_forest(self):
        feats = self.extract_features()
        X = feats[[
            'tx_count', 'total_sent', 'avg_sent', 'max_sent', 'min_sent', 'median_sent', 'std_sent',
            'unique_receivers', 'tx_per_day', 'active_days', 'first_last_diff', 'unique_days', 'burstiness', 'max_gap'
        ]].values
        model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
        model.fit(X)
        scores = model.decision_function(X)
        feats['anomaly_score'] = -scores  # Yüksek skor = daha anormal
        feats['is_anomaly'] = model.predict(X) == -1
        self.model = model
        self.scores = feats
        return feats[['from', 'anomaly_score', 'is_anomaly', 'tx_count', 'total_sent', 'avg_sent', 'max_sent', 'min_sent', 'median_sent', 'std_sent', 'unique_receivers', 'tx_per_day', 'active_days', 'first_last_diff', 'unique_days', 'burstiness', 'max_gap']]

    def fit_dbscan(self):
        feats = self.extract_features()
        X = feats[[
            'tx_count', 'total_sent', 'avg_sent', 'max_sent', 'min_sent', 'median_sent', 'std_sent',
            'unique_receivers', 'tx_per_day', 'active_days', 'first_last_diff', 'unique_days', 'burstiness', 'max_gap'
        ]].values
        model = DBSCAN(eps=2.5, min_samples=5)
        labels = model.fit_predict(X)
        feats['is_anomaly'] = labels == -1
        feats['anomaly_score'] = np.where(feats['is_anomaly'], 1, 0)
        return feats[feats['is_anomaly']][['from', 'anomaly_score', 'is_anomaly', 'tx_count', 'total_sent', 'avg_sent', 'max_sent', 'min_sent', 'median_sent', 'std_sent', 'unique_receivers', 'tx_per_day', 'active_days', 'first_last_diff', 'unique_days', 'burstiness', 'max_gap']]

    def fit_lof(self):
        feats = self.extract_features()
        X = feats[[
            'tx_count', 'total_sent', 'avg_sent', 'max_sent', 'min_sent', 'median_sent', 'std_sent',
            'unique_receivers', 'tx_per_day', 'active_days', 'first_last_diff', 'unique_days', 'burstiness', 'max_gap'
        ]].values
        model = LocalOutlierFactor(n_neighbors=20, contamination=0.05)
        y_pred = model.fit_predict(X)
        scores = -model.negative_outlier_factor_
        feats['anomaly_score'] = scores
        feats['is_anomaly'] = y_pred == -1
        return feats[feats['is_anomaly']][['from', 'anomaly_score', 'is_anomaly', 'tx_count', 'total_sent', 'avg_sent', 'max_sent', 'min_sent', 'median_sent', 'std_sent', 'unique_receivers', 'tx_per_day', 'active_days', 'first_last_diff', 'unique_days', 'burstiness', 'max_gap']]

    def fit_oneclass_svm(self):
        feats = self.extract_features()
        X = feats[[
            'tx_count', 'total_sent', 'avg_sent', 'max_sent', 'min_sent', 'median_sent', 'std_sent',
            'unique_receivers', 'tx_per_day', 'active_days', 'first_last_diff', 'unique_days', 'burstiness', 'max_gap'
        ]].values
        model = OneClassSVM(nu=0.05, kernel='rbf', gamma='scale')
        y_pred = model.fit_predict(X)
        feats['anomaly_score'] = -model.decision_function(X)
        feats['is_anomaly'] = y_pred == -1
        return feats[feats['is_anomaly']][['from', 'anomaly_score', 'is_anomaly', 'tx_count', 'total_sent', 'avg_sent', 'max_sent', 'min_sent', 'median_sent', 'std_sent', 'unique_receivers', 'tx_per_day', 'active_days', 'first_last_diff', 'unique_days', 'burstiness', 'max_gap']]

    def get_anomalies_by_method(self, algo='isoforest', n=10):
        if algo == 'isoforest':
            df = self.fit_isolation_forest()
        elif algo == 'dbscan':
            df = self.fit_dbscan()
        elif algo == 'lof':
            df = self.fit_lof()
        elif algo == 'ocsvm':
            df = self.fit_oneclass_svm()
        else:
            raise ValueError(f'Bilinmeyen algoritma: {algo}')
        
        # Convert to records and ensure all values are Python native types
        records = df.sort_values('anomaly_score', ascending=False).head(n).to_dict(orient='records')
        
        # Explicitly convert numpy types to Python types
        for record in records:
            for key, value in record.items():
                if isinstance(value, (np.integer, np.int64)):
                    record[key] = int(value)
                elif isinstance(value, (np.floating, np.float64)):
                    record[key] = float(value)
                elif isinstance(value, np.bool_):
                    record[key] = bool(value)
                    
        return records
    
    def get_feature_distributions(self, algo='isoforest'):
        """
        Anomali ve normal veri noktalarının öznitelik dağılımlarını döndürür
        
        Parameters:
        -----------
        algo : str
            Kullanılacak anomali tespit algoritması
            
        Returns:
        --------
        dict
            Özniteliklerin anomali ve normal dağılımlarını içeren sözlük
        """
        # Önce özellikleri çıkar
        feats = self.extract_features()
        
        # Algoritma ile anomalileri tespit et
        anom_df = self.get_anomalies_by_method(algo=algo, n=1000)  # Tüm anomalileri al
        anom_addrs = set([row['from'] for row in anom_df])
        feats['is_anomaly'] = feats['from'].apply(lambda x: x in anom_addrs)
        
        # Önemli öznitelikleri seçelim
        features = ['burstiness', 'tx_per_day', 'total_sent', 'avg_sent', 'max_sent']
        result = {}
        
        for feat in features:
            # Convert numpy arrays to standard Python lists
            anomaly_values = [float(x) for x in feats[feats['is_anomaly']][feat].tolist()]
            normal_values = [float(x) for x in feats[~feats['is_anomaly']][feat].tolist()]
            
            result[feat] = {
                'anomaly': anomaly_values,
                'normal': normal_values
            }
            
        return result
    
    def extract_features_for_address(self, address, df):
        """
        Tek bir adres için işlem verilerinden özellik vektörü çıkarır
        
        Parameters:
        -----------
        address : str
            Ethereum adresi
        df : pandas.DataFrame
            İşlem verileri DataFrame'i
        
        Returns:
        --------
        list
            Özellik vektörü (standard Python tiplerinde)
        """
        try:
            # Sadece bu adresin gönderdiği işlemleri filtrele
            df = df[df['from'].str.lower() == address.lower()]
            
            # Gerekli dönüşümleri yap
            df['value_eth'] = df['value'].astype(float) / 1e18
            df['time'] = pd.to_datetime(df['timeStamp'], unit='s')
            df = df.sort_values('time')
            
            # Günlük işlem sayısı
            df['date'] = df['time'].dt.date
            
            # Özellikleri hesapla
            tx_count = len(df)
            
            if tx_count == 0:
                # Eğer işlem yoksa, varsayılan değerler döndür
                return [0, 0, 0, 0, 0, 0]
            
            total_sent = float(df['value_eth'].sum())
            avg_sent = float(df['value_eth'].mean())
            max_sent = float(df['value_eth'].max())
            unique_receivers = int(df['to'].nunique())
            
            # Günlük işlem sayısı
            first_day = df['time'].min()
            last_day = df['time'].max()
            days_active = (last_day - first_day).days + 1
            tx_per_day = float(tx_count / max(1, days_active))
            
            # Sonuç: Özellik vektörü (numpy array yerine Python liste)
            return [tx_count, total_sent, avg_sent, max_sent, unique_receivers, tx_per_day]
            
        except Exception as e:
            print(f"Adres özellik çıkarımı hatası: {e}")
            return [0, 0, 0, 0, 0, 0]