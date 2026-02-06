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

