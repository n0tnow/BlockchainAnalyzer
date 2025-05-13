import json
import networkx as nx
from collections import defaultdict
import numpy as np
from datetime import datetime

def load_graph_from_json(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        transactions = json.load(f)

    G = nx.DiGraph()
    for tx in transactions:
        sender = tx["from"]
        receiver = tx["to"]
        value = int(tx["value"]) / 1e18
        timestamp = int(tx["timeStamp"])
        if sender and receiver:
            G.add_edge(sender, receiver, 
                      weight=value,
                      timestamp=timestamp,
                      hash=tx["hash"])
    return G

def create_graph_from_transactions(transactions, max_nodes=50):
    """
    Etherscan API'den alınan işlemlerden işlem ağı oluştur.
    
    Args:
        transactions: Etherscan API'den alınan işlemler listesi
        max_nodes: Ağdaki maksimum düğüm sayısı (kısıtlamak için)
        
    Returns:
        nx.DiGraph: İşlem ağını temsil eden yönlü graf
    """
    G = nx.DiGraph()
    
    # İşlemleri ağırlıklarına göre sırala
    sorted_txs = sorted(transactions, key=lambda tx: int(tx.get("value", 0)), reverse=True)
    
    # Adresleri ve bağlantıları takip et
    nodes = set()
    
    for tx in sorted_txs:
        sender = tx.get("from")
        receiver = tx.get("to")
        value = int(tx.get("value", 0)) / 1e18
        timestamp = int(tx.get("timeStamp", 0))
        
        if not sender or not receiver:
            continue
            
        # Düğümleri ekle
        if sender not in nodes:
            nodes.add(sender)
            G.add_node(sender, type="sender")
            
        if receiver not in nodes:
            nodes.add(receiver)
            G.add_node(receiver, type="receiver")
            
        # Kenarı ekle
        G.add_edge(sender, receiver, 
                  weight=value,
                  timestamp=timestamp,
                  hash=tx.get("hash", ""))
                  
        # Maksimum düğüm sayısı kontrolü
        if len(nodes) >= max_nodes:
            break
    
    return G

def create_graph_from_elliptic(loader, max_nodes=200):
    """
    Elliptic dataset'inden işlem ağı oluştur.
    
    Args:
        loader: EllipticDatasetLoader örneği
        max_nodes: Maksimum düğüm sayısı
        
    Returns:
        nx.DiGraph: İşlem ağını temsil eden yönlü graf
    """
    G = nx.DiGraph()
    
    # Veri setini yükle
    if not hasattr(loader, 'features') or loader.features is None:
        loader.load_data()
    
    # Düğümleri ve özellikleri ekle
    for idx, row in loader.features.iterrows():
        if idx >= max_nodes:
            break
            
        txid = row['txId']
        
        # Sınıf bilgisi
        class_val = row.get('class', -1)
        is_illicit = class_val == 1
        is_licit = class_val == 0
        is_unknown = class_val == -1
        
        # Düğüm ekle
        G.add_node(txid, 
                  class_value=int(class_val),
                  is_illicit=bool(is_illicit),
                  is_licit=bool(is_licit),
                  is_unknown=bool(is_unknown),
                  type="transaction")
    
    # Kenarları ekle
    for idx, row in loader.edges.iterrows():
        if idx >= max_nodes * 3:  # Kenar sayısını sınırla
            break
            
        # Kenar sütun adlarını belirle
        if 'txId1' in loader.edges.columns and 'txId2' in loader.edges.columns:
            source = row['txId1']
            target = row['txId2']
        else:
            # İlk iki sütun muhtemelen txId1 ve txId2'dir
            source = row.iloc[0]
            target = row.iloc[1]
        
        # Her iki düğüm de grafikte var mı kontrol et
        if source in G.nodes() and target in G.nodes():
            # Kenar ekle (Elliptic verisinde ağırlık yok, 1.0 olarak ayarla)
            G.add_edge(source, target, weight=1.0, timestamp=0)
    
    return G

def basic_graph_stats(G):
    # Temel metrikler
    stats = {
        "node_count": G.number_of_nodes(),
        "edge_count": G.number_of_edges(),
        "total_volume": sum(d["weight"] for _, _, d in G.edges(data=True)),
        "avg_degree": sum(dict(G.degree()).values()) / G.number_of_nodes() if G.number_of_nodes() > 0 else 0
    }
    
    # Merkezi düğümler
    stats["top_degree"] = sorted(G.degree, key=lambda x: x[1], reverse=True)[:5]
    stats["top_betweenness"] = sorted(nx.betweenness_centrality(G).items(), 
                                    key=lambda x: x[1], reverse=True)[:5]
    
    # Community detection
    communities = detect_communities(G)
    stats["community_count"] = len(communities)
    stats["largest_community"] = max(len(c) for c in communities) if communities else 0
    
    return stats

def detect_communities(G):
    # Undirected graph oluştur
    G_undirected = G.to_undirected()
    # Community detection
    communities = list(nx.community.greedy_modularity_communities(G_undirected))
    return communities

def detect_isolated_nodes(G):
    return [n for n in G.nodes if G.degree(n) == 0]

def detect_heavy_senders(G, threshold=1000):
    heavy = []
    for u, v, d in G.edges(data=True):
        if d.get("weight", 0) > threshold:
            heavy.append({
                "from": u,
                "to": v,
                "value": d["weight"],
                "timestamp": datetime.fromtimestamp(d["timestamp"]).strftime("%Y-%m-%d %H:%M:%S")
            })
    return sorted(heavy, key=lambda x: x["value"], reverse=True)

def analyze_temporal_patterns(G):
    # Zaman bazlı analiz
    timestamps = [d["timestamp"] for _, _, d in G.edges(data=True)]
    if not timestamps:
        return {}
    
    first_tx = min(timestamps)
    last_tx = max(timestamps)
    time_span = last_tx - first_tx
    
    # Zaman dilimlerine göre işlem hacmi
    time_bins = defaultdict(float)
    for _, _, d in G.edges(data=True):
        bin_idx = (d["timestamp"] - first_tx) // (time_span // 10)  # 10 zaman dilimi
        time_bins[bin_idx] += d["weight"]
    
    return {
        "time_span_days": time_span / (24 * 3600),
        "transaction_volume_by_time": dict(time_bins)
    }

def find_critical_paths(G):
    # En önemli path'leri bul
    paths = []
    for u in G.nodes():
        for v in G.nodes():
            if u != v:
                try:
                    path = nx.shortest_path(G, u, v, weight="weight")
                    path_weight = sum(G[path[i]][path[i+1]]["weight"] 
                                    for i in range(len(path)-1))
                    paths.append({
                        "path": path,
                        "weight": path_weight
                    })
                except nx.NetworkXNoPath:
                    continue
    
    return sorted(paths, key=lambda x: x["weight"], reverse=True)[:5]
