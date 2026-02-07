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

@app.post("/groups", response_model=schemas.Group)
def create_group(
    group: schemas.GroupCreate, 
    current_user: dict = Depends(security.get_current_user), # Ovo proverava token
    db: Session = Depends(database.get_db)
):
    print(f"Zahtev od: {current_user['wallet_address']} sa ulogom {current_user['role']}")

    # Provera korisnika ADMIN?
    if current_user["role"].lower() != "admin":
        raise HTTPException(status_code=403, detail="Samo admin može da pravi grupe!")

    # Da li grupa već postoji? (Po imenu ili šifri)
    existing_group = db.query(models.Group).filter(
        (models.Group.name == group.name) | (models.Group.access_code == group.access_code)
    ).first()
    
    if existing_group:
        raise HTTPException(status_code=400, detail="Grupa sa tim imenom ili šifrom već postoji")

    # Kad zavrsi, upisuju se u bazu
    new_group = models.Group(
        name=group.name,
        access_code=group.access_code,
        admin_wallet=current_user["wallet_address"]
    )
    
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    return new_group
