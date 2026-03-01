import asyncio
import logging
import os
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from . import models, database
from .contract_service import get_contract_service

logger = logging.getLogger(__name__)


class ChainListener:
    
    def __init__(self):
        self.contract_service = get_contract_service()
        self.is_running = False
        self.initial_lookback = int(os.getenv("LISTENER_INITIAL_LOOKBACK", 10000))
        self.factory_last_synced_block = None
        self.group_last_synced_blocks = {}
        self.sync_group_events_enabled = os.getenv("LISTENER_SYNC_GROUP_EVENTS", "false").lower() in ("1", "true", "yes")
        self.max_groups_per_cycle = int(os.getenv("LISTENER_MAX_GROUPS_PER_CYCLE", 3))
    
    def start(self):
        self.is_running = True
        logger.info("Chain listener started")
    
    def stop(self):
        self.is_running = False
        logger.info("Chain listener stopped")

    @staticmethod
    def _extract_group_created_event(event):
        args = event.get("args", {})
        if isinstance(args, dict):
            group_address = args.get("groupAddress")
            admin_address = args.get("admin")
        else:
            group_address = args["groupAddress"]
            admin_address = args["admin"]

        return (
            group_address.lower() if group_address else None,
            admin_address.lower() if admin_address else None,
        )

    def _ensure_admin_user(self, db: Session, admin_wallet: str):
        admin_user = db.query(models.User).filter(
            func.lower(models.User.wallet_address) == admin_wallet
        ).first()

        if not admin_user:
            admin_user = models.User(
                wallet_address=admin_wallet,
                role=models.UserRole.ADMIN
            )
            db.add(admin_user)
            db.flush()
            return

        # If this wallet created a group on-chain, promote it to admin in app.
        if admin_user.role != models.UserRole.ADMIN:
            admin_user.role = models.UserRole.ADMIN
            db.flush()

    def _create_group_from_event(self, db: Session, group_address: str, admin_address: str):
        existing = db.query(models.Group).filter(
            func.lower(models.Group.contract_address) == group_address
        ).first()
        if existing:
            return existing

        self._ensure_admin_user(db, admin_address)

        pending_group = db.query(models.Group).filter(
            func.lower(models.Group.admin_wallet) == admin_address,
            models.Group.contract_address.is_(None)
        ).order_by(models.Group.id.asc()).first()
        if pending_group:
            pending_group.contract_address = group_address
            db.commit()
            db.refresh(pending_group)
            logger.info(
                "Linked on-chain contract to pending group: id=%s contract=%s admin=%s",
                pending_group.id,
                pending_group.contract_address,
                pending_group.admin_wallet,
            )
            return pending_group

        generated_name = f"OnChain-{group_address}"
        generated_access_code = group_address

        new_group = models.Group(
            name=generated_name,
            access_code=generated_access_code,
            admin_wallet=admin_address,
            contract_address=group_address
        )
        db.add(new_group)
        db.commit()
        db.refresh(new_group)
        logger.info(
            "Created group from blockchain event: id=%s contract=%s admin=%s",
            new_group.id,
            new_group.contract_address,
            new_group.admin_wallet,
        )
        return new_group
    
    def sync_group_created_events(self, db: Session):
        try:
            current_block = self.contract_service.get_latest_block()
            if self.factory_last_synced_block is None:
                from_block = max(current_block - self.initial_lookback, 0)
            else:
                from_block = self.factory_last_synced_block + 1

            if from_block > current_block:
                return
            
            # Fetch events
            events = self.contract_service.get_group_factory_events(
                from_block=from_block,
                to_block=current_block
            )
            
            for event in events:
                group_address, admin_address = self._extract_group_created_event(event)
                
                logger.info(f"Found GroupCreated event: {group_address} by {admin_address}")

                if not group_address or not admin_address:
                    logger.warning(f"Skipping malformed GroupCreated event: {event}")
                    continue

                existing = db.query(models.Group).filter(
                    func.lower(models.Group.contract_address) == group_address
                ).first()
                if existing:
                    continue

                try:
                    self._create_group_from_event(db, group_address, admin_address)
                except Exception as create_error:
                    db.rollback()
                    logger.error(
                        "Failed to create group from event for contract %s: %s",
                        group_address,
                        create_error,
                    )

            self.factory_last_synced_block = current_block
        
        except Exception as e:
            logger.error(f"Error syncing GroupCreated events: {e}")
    
    def sync_group_events(self, db: Session, group_contract_address: str):
        try:
            contract_key = group_contract_address.lower()
            current_block = self.contract_service.get_latest_block()
            last_synced = self.group_last_synced_blocks.get(contract_key)
            if last_synced is None:
                from_block = max(current_block - self.initial_lookback, 0)
            else:
                from_block = last_synced + 1

            if from_block > current_block:
                return
            
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
                    func.lower(models.Group.contract_address) == contract_key
                ).first()
                
                if group:
                    # Check if topic already exists
                    existing_topic = db.query(models.Topic).filter(
                        models.Topic.on_chain_topic_id == topic_id,
                        func.lower(models.Topic.contract_address) == contract_key
                    ).first()
                    
                    if not existing_topic:
                        # Create new topic record
                        new_topic = models.Topic(
                            ipfs_hash=metadata_uri,
                            on_chain_topic_id=topic_id,
                            contract_address=contract_key,
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
                    func.lower(models.Topic.contract_address) == contract_key
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
                        
                        # Update vote counts in topic
                        if vote_choice == 0:  # YES
                            topic.votes_yes += 1
                        elif vote_choice == 1:  # NO
                            topic.votes_no += 1
                        elif vote_choice == 2:  # ABSTAIN
                            topic.votes_abstain += 1
                        
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
                    func.lower(models.Topic.contract_address) == contract_key
                ).first()
                
                if topic:
                    topic.status = models.TopicStatus.CLOSED
                    topic.finalized = True
                    topic.result = result
                    db.commit()
                    logger.info(f"Updated topic {topic_id} status to CLOSED")

            self.group_last_synced_blocks[contract_key] = current_block
        
        except Exception as e:
            logger.error(f"Error syncing group events: {e}")

    def sync_once(self, db: Session):
        logger.info("Syncing GroupFactory events...")
        self.sync_group_created_events(db)

        if not self.sync_group_events_enabled:
            logger.debug("Skipping group event sync (LISTENER_SYNC_GROUP_EVENTS=false)")
            return

        groups = db.query(models.Group).filter(models.Group.contract_address.isnot(None)).all()
        for group in groups[: self.max_groups_per_cycle]:
            logger.info(f"Syncing events for group: {group.contract_address}")
            self.sync_group_events(db, group.contract_address)


def sync_blockchain_events(listener: ChainListener = None):
    db = database.SessionLocal()
    managed_listener = listener or ChainListener()
    if not managed_listener.is_running:
        managed_listener.start()
    
    try:
        managed_listener.sync_once(db)
        logger.info("Event sync completed successfully")
    
    except Exception as e:
        logger.error(f"Error in event sync: {e}")
    
    finally:
        db.close()
        if listener is None:
            managed_listener.stop()


async def run_event_listener_loop():
    listen_interval = int(os.getenv('LISTEN_INTERVAL', 12))
    listener = ChainListener()
    listener.start()
    
    try:
        while True:
            try:
                sync_blockchain_events(listener)
            except Exception as e:
                logger.error(f"Error in event listener loop: {e}")
            await asyncio.sleep(listen_interval)
    finally:
        listener.stop()
