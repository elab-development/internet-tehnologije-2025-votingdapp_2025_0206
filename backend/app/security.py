from datetime import datetime, timedelta
from jose import jwt
from eth_account.messages import encode_defunct
from web3 import Web3
import os
from dotenv import load_dotenv
from pathlib import Path

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