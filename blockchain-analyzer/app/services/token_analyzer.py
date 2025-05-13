import json
from web3 import Web3
from collections import defaultdict
import requests
import os
from dotenv import load_dotenv

load_dotenv()

# ERC20 ABI
ERC20_ABI = json.loads('''[
    {"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"},
    {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"},
    {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},
    {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}
]''')

# ERC721 ABI
ERC721_ABI = json.loads('''[
    {"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"},
    {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"},
    {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"}
]''')

class TokenAnalyzer:
    def __init__(self):
        # Önce .env'den node URL'ini al, yoksa public node kullan
        node_url = os.getenv('ETHEREUM_NODE_URL', 'https://eth.llamarpc.com')
        self.w3 = Web3(Web3.HTTPProvider(node_url))
        self.etherscan_api_key = os.getenv('ETHERSCAN_API_KEY', 'MNBZMBKZFY2D1FBCCSPPF4RSM9ZHACR56S')

    def analyze_tokens(self, address):
        """Analyze all token interactions for a given address"""
        results = {
            'erc20': self._analyze_erc20(address),
            'erc721': self._analyze_erc721(address),
            'erc1155': self._analyze_erc1155(address),
            'gas_analysis': self._analyze_gas_usage(address),
            'risk_score': self._calculate_risk_score(address)
        }
        return results

    def _analyze_erc20(self, address):
        """Analyze ERC20 token interactions"""
        tokens = []
        # Get token transfers from Etherscan
        url = f"https://api.etherscan.io/api?module=account&action=tokentx&address={address}&apikey={self.etherscan_api_key}"
        response = requests.get(url)
        data = response.json()

        if data['status'] == '1':
            for tx in data['result']:
                token = {
                    'contract_address': tx['contractAddress'],
                    'token_name': tx['tokenName'],
                    'token_symbol': tx['tokenSymbol'],
                    'decimals': tx['tokenDecimal'],
                    'value': float(tx['value']) / (10 ** int(tx['tokenDecimal'])),
                    'timestamp': tx['timeStamp'],
                    'type': 'in' if tx['to'].lower() == address.lower() else 'out'
                }
                tokens.append(token)

        return tokens

    def _analyze_erc721(self, address):
        """Analyze ERC721 (NFT) interactions"""
        nfts = []
        url = f"https://api.etherscan.io/api?module=account&action=tokennft&address={address}&apikey={self.etherscan_api_key}"
        response = requests.get(url)
        data = response.json()

        if data['status'] == '1':
            for tx in data['result']:
                nft = {
                    'contract_address': tx['contractAddress'],
                    'token_name': tx['tokenName'],
                    'token_symbol': tx['tokenSymbol'],
                    'token_id': tx['tokenID'],
                    'timestamp': tx['timeStamp'],
                    'type': 'in' if tx['to'].lower() == address.lower() else 'out'
                }
                nfts.append(nft)

        return nfts

    def _analyze_erc1155(self, address):
        """Analyze ERC1155 token interactions"""
        # ERC1155 transfers are not directly available in Etherscan API
        # This would require custom event listening or additional data sources
        return []

    def _analyze_gas_usage(self, address):
        """Analyze gas usage patterns"""
        url = f"https://api.etherscan.io/api?module=account&action=txlist&address={address}&apikey={self.etherscan_api_key}"
        response = requests.get(url)
        data = response.json()

        gas_analysis = {
            'total_gas_used': 0,
            'avg_gas_price': 0,
            'total_gas_cost': 0,
            'transactions': []
        }

        if data['status'] == '1':
            gas_prices = []
            for tx in data['result']:
                gas_used = int(tx['gasUsed'])
                gas_price = int(tx['gasPrice'])
                gas_cost = gas_used * gas_price / 1e18  # Convert to ETH

                gas_analysis['total_gas_used'] += gas_used
                gas_prices.append(gas_price)
                gas_analysis['total_gas_cost'] += gas_cost

                gas_analysis['transactions'].append({
                    'hash': tx['hash'],
                    'gas_used': gas_used,
                    'gas_price': gas_price,
                    'gas_cost': gas_cost,
                    'timestamp': tx['timeStamp']
                })

            if gas_prices:
                gas_analysis['avg_gas_price'] = sum(gas_prices) / len(gas_prices)

        return gas_analysis

    def _calculate_risk_score(self, address):
        """Calculate risk score based on various factors"""
        risk_factors = {
            'high_value_transactions': 0,
            'suspicious_contracts': 0,
            'rapid_transactions': 0,
            'total_score': 0
        }

        # Get transaction history
        url = f"https://api.etherscan.io/api?module=account&action=txlist&address={address}&apikey={self.etherscan_api_key}"
        response = requests.get(url)
        data = response.json()

        if data['status'] == '1':
            transactions = data['result']
            
            # Check for high value transactions (>100 ETH)
            for tx in transactions:
                value = float(tx['value']) / 1e18
                if value > 100:
                    risk_factors['high_value_transactions'] += 1

            # Check for rapid transactions (multiple transactions within 1 minute)
            for i in range(1, len(transactions)):
                time_diff = int(transactions[i]['timeStamp']) - int(transactions[i-1]['timeStamp'])
                if time_diff < 60:
                    risk_factors['rapid_transactions'] += 1

        # Calculate total risk score (0-100)
        risk_factors['total_score'] = min(100, (
            risk_factors['high_value_transactions'] * 10 +
            risk_factors['suspicious_contracts'] * 20 +
            risk_factors['rapid_transactions'] * 5
        ))

        return risk_factors 