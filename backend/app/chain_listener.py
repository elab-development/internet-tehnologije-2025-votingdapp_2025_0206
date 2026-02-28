"""
Blockchain Event Listener
Monitors smart contract events and writes data to the database
"""
import asyncio
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from . import models, database
from .contract_service import get_contract_service

logger = logging.getLogger(__name__)


class ChainListener:
    """Listens to blockchain events and syncs to database"""
    
    def __init__(self):
        self.contract_service = get_contract_service()
        self.is_running = False
    
    def start(self):
        """Start the event listener"""
        self.is_running = True
        logger.info("Chain listener started")
    
    def stop(self):
        """Stop the event listener"""
        self.is_running = False
        logger.info("Chain listener stopped")
    
    def sync_group_created_events(self, db: Session):
        """Sync GroupCreated events from the factory contract"""
        try:
            current_block = self.contract_service.get_latest_block()
            # Start from a reasonable recent block window to catch missed events
            from_block = max(current_block - 10000, 0)
            
            # Fetch events
            events = self.contract_service.get_group_factory_events(
                from_block=from_block,
                to_block=current_block
            )
            
            for event in events:
                # Extract event data
                # Support different event object shapes returned by web3
                if isinstance(event.get('args'), dict):
                    group_address = event['args'].get('groupAddress')
                    admin_address = event['args'].get('admin')
                else:
                    group_address = event['args']['groupAddress']
                    admin_address = event['args']['admin']
                
                logger.info(f"Found GroupCreated event: {group_address} by {admin_address}")
                
                # Check if group already exists
                existing = db.query(models.Group).filter(
                    models.Group.contract_address == group_address
                ).first()
                
                if not existing:
                    logger.warning(
                        f"Group with contract {group_address} not found in database. "
                        "This suggests the group was created on-chain without backend record."
                    )
        
        except Exception as e:
            logger.error(f"Error syncing GroupCreated events: {e}")
    
    def sync_group_events(self, db: Session, group_contract_address: str):
        """Sync events from a specific group contract"""
        try:
            current_block = self.contract_service.get_latest_block()
            from_block = max(current_block - 10000, 0)
            
            # Get all event types from the group contract
            events_data = self.contract_service.get_group_events(
                group_contract_address,
                from_block=from_block,
                to_block=current_block
            )
            
            # Process MemberAdded events
            for event in events_data.get('MemberAdded', []):
                member_address = event['args']['member']
                logger.info(f"MemberAdded: {member_address}")
                # You can sync member data here if needed
            
            # Process MemberRemoved events
            for event in events_data.get('MemberRemoved', []):
                member_address = event['args']['member']
                logger.info(f"MemberRemoved: {member_address}")
            
            # Process TopicCreated events
            for event in events_data.get('TopicCreated', []):
                topic_id = event['args']['topicId']
                metadata_uri = event['args']['metadataURI']
                logger.info(f"TopicCreated: ID={topic_id}, IPFS={metadata_uri}")
                
                # Find the corresponding group in database
                group = db.query(models.Group).filter(
                    models.Group.contract_address == group_contract_address
                ).first()
                
                if group:
                    # Check if topic already exists
                    existing_topic = db.query(models.Topic).filter(
                        models.Topic.on_chain_topic_id == topic_id,
                        models.Topic.contract_address == group_contract_address
                    ).first()
                    
                    if not existing_topic:
                        # Create new topic record
                        new_topic = models.Topic(
                            ipfs_hash=metadata_uri,
                            on_chain_topic_id=topic_id,
                            contract_address=group_contract_address,
                            status=models.TopicStatus.ACTIVE,
                            group_id=group.id
                        )
                        db.add(new_topic)
                        db.commit()
                        logger.info(f"Created topic record in database: {topic_id}")
            
            # Process VoteCast events
            for event in events_data.get('VoteCast', []):
                topic_id = event['args']['topicId']
                voter_address = event['args']['voter']
                vote_choice = event['args']['vote']  # 0=YES, 1=NO, 2=ABSTAIN
                
                logger.info(f"VoteCast: Topic={topic_id}, Voter={voter_address}, Vote={vote_choice}")
                
                # Find topic in database
                topic = db.query(models.Topic).filter(
                    models.Topic.on_chain_topic_id == topic_id,
                    models.Topic.contract_address == group_contract_address
                ).first()
                
                if topic:
                    # Find or create user
                    user = db.query(models.User).filter(
                        models.User.wallet_address == voter_address.lower()
                    ).first()
                    
                    if not user:
                        user = models.User(
                            wallet_address=voter_address.lower(),
                            role=models.UserRole.USER
                        )
                        db.add(user)
                        db.flush()
                    
                    # Check if vote already exists
                    existing_vote = db.query(models.Vote).filter(
                        models.Vote.user_id == user.id,
                        models.Vote.topic_id == topic.id
                    ).first()
                    
                    if not existing_vote:
                        # Map vote choice to decision
                        vote_map = {0: models.VoteOption.YES, 1: models.VoteOption.NO, 2: models.VoteOption.ABSTAIN}
                        decision = vote_map.get(vote_choice, models.VoteOption.ABSTAIN)
                        
                        # Create vote record
                        new_vote = models.Vote(
                            decision=decision,
                            user_id=user.id,
                            topic_id=topic.id,
                            timestamp=datetime.utcnow()
                        )
                        db.add(new_vote)
                        db.commit()
                        logger.info(f"Created vote record in database")
            
            # Process TopicFinalized events
            for event in events_data.get('TopicFinalized', []):
                topic_id = event['args']['topicId']
                result = event['args']['result']  # 0=YES, 1=NO, 2=ABSTAIN/TIED
                
                logger.info(f"TopicFinalized: Topic={topic_id}, Result={result}")
                
                # Update topic status in database
                topic = db.query(models.Topic).filter(
                    models.Topic.on_chain_topic_id == topic_id,
                    models.Topic.contract_address == group_contract_address
                ).first()
                
                if topic:
                    topic.status = models.TopicStatus.CLOSED
                    db.commit()
                    logger.info(f"Updated topic {topic_id} status to CLOSED")
        
        except Exception as e:
            logger.error(f"Error syncing group events: {e}")


def sync_blockchain_events():
    """Background task to sync blockchain events to database"""
    db = database.SessionLocal()
    listener = ChainListener()
    listener.start()
    
    try:
        # Sync factory events
        logger.info("Syncing GroupFactory events...")
        listener.sync_group_created_events(db)
        
        # Sync events for all groups
        groups = db.query(models.Group).filter(models.Group.contract_address.isnot(None)).all()
        for group in groups:
            logger.info(f"Syncing events for group: {group.contract_address}")
            listener.sync_group_events(db, group.contract_address)
        
        logger.info("Event sync completed successfully")
    
    except Exception as e:
        logger.error(f"Error in event sync: {e}")
    
    finally:
        db.close()
        listener.stop()


async def run_event_listener_loop():
    """Continuous event listener loop - run in background"""
    import os
    from . import database
    
    listen_interval = int(os.getenv('LISTEN_INTERVAL', 12))
    
    while True:
        try:
            await asyncio.sleep(listen_interval)
            sync_blockchain_events()
        except Exception as e:
            logger.error(f"Error in event listener loop: {e}")
            await asyncio.sleep(listen_interval)
