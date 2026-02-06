from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv
from pathlib import Path

# .env fajl
env_path = Path(".env") 

# Učitavanje fajla
load_dotenv(dotenv_path=env_path)

# URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Provera
print(f"Tražim .env fajl ovde: {env_path.absolute()}")
print(f"Da li fajl postoji? {'DA' if env_path.exists() else 'NE'}")
print(f"Učitan URL: {SQLALCHEMY_DATABASE_URL}")

if not SQLALCHEMY_DATABASE_URL:
    # ako nema, stajemo
    raise ValueError("GRESKA: DATABASE_URL nije pronađen! Proveri .env fajl.")

# Engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dodatna funkcija
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()