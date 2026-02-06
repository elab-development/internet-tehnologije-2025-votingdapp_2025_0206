from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas, database, security
from fastapi.middleware.cors import CORSMiddleware

# Pravimo tabele(ako ne postoje)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Voting Dapp API")

# Dodavanje CORS-a (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "online", "message": "Voting Dapp Backend is running"}

@app.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(database.get_db)):
    try:
        # Provera MetaMask potpisa
        is_valid = security.verify_signature(login_data.wallet_address, login_data.signature)
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature"
            )

        # Provera da li korisnik već postoji u bazi
        user = db.query(models.User).filter(func.lower(models.User.wallet_address) == login_data.wallet_address.lower()).first()

        # Ako ne postoji, kreira se (Automatska registracija)
        if not user:
            user = models.User(
                wallet_address=login_data.wallet_address.lower(),
                role=models.UserRole.USER # Svaki novi je običan korisnik
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Generisanje JWT tokena
        access_token = security.create_access_token(
            data={"sub": user.wallet_address, "role": user.role.value}
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_role": user.role
        }
    except Exception as e:
        # Ovo nam služi da vidimo grešku (ako pukne)
        print(f"Greška: {e}")
        raise HTTPException(status_code=500, detail=str(e))
