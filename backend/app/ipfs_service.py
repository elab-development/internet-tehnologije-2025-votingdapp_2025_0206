import os
import json
import logging
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class IPFSClient:
    
    def __init__(self):
        self.api_key = os.getenv('PINATA_API_KEY')
        self.api_secret = os.getenv('PINATA_API_SECRET')
        self.gateway_url = os.getenv('IPFS_GATEWAY_URL', 'https://gateway.pinata.cloud/ipfs/')
        
        if not self.api_key or not self.api_secret:
            logger.warning("Pinata credentials not configured. IPFS uploads will not work.")
            self.configured = False
        else:
            self.configured = True
    
    def upload_json(self, data: Dict[str, Any], name: str = "data") -> Optional[str]:

        if not self.configured:
            logger.warning("IPFS not configured - returning None for hash")
            return None
        
        try:
            # Prepare the file
            json_data = json.dumps(data)
            files = {
                'file': (f'{name}.json', json_data)
            }
            
            # Prepare headers with authentication
            headers = {
                'pinata_api_key': self.api_key,
                'pinata_secret_api_key': self.api_secret
            }
            
            # Make request to Pinata
            response = requests.post(
                'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                files=files,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ipfs_hash = result.get('IpfsHash')
                logger.info(f"Successfully uploaded to IPFS: {ipfs_hash}")
                return ipfs_hash
            else:
                logger.error(f"Pinata upload failed: {response.status_code} - {response.text}")
                return None
        
        except Exception as e:
            logger.error(f"Error uploading to IPFS: {e}")
            return None
    
    def get_json(self, ipfs_hash: str) -> Optional[Dict[str, Any]]:
        
        try:
            url = f"{self.gateway_url}{ipfs_hash}"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to retrieve from IPFS: {response.status_code}")
                return None
        
        except requests.exceptions.JSONDecodeError:
            logger.error(f"Retrieved content is not valid JSON")
            return None
        except Exception as e:
            logger.error(f"Error retrieving from IPFS: {e}")
            return None
    
    def get_file_url(self, ipfs_hash: str) -> str:
        return f"{self.gateway_url}{ipfs_hash}"


# Global instance
_ipfs_client: Optional[IPFSClient] = None


def get_ipfs_client() -> IPFSClient:
    """Get or create the IPFS client instance"""
    global _ipfs_client
    if _ipfs_client is None:
        _ipfs_client = IPFSClient()
    return _ipfs_client


# Helper functions for common operations

def upload_topic_metadata(title: str, description: str, options: list) -> Optional[str]:
    ipfs = get_ipfs_client()
    metadata = {
        'title': title,
        'description': description,
        'options': options,
        'version': '1.0'
    }
    return ipfs.upload_json(metadata, f"topic_{title}")


def get_topic_metadata(ipfs_hash: str) -> Optional[Dict[str, Any]]:
    ipfs = get_ipfs_client()
    return ipfs.get_json(ipfs_hash)
