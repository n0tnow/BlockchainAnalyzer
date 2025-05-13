import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import os

class EllipticDatasetLoader:
    def __init__(self, data_dir='./elliptic_bitcoin_dataset'):
        self.data_dir = data_dir
        self.features = None
        self.edges = None
        self.classes = None
        self.scaler = StandardScaler()
        
    def _convert_df_types(self, df):
        """
        Convert pandas DataFrame types to standard Python types
        """
        # Convert string types in dataframe
        for col in df.columns:
            if df[col].dtype.name.startswith(('int', 'float')):
                df[col] = df[col].astype(float)
            elif df[col].dtype.name == 'bool':
                df[col] = df[col].astype(bool)
            elif df[col].dtype.name == 'object':
                # Convert object to string
                df[col] = df[col].astype(str)
        return df
        
    def load_data(self):
        """Veri setini yükle ve hazırla"""
        print(f"Veri seti yükleniyor: {self.data_dir}")
        
        # Dizin varlığını kontrol et
        if not os.path.exists(self.data_dir):
            error_msg = f"Veri seti dizini bulunamadı: {self.data_dir}"
            print(error_msg)
            raise FileNotFoundError(error_msg)
        
        # Dosya yollarını oluştur
        features_path = os.path.join(self.data_dir, 'elliptic_txs_features.csv')
        classes_path = os.path.join(self.data_dir, 'elliptic_txs_classes.csv')
        edges_path = os.path.join(self.data_dir, 'elliptic_txs_edgelist.csv')
        
        # Dosyaların varlığını kontrol et
        missing_files = []
        if not os.path.exists(features_path):
            missing_files.append(features_path)
        if not os.path.exists(classes_path):
            missing_files.append(classes_path)
        if not os.path.exists(edges_path):
            missing_files.append(edges_path)
            
        if missing_files:
            error_msg = f"Dosyalar bulunamadı: {', '.join(missing_files)}"
            print(error_msg)
            raise FileNotFoundError(error_msg)
        
        # CSV dosyalarını oku
        # İlk satırı okuyarak sütun başlıklarını kontrol et
        with open(features_path, 'r') as f:
            first_line = f.readline().strip()
            print(f"Features başlıkları: {first_line}")
        
        with open(classes_path, 'r') as f:
            first_line = f.readline().strip()
            print(f"Classes başlıkları: {first_line}")
        
        with open(edges_path, 'r') as f:
            first_line = f.readline().strip()
            print(f"Edges başlıkları: {first_line}")
        
        # Özellikleri yükle (ilk sütun txId, diğerleri özellikler)
        try:
            self.features = pd.read_csv(features_path)
            print(f"Features veri seti yüklendi: {self.features.shape}")
            print(f"İlk 3 sütun: {self.features.columns[:3].tolist()}")
        except Exception as e:
            print(f"Features yüklenirken hata: {e}")
            raise
        
        # Sınıf etiketlerini yükle
        try:
            self.classes = pd.read_csv(classes_path)
            print(f"Classes veri seti yüklendi: {self.classes.shape}")
            print(f"Sütunlar: {self.classes.columns.tolist()}")
        except Exception as e:
            print(f"Classes yüklenirken hata: {e}")
            raise
        
        # Kenar bilgilerini yükle
        try:
            self.edges = pd.read_csv(edges_path)
            print(f"Edges veri seti yüklendi: {self.edges.shape}")
            print(f"Sütunlar: {self.edges.columns.tolist()}")
        except Exception as e:
            print(f"Edges yüklenirken hata: {e}")
            raise
        
        # Verileri birleştir
        self._prepare_data()
        
        # Ensure proper type conversion before returning
        self.features = self._convert_df_types(self.features)
        self.edges = self._convert_df_types(self.edges)
        self.classes = self._convert_df_types(self.classes)
        
        return self.features, self.edges, self.classes
    
    def _prepare_data(self):
        """Verileri işle ve hazırla"""
        print("Veri hazırlanıyor...")
        
        # Sütun adlarını kontrol et
        txid_column = None
        class_column = None
        
        # txId sütununu bul (farklı yazılış biçimleri olabilir)
        for col in self.features.columns:
            if col.lower() == 'txid' or col.lower() == 'id' or col == '0':
                txid_column = col
                print(f"Bulunan txId sütunu: {txid_column}")
                break
        
        # class sütununu bul
        for col in self.classes.columns:
            if col.lower() == 'class' or col.lower() == 'label' or col == '1':
                class_column = col
                print(f"Bulunan class sütunu: {class_column}")
                break
        
        # İlk sütunu txId olarak adlandır (eğer sütun isimleri yoksa)
        if txid_column is None and self.features.shape[1] > 0:
            self.features = self.features.rename(columns={self.features.columns[0]: 'txId'})
            txid_column = 'txId'
            print("İlk sütun txId olarak yeniden adlandırıldı")
        
        # İkinci sütunu class olarak adlandır (eğer sütun isimleri yoksa)
        if class_column is None and self.classes.shape[1] > 1:
            self.classes = self.classes.rename(columns={self.classes.columns[1]: 'class'})
            class_column = 'class'
            print("İkinci sütun class olarak yeniden adlandırıldı")
        
        # txId ve class sütunlarını kontrol et
        if txid_column is None:
            raise ValueError("txId sütunu bulunamadı")
        if class_column is None:
            raise ValueError("class sütunu bulunamadı")
        
        # Sınıf etiketlerini düzenle (1: dolandırıcılık, 0: meşru)
        # Elliptic verisetinde 1=illicit, 2=licit, unknown=sınıflandırılmamış
        if self.classes[class_column].dtype == object:
            # Eğer string ise
            self.classes[class_column] = self.classes[class_column].map({'2': 0, '1': 1, 'unknown': -1})
        else:
            # Eğer sayısal ise
            self.classes[class_column] = self.classes[class_column].map({2: 0, 1: 1}).fillna(-1)
        
        print(f"Sınıf dağılımı: {self.classes[class_column].value_counts()}")
        
        # Özellikleri ve sınıfları birleştir
        txid_col = self.features[txid_column]
        class_col = self.classes[class_column]
        
        # İlk önce txId ve class sütunlarını içeren bir DataFrame oluştur
        id_class_df = pd.DataFrame({
            'txId': self.classes[txid_column] if txid_column in self.classes else self.classes.iloc[:, 0],
            'class': class_col
        })
        
        print(f"id_class_df oluşturuldu: {id_class_df.shape}")
        
        # features DataFrame'ini txId'ye göre birleştir
        self.features['txId'] = txid_col if isinstance(txid_col, pd.Series) else self.features.iloc[:, 0]
        self.features = pd.merge(
            self.features,
            id_class_df,
            on='txId',
            how='left'
        )
        
        print(f"Birleştirme sonrası features şekli: {self.features.shape}")
        
        # Eksik değerleri doldur
        self.features = self.features.fillna(-1)  # Bilinmeyen sınıflar için -1
        
        # Özellikleri ölçeklendir
        feature_cols = [col for col in self.features.columns if col not in ['txId', 'class']]
        self.features[feature_cols] = self.scaler.fit_transform(self.features[feature_cols])
    
    def get_train_test_split(self, test_size=0.2, random_state=42):
        """Eğitim ve test setlerini ayır"""
        # Sadece etiketlenmiş verileri kullan (class != -1)
        labeled_data = self.features[self.features['class'] != -1]
        
        X = labeled_data.drop(['txId', 'class'], axis=1)
        y = labeled_data['class']
        
        return train_test_split(X, y, test_size=test_size, random_state=random_state)
    
    def get_graph_data(self):
        """Graf verilerini hazırla"""
        # Düğüm özellikleri
        node_features = self.features.drop(['txId', 'class'], axis=1)
        node_labels = self.features['class']
        
        # Kenar listesi düzenle
        if 'txId1' in self.edges.columns and 'txId2' in self.edges.columns:
            edge_index = self.edges[['txId1', 'txId2']].values.T
        else:
            # İlk iki sütun muhtemelen txId1 ve txId2'dir
            edge_index = self.edges.iloc[:, :2].values.T
        
        return {
            'node_features': node_features,
            'node_labels': node_labels,
            'edge_index': edge_index
        }
    
    def get_anomaly_data(self):
        """Anomali tespiti için verileri hazırla"""
        # Sadece meşru işlemleri kullan (class == 0)
        normal_data = self.features[self.features['class'] == 0]
        
        X = normal_data.drop(['txId', 'class'], axis=1)
        
        return X
    
    def get_statistics(self):
        """Veri seti istatistiklerini hesapla"""
        if self.features is None:
            return {"error": "Veri seti henüz yüklenmemiş"}
        
        stats = {
            'total_transactions': len(self.features),
            'labeled_transactions': len(self.features[self.features['class'] != -1]),
            'unlabeled_transactions': len(self.features[self.features['class'] == -1]),
            'fraud_transactions': len(self.features[self.features['class'] == 1]),
            'legitimate_transactions': len(self.features[self.features['class'] == 0]),
            'total_edges': len(self.edges) if self.edges is not None else 0,
            'feature_count': len(self.features.columns) - 2  # txId ve class hariç
        }
        
        return stats