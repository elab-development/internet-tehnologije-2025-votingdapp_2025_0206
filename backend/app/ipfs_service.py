import os
import logging
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class IPFSClient:
    
    def __init__(self):
        self.api_key = os.getenv('PINATA_API_KEY')
        self.api_secret = os.getenv('PINATA_API_SECRET')
        self.jwt = os.getenv('PINATA_JWT')
        self.gateway_url = self._normalize_gateway_url(
            os.getenv('IPFS_GATEWAY_URL', 'https://gateway.pinata.cloud/ipfs/')
        )
        self.last_error: Optional[str] = None
        
        has_key_secret = bool(self.api_key and self.api_secret)
        if not self.jwt and not has_key_secret:
            logger.warning("Pinata credentials not configured. IPFS uploads will not work.")
            self.configured = False
        else:
            self.configured = True

    @staticmethod
    def _normalize_gateway_url(raw_url: str) -> str:
        url = (raw_url or "").strip()
        if not url:
            return "https://gateway.pinata.cloud/ipfs/"
        if not (url.startswith("http://") or url.startswith("https://")):
            url = f"https://{url}"
        url = url.rstrip("/")
        if not url.lower().endswith("/ipfs"):
            url = f"{url}/ipfs"
        return f"{url}/"
    
    def upload_json(self, data: Dict[str, Any], name: str = "data") -> Optional[str]:
        self.last_error = None

        if not self.configured:
            self.last_error = "Pinata credentials are missing (set PINATA_JWT or PINATA_API_KEY + PINATA_API_SECRET)."
            logger.warning("IPFS not configured - returning None for hash")
            return None
        
        try:
            # pinJSONToIPFS expects JSON payload (pinataContent), not multipart files.
            payload = {
                'pinataMetadata': {'name': f'{name}.json'},
                'pinataContent': data,
            }

            headers = {'Content-Type': 'application/json'}
            if self.jwt:
                headers['Authorization'] = f'Bearer {self.jwt}'
            else:
                headers['pinata_api_key'] = self.api_key
                headers['pinata_secret_api_key'] = self.api_secret

            # Make request to Pinata
            response = requests.post(
                'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code in (200, 201):
                result = response.json()
                ipfs_hash = result.get('IpfsHash')
                if not ipfs_hash:
                    self.last_error = "Pinata response did not include IpfsHash."
                    logger.error(self.last_error)
                    return None
                logger.info(f"Successfully uploaded to IPFS: {ipfs_hash}")
                return ipfs_hash
            else:
                detail = response.text
                try:
                    error_json = response.json()
                    detail = (
                        error_json.get('error', {}).get('details')
                        or error_json.get('error')
                        or error_json.get('message')
                        or detail
                    )
                except ValueError:
                    pass
                detail = str(detail)[:600]
                self.last_error = f"Pinata upload failed ({response.status_code}): {detail}"
                logger.error(self.last_error)
                return None
        
        except Exception as e:
            self.last_error = f"Error uploading to Pinata: {e}"
            logger.error(self.last_error)
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

def upload_topic_metadata(title: str, description: str) -> str:
    ipfs = get_ipfs_client()
    metadata = {
        'title': title,
        'description': description,
        'version': '1.0'
    }
    ipfs_hash = ipfs.upload_json(metadata, f"topic_{title}")
    if not ipfs_hash:
        raise RuntimeError(ipfs.last_error or "IPFS upload failed")
    return ipfs_hash


def get_topic_metadata(ipfs_hash: str) -> Optional[Dict[str, Any]]:
    ipfs = get_ipfs_client()
    return ipfs.get_json(ipfs_hash)
