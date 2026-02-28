from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum
from datetime import datetime

# Pravimo kako ce izgledati tabele, odn. struktura baze

# Enumi

# Vrsta usera
class UserRole(enum.Enum):
    ADMIN = "admin"
    USER = "user"

# Vrsta glasanja
class VoteOption(enum.Enum):
    YES = "YES"
    NO = "NO"
    ABSTAIN = "ABSTAIN"

# Status teme
class TopicStatus(enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    CLOSED = "closed"

# Tabele

# Membership table connects users and groups with a per-group role
class Membership(Base):
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER)

    user = relationship("User", back_populates="memberships")
    group = relationship("Group", back_populates="memberships")

    __table_args__ = (UniqueConstraint("user_id", "group_id"),)

# Korisnik
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String, unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER)
    # *no* longer storing a single group_id; memberships table handles many-to-many

    # Relacije
    memberships = relationship("Membership", back_populates="user")
    votes = relationship("Vote", back_populates="user")


# Grupa
class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    access_code = Column(String, unique=True)
    admin_wallet = Column(String, nullable=False)

    # Relacije
    memberships = relationship("Membership", back_populates="group")
    topics = relationship("Topic", back_populates="group")

# Tema
class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(Enum(TopicStatus), default=TopicStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    group_id = Column(Integer, ForeignKey("groups.id"))
    
    # Relacije
    group = relationship("Group", back_populates="topics")
    votes = relationship("Vote", back_populates="topic", cascade="all, delete-orphan")

# Glas
class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, index=True)
    decision = Column(Enum(VoteOption), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)

    # Relacije
    user = relationship("User", back_populates="votes")
    topic = relationship("Topic", back_populates="votes")

    __table_args__ = (UniqueConstraint('user_id', 'topic_id', name='unique_user_vote'),)