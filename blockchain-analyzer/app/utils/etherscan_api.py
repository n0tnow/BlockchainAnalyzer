import requests
import os

ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY")  # .env dosyasına yazılabilir

BASE_URL = "https://api.etherscan.io/api"

def get_transactions(address, start_block=0, end_block=99999999):
    params = {
        "module": "account",
        "action": "txlist",
        "address": address,
        "startblock": start_block,
        "endblock": end_block,
        "sort": "asc",
        "apikey": ETHERSCAN_API_KEY
    }
    response = requests.get(BASE_URL, params=params)
    data = response.json()
    if data["status"] != "1":
        raise ValueError(f"Etherscan API error: {data.get('message', 'Unknown error')}")
    return data["result"]
