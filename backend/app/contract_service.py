import os
import logging
from web3 import Web3
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

class ContractService:
    
    def __init__(self):
        self.rpc_url = os.getenv('WEB3_RPC_URL', os.getenv('SEPOLIA_RPC_URL'))
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to Web3 provider at {self.rpc_url}")
        
        self.group_factory_address = os.getenv('GROUP_FACTORY_CONTRACT_ADDRESS')
        self._load_abis()
    
    def _load_abis(self):
        try:
            # Copy ABIs from frontend to backend or load from environment
            self.group_factory_abi = self._get_group_factory_abi()
            self.group_abi = self._get_group_abi()
        except Exception as e:
            logger.warning("Could not load ABIs: %s", e)
            self.group_factory_abi = []
            self.group_abi = []
    
    @staticmethod
    def _get_group_factory_abi() -> List[Dict[str, Any]]:
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
                "inputs": [{"internalType": "uint256", "name": "topicId", "type": "uint256"}],
                "name": "finalize",
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
        if not self.group_factory_address:
            raise ValueError("GROUP_FACTORY_CONTRACT_ADDRESS not set in environment")
        
        return self.w3.eth.contract(
            address=Web3.to_checksum_address(self.group_factory_address),
            abi=self.group_factory_abi
        )
    
    def get_group_contract(self, contract_address: str):
        return self.w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=self.group_abi
        )
    
    def get_group_factory_events(self, from_block: int, to_block: int = 'latest'):
        try:
            contract = self.get_group_factory_contract()
            events = contract.events.GroupCreated.get_logs(from_block=from_block, to_block=to_block)
            return events
        except Exception as e:
            logger.error("Error fetching GroupCreated events: %s", e)
            return []
    
    def get_group_events(self, group_address: str, from_block: int, to_block: int = 'latest'):
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
            logger.error("Error fetching group events for %s: %s", group_address, e)
            return {}
    
    def get_latest_block(self) -> int:
        """Get the latest block number"""
        return self.w3.eth.block_number

    def resolve_group_from_creation_tx(self, tx_hash: str) -> Dict[str, str]:
        if not tx_hash:
            raise ValueError("transaction_hash is required")

        receipt = self.w3.eth.get_transaction_receipt(tx_hash)
        if not receipt:
            raise ValueError("Transaction receipt not found")

        status = receipt.get("status")
        if status in (0, False):
            raise ValueError("Blockchain transaction failed")

        to_address = receipt.get("to")
        if to_address and self.group_factory_address:
            if to_address.lower() != self.group_factory_address.lower():
                raise ValueError("Transaction was not sent to GroupFactory contract")

        factory = self.get_group_factory_contract()
        events = factory.events.GroupCreated().process_receipt(receipt)
        if not events:
            raise ValueError("GroupCreated event not found in transaction receipt")

        event = events[0]
        args = event["args"]
        group_address = Web3.to_checksum_address(args["groupAddress"])
        admin_address = Web3.to_checksum_address(args["admin"])

        return {
            "group_address": group_address,
            "admin_address": admin_address,
        }

    def _get_successful_receipt(self, tx_hash: str):
        if not tx_hash:
            raise ValueError("transaction_hash is required")

        receipt = self.w3.eth.get_transaction_receipt(tx_hash)
        if not receipt:
            raise ValueError("Transaction receipt not found")

        status = receipt.get("status")
        if status in (0, False):
            raise ValueError("Blockchain transaction failed")

        return receipt

    def resolve_vote_cast_from_tx(self, tx_hash: str) -> Dict[str, Any]:
        receipt = self._get_successful_receipt(tx_hash)

        contract_address = receipt.get("to")
        if not contract_address:
            raise ValueError("Missing contract address in transaction receipt")

        group = self.get_group_contract(contract_address)
        events = group.events.VoteCast().process_receipt(receipt)
        if not events:
            raise ValueError("VoteCast event not found in transaction receipt")
        finalized_events = group.events.TopicFinalized().process_receipt(receipt)

        event = events[0]
        args = event["args"]
        tx = self.w3.eth.get_transaction(tx_hash)

        finalized_result = None
        for finalized_event in finalized_events:
            finalized_args = finalized_event["args"]
            if int(finalized_args["topicId"]) == int(args["topicId"]):
                finalized_result = int(finalized_args["result"])
                break

        return {
            "contract_address": Web3.to_checksum_address(contract_address),
            "topic_id": int(args["topicId"]),
            "voter_address": Web3.to_checksum_address(args["voter"]),
            "vote": int(args["vote"]),
            "finalized": finalized_result is not None,
            "finalize_result": finalized_result,
            "sender_address": Web3.to_checksum_address(tx["from"]),
        }

    def resolve_topic_finalized_from_tx(self, tx_hash: str) -> Dict[str, Any]:
        receipt = self._get_successful_receipt(tx_hash)

        contract_address = receipt.get("to")
        if not contract_address:
            raise ValueError("Missing contract address in transaction receipt")

        group = self.get_group_contract(contract_address)
        events = group.events.TopicFinalized().process_receipt(receipt)
        if not events:
            raise ValueError("TopicFinalized event not found in transaction receipt")

        event = events[0]
        args = event["args"]
        tx = self.w3.eth.get_transaction(tx_hash)

        return {
            "contract_address": Web3.to_checksum_address(contract_address),
            "topic_id": int(args["topicId"]),
            "result": int(args["result"]),
            "sender_address": Web3.to_checksum_address(tx["from"]),
        }


# Global instance
_contract_service: Optional[ContractService] = None


def get_contract_service() -> ContractService:
    global _contract_service
    if _contract_service is None:
        _contract_service = ContractService()
    return _contract_service
