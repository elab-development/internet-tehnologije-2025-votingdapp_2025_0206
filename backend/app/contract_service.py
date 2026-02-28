"""
Web3 Contract Service for handling smart contract interactions
"""
import os
import json
from web3 import Web3
from typing import Optional, List, Dict, Any

# Get contract ABIs - these should be in the contracts directory
CONTRACT_DIR = os.path.join(os.path.dirname(__file__), '../contracts')

class ContractService:
    """Manages Web3 connections and smart contract interactions"""
    
    def __init__(self):
        self.rpc_url = os.getenv('WEB3_RPC_URL', os.getenv('SEPOLIA_RPC_URL'))
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to Web3 provider at {self.rpc_url}")
        
        self.group_factory_address = os.getenv('GROUP_FACTORY_CONTRACT_ADDRESS')
        self._load_abis()
    
    def _load_abis(self):
        """Load contract ABIs"""
        try:
            # Copy ABIs from frontend to backend or load from environment
            self.group_factory_abi = self._get_group_factory_abi()
            self.group_abi = self._get_group_abi()
        except Exception as e:
            print(f"Warning: Could not load ABIs: {e}")
            self.group_factory_abi = []
            self.group_abi = []
    
    @staticmethod
    def _get_group_factory_abi() -> List[Dict[str, Any]]:
        """Get GroupFactory contract ABI"""
        return [
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": False, "internalType": "address", "name": "groupAddress", "type": "address"},
                    {"indexed": False, "internalType": "address", "name": "admin", "type": "address"}
                ],
                "name": "GroupCreated",
                "type": "event"
            },
            {
                "inputs": [],
                "name": "createGroup",
                "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]
    
    @staticmethod
    def _get_group_abi() -> List[Dict[str, Any]]:
        """Get Group contract ABI"""
        return [
            {
                "inputs": [{"internalType": "address", "name": "_admin", "type": "address"}],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            {
                "anonymous": False,
                "inputs": [{"indexed": False, "internalType": "address", "name": "member", "type": "address"}],
                "name": "MemberAdded",
                "type": "event"
            },
            {
                "anonymous": False,
                "inputs": [{"indexed": False, "internalType": "address", "name": "member", "type": "address"}],
                "name": "MemberRemoved",
                "type": "event"
            },
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": False, "internalType": "uint256", "name": "topicId", "type": "uint256"},
                    {"indexed": False, "internalType": "string", "name": "metadataURI", "type": "string"}
                ],
                "name": "TopicCreated",
                "type": "event"
            },
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": False, "internalType": "uint256", "name": "topicId", "type": "uint256"},
                    {"indexed": False, "internalType": "address", "name": "voter", "type": "address"},
                    {"indexed": False, "internalType": "uint8", "name": "vote", "type": "uint8"}
                ],
                "name": "VoteCast",
                "type": "event"
            },
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": False, "internalType": "uint256", "name": "topicId", "type": "uint256"},
                    {"indexed": False, "internalType": "uint8", "name": "result", "type": "uint8"}
                ],
                "name": "TopicFinalized",
                "type": "event"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "addMember",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "removeMember",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "string", "name": "metadataURI", "type": "string"}],
                "name": "createTopic",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"internalType": "uint256", "name": "topicId", "type": "uint256"},
                    {"internalType": "uint8", "name": "choice", "type": "uint8"}
                ],
                "name": "vote",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]
    
    def get_group_factory_contract(self):
        """Get Group Factory contract instance"""
        if not self.group_factory_address:
            raise ValueError("GROUP_FACTORY_CONTRACT_ADDRESS not set in environment")
        
        return self.w3.eth.contract(
            address=Web3.to_checksum_address(self.group_factory_address),
            abi=self.group_factory_abi
        )
    
    def get_group_contract(self, contract_address: str):
        """Get Group contract instance"""
        return self.w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=self.group_abi
        )
    
    def listen_to_group_factory_events(self, from_block: int = 'latest'):
        """Listen to GroupCreated events from the factory contract"""
        try:
            contract = self.get_group_factory_contract()
            event_filter = contract.events.GroupCreated.create_filter(from_block=from_block)
            return event_filter
        except Exception as e:
            print(f"Error creating event filter: {e}")
            return None
    
    def get_group_factory_events(self, from_block: int, to_block: int = 'latest'):
        """Get historical GroupCreated events"""
        try:
            contract = self.get_group_factory_contract()
            events = contract.events.GroupCreated.get_logs(from_block=from_block, to_block=to_block)
            return events
        except Exception as e:
            print(f"Error fetching events: {e}")
            return []
    
    def listen_to_group_events(self, group_address: str, from_block: int = 'latest'):
        """Listen to events from a specific Group contract"""
        try:
            contract = self.get_group_contract(group_address)
            event_filters = {
                'MemberAdded': contract.events.MemberAdded.create_filter(from_block=from_block),
                'MemberRemoved': contract.events.MemberRemoved.create_filter(from_block=from_block),
                'TopicCreated': contract.events.TopicCreated.create_filter(from_block=from_block),
                'VoteCast': contract.events.VoteCast.create_filter(from_block=from_block),
                'TopicFinalized': contract.events.TopicFinalized.create_filter(from_block=from_block),
            }
            return event_filters
        except Exception as e:
            print(f"Error creating event filters for group: {e}")
            return {}
    
    def get_group_events(self, group_address: str, from_block: int, to_block: int = 'latest'):
        """Get historical events from a specific Group contract"""
        try:
            contract = self.get_group_contract(group_address)
            events = {
                'MemberAdded': contract.events.MemberAdded.get_logs(from_block=from_block, to_block=to_block),
                'MemberRemoved': contract.events.MemberRemoved.get_logs(from_block=from_block, to_block=to_block),
                'TopicCreated': contract.events.TopicCreated.get_logs(from_block=from_block, to_block=to_block),
                'VoteCast': contract.events.VoteCast.get_logs(from_block=from_block, to_block=to_block),
                'TopicFinalized': contract.events.TopicFinalized.get_logs(from_block=from_block, to_block=to_block),
            }
            return events
        except Exception as e:
            print(f"Error fetching group events: {e}")
            return {}
    
    def get_latest_block(self) -> int:
        """Get the latest block number"""
        return self.w3.eth.block_number


# Global instance
_contract_service: Optional[ContractService] = None


def get_contract_service() -> ContractService:
    """Get or create the contract service instance"""
    global _contract_service
    if _contract_service is None:
        _contract_service = ContractService()
    return _contract_service
