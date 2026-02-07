from pydantic import BaseModel
from typing import Optional
from .models import UserRole

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
