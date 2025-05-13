import requests
import json
import time
import os
from dotenv import load_dotenv

# Ortam değişkenlerini yükle
load_dotenv()
ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY")
BASE_URL = "https://api.etherscan.io/api"

# 🔁 Genişletilmiş blok aralığı (2021'den günümüze)
START_BLOCK = 14000000
END_BLOCK = 19000000
STEP = 100000
FILENAME = "data/raw_transactions.json"

# 🧠 En aktif cüzdanlar (borsa & balina)
WALLET_ADDRESSES = [
    "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",  # Binance
    "0xdc76cd25977e0a5ae17155770273ad58648900d3",  # Kraken
    "0x564286362092d8e7936f0549571a803b203aaced",  # Binance Cold
    "0xab5c66752a9e8167967685f1450532fb96d5d24f",  # Huobi
    "0x6fc82a5fe25a5cdb58bc74600a40a69c065263f8",  # Gemini
    "0x53d284357ec70ce289d6d64134dfac8e511c8a3d",  # Bitfinex
    "0xfe9e8709d3215310075d67e3ed32a380ccf451c8",  # Celsius
    "0x8f22f2063d253846b53609231ed80fa571bc0c8f",  # Binance Staking
    "0x2b5634c42055806a59e9107ed44d43c426e58258",  # Balina
    "0x6810e776880c02933d47db1b9fc05908e5386b96",  # Gnosis Vault
]

def get_transactions(address, start_block, end_block):
    params = {
        "module": "account",
        "action": "txlist",
        "address": address,
        "startblock": start_block,
        "endblock": end_block,
        "sort": "asc",
        "apikey": ETHERSCAN_API_KEY
    }
    print(f"[{address}] 🔍 {start_block}-{end_block}")
    response = requests.get(BASE_URL, params=params)
    try:
        data = response.json()
        if data.get("status") != "1":
            print(f"[{address}] ⚠️ Hata: {data.get('message')}")
            return []
        return data["result"]
    except Exception:
        print(f"[{address}] ❌ JSON hatası.")
        return []

def save_transactions(transactions, filename):
    if not transactions:
        print("⚠️ Hiç işlem alınmadı.")
        return
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(transactions, f, indent=2)
    print(f"\n✅ {len(transactions)} işlem kaydedildi → {filename}")

def run():
    all_transactions = []
    for address in WALLET_ADDRESSES:
        for block in range(START_BLOCK, END_BLOCK, STEP):
            txs = get_transactions(address, block, block + STEP)
            all_transactions.extend(txs)
            time.sleep(1)
            if len(all_transactions) >= 10000:
                print("🚀 10.000 işlem limitine ulaşıldı.")
                save_transactions(all_transactions, FILENAME)
                return
    save_transactions(all_transactions, FILENAME)

if __name__ == "__main__":
    run()
