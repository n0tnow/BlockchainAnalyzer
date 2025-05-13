import numpy as np
from collections import defaultdict
from datetime import datetime

def analyze_transactions(transactions):
    # Temel metrikler
    total_eth = sum([int(tx["value"]) / 1e18 for tx in transactions if tx["isError"] == "0"])
    tx_count = len(transactions)
    
    # Zaman bazlı analiz
    timestamps = [int(tx["timeStamp"]) for tx in transactions]
    if timestamps:
        first_tx = datetime.fromtimestamp(min(timestamps))
        last_tx = datetime.fromtimestamp(max(timestamps))
        time_span = (last_tx - first_tx).days
    else:
        time_span = 0
    
    # İşlem değeri analizi
    values = [int(tx["value"]) / 1e18 for tx in transactions if tx["isError"] == "0"]
    if values:
        avg_value = np.mean(values)
        max_value = max(values)
        value_std = np.std(values)
    else:
        avg_value = max_value = value_std = 0
    
    # Anomali tespiti
    anomalies = detect_anomalies(transactions)
    
    # Smart contract etkileşimleri
    contract_interactions = sum(1 for tx in transactions if tx.get("to", "").startswith("0x") and len(tx["to"]) == 42)
    
    return {
        "total_eth_sent": round(total_eth, 4),
        "tx_count": tx_count,
        "time_span_days": time_span,
        "avg_transaction_value": round(avg_value, 4),
        "max_transaction_value": round(max_value, 4),
        "value_std_dev": round(value_std, 4),
        "contract_interactions": contract_interactions,
        "anomalies": anomalies
    }

def detect_anomalies(transactions):
    anomalies = {
        "high_value_txs": [],
        "rapid_transactions": [],
        "suspicious_patterns": []
    }
    
    # Yüksek değerli işlemler (100 ETH üzeri)
    for tx in transactions:
        value_eth = int(tx["value"]) / 1e18
        if value_eth > 100:
            anomalies["high_value_txs"].append({
                "hash": tx["hash"],
                "value": value_eth,
                "from": tx["from"],
                "to": tx["to"]
            })
    
    # Hızlı art arda gelen işlemler
    if len(transactions) > 1:
        for i in range(1, len(transactions)):
            time_diff = int(transactions[i]["timeStamp"]) - int(transactions[i-1]["timeStamp"])
            if time_diff < 60 and transactions[i]["from"] == transactions[i-1]["from"]:
                anomalies["rapid_transactions"].append({
                    "tx1": transactions[i-1]["hash"],
                    "tx2": transactions[i]["hash"],
                    "time_diff": time_diff
                })
    
    # Şüpheli desenler (aynı adrese çok sayıda küçük işlem)
    address_counts = defaultdict(int)
    for tx in transactions:
        if tx["to"]:
            address_counts[tx["to"]] += 1
    
    for address, count in address_counts.items():
        if count > 10:  # Aynı adrese 10'dan fazla işlem
            anomalies["suspicious_patterns"].append({
                "address": address,
                "tx_count": count
            })
    
    return anomalies
