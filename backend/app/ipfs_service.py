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
        self.api_url = os.getenv('IPFS_API_URL')
        
        self.last_error: Optional[str] = None
        
        has_key_secret = bool(self.api_key and self.api_secret)
        has_auth = bool(self.jwt) or has_key_secret
        has_api_url = bool(self.api_url)

        if not has_auth:
            logger.warning("Pinata credentials not configured. IPFS uploads will not work.")
        if not has_api_url:
            logger.warning("IPFS_API_URL not configured. IPFS uploads will not work.")

        if not has_auth or not has_api_url:
            self.configured = False
        else:
            self.configured = True


    def upload_json(self, data: Dict[str, Any], name: str = "data") -> Optional[str]:
        self.last_error = None

        if not self.configured:
            missing = []
            if not self.api_url:
                missing.append("IPFS_API_URL")
            if not self.jwt and not (self.api_key and self.api_secret):
                missing.append("PINATA_JWT or PINATA_API_KEY + PINATA_API_SECRET")
            self.last_error = f"IPFS is not configured. Missing: {', '.join(missing)}"
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
                self.api_url,
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
