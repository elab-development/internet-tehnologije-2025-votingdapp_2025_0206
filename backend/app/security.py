from datetime import datetime, timedelta
from jose import jwt
from eth_account.messages import encode_defunct
from web3 import Web3
import os
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from . import models, database
from sqlalchemy.orm import Session
from sqlalchemy import func

# Konfiguracija iz .env
SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# Funkcija za kreiranje tokena
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire.timestamp()})
    if not SECRET_KEY:
        raise ValueError("JWT_SECRET nije pronađen u .env fajlu!")

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Funkcija za proveru metamask-a (potpisa)
def verify_signature(wallet_address: str, signature: str):
    try:
        # Poruka koju je korisnik potpisao
        message_text = "Login to Voting Dapp"
        
        # Priprema poruke za Web3
        encoded_message = encode_defunct(text=message_text)
        
        # "Oporavljamo" adresu iz potpisa
        w3 = Web3()
        recovered_address = w3.eth.account.recover_message(encoded_message, signature=signature)
        
        # Ako je adresa koju smo dobili iz potpisa ista kao ona koju korisnik poseduje, onda je to to
        return recovered_address.lower() == wallet_address.lower()
    except Exception:
        logger.warning("MetaMask signature verification failed")
        return False

# Funkcija za proveru tokena 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nije moguće validirati podatke",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Dekodiramo token koristeći tajni kljuc iz .env-a
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        wallet_address: str = payload.get("sub")
        # role claim is still available but we ignore it below
        if wallet_address is None:
            raise credentials_exception

        # lookup current user in database – ensures role changes are reflected
        user = db.query(models.User).filter(
            func.lower(models.User.wallet_address) == wallet_address.lower()
        ).first()
        if not user:
            raise credentials_exception

        return {"wallet_address": user.wallet_address, "role": user.role.value}
    except Exception:
        raise credentials_exception