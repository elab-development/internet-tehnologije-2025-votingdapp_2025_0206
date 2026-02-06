from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Učitavamo promenljive iz .env fajla
load_dotenv()

# Uzimamo URL baze
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Kreiramo "Engine" - to je glavni konektor ka bazi
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Kreiramo SessionLocal - ovo koristimo svaki put kad nam treba pristup bazi
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base klasa - svi naši modeli (tabele) će nasleđivati ovo
Base = declarative_base()

# Pomoćna funkcija za dobijanje sesije (Dependency Injection)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()