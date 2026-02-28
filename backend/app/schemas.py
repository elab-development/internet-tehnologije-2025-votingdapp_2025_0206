from pydantic import BaseModel
from typing import Optional
from .models import UserRole
from datetime import datetime

# Uzimamo ono sto nam posalje front pomocu POST
class UserLogin(BaseModel):
    wallet_address: str
    signature: str

# Vracamo frontu za dobro logovanje
class Token(BaseModel):
    access_token: str
    token_type: str
    user_role: UserRole

# Prikazivanje korisnika kad ga traze pomocu API
class Membership(BaseModel):
    group_id: int
    role: UserRole

    class Config:
        from_attributes = True

class UserDisplay(BaseModel):
    id: int
    wallet_address: str
    role: UserRole
    memberships: list[Membership] = []

    # Direktno ucitavanje podataka iz AlchemySQL-a baze
    class Config:
        from_attributes = True
        
# Šta frontend šalje (samo ime i šifru)
class GroupCreate(BaseModel):
    name: str
    access_code: str

# Šta backend vraća (celu grupu sa ID-jem i ko je napravio)
class Group(BaseModel):
    id: int
    name: str
    access_code: str
    admin_wallet: str
    contract_address: Optional[str] = None
    factory_address: Optional[str] = None

    class Config:
        from_attributes = True

# Za pridruživanje grupi
class JoinGroup(BaseModel):
    access_code: str

# Za kreiranje teme (Frontend šalje ovo)
class TopicCreate(BaseModel):
    title: str
    description: str

# Za prikazivanje rezultata
class TopicResults(BaseModel):
    yes: int
    no: int
    abstain: int

# Za kreiranje tema
class Topic(BaseModel):
    id: int
    title: Optional[str] = None
    description: Optional[str] = None
    ipfs_hash: Optional[str] = None
    on_chain_topic_id: Optional[int] = None
    contract_address: Optional[str] = None
    status: str
    created_at: datetime
    group_id: int
    results: Optional[TopicResults] = None 

    class Config:
        from_attributes = True
        
# Za kreiranje glasa
class VoteCreate(BaseModel):
    topic_id: int
    decision: str # "YES", "NO", "ABSTAIN"
