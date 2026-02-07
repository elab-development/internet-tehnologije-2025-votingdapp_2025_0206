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
class UserDisplay(BaseModel):
    id: int
    wallet_address: str
    role: UserRole

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

    class Config:
        from_attributes = True

# Za pridruživanje grupi
class JoinGroup(BaseModel):
    access_code: str

# Za kreiranje teme (Frontend šalje ovo)
class TopicCreate(BaseModel):
    title: str
    description: str

# Kako tema izgleda kad je vratimo Frontendu
class Topic(BaseModel):
    id: int
    title: str
    description: str
    status: str  # pending, active, closed
    created_at: datetime
    group_id: int

    class Config:
        from_attributes = True

# Za kreiranje glasa
class VoteCreate(BaseModel):
    topic_id: int
    decision: str # "YES", "NO", "ABSTAIN"
