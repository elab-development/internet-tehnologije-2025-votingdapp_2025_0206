from datetime import datetime, timedelta
from jose import jwt
from eth_account.messages import encode_defunct
from web3 import Web3
import os
from dotenv import load_dotenv
from pathlib import Path
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Ucitavanje .env fajla
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Konfiguracija iz .env
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# Funkcija za kreiranje tokena
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire.timestamp()})
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY nije pronađen u .env fajlu!")

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
    except Exception as e:
        print(f"Greška pri verifikaciji: {e}")
        return False

# Funkcija za proveru tokena 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nije moguće validirati podatke",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Dekodiramo token koristeći tajni kljuc iz .env-a
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        wallet_address: str = payload.get("sub")
        role: str = payload.get("role")
        
        if wallet_address is None:
            raise credentials_exception
            
        return {"wallet_address": wallet_address, "role": role}
    except Exception:
        raise credentials_exception