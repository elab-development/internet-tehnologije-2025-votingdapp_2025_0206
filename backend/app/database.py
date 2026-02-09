from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os


# URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Provera
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