from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas, database, security
from .ipfs_service import upload_topic_metadata
from .chain_listener import run_event_listener_loop
from .contract_service import get_contract_service
import asyncio
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


@app.post("/ipfs/upload")
def upload_to_ipfs(payload: dict, current_user: dict = Depends(security.get_current_user)):
    title = payload.get("title")
    description = payload.get("description")

    if not title:
        raise HTTPException(status_code=400, detail="Title is required for IPFS metadata")

    try:
        ipfs_hash = upload_topic_metadata(title, description)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ipfs_hash": ipfs_hash}


@app.on_event("startup")
async def start_event_sync():
    # Start the blockchain event sync loop in background
    asyncio.create_task(run_event_listener_loop())

# Ruta za logovanje
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
        access_token = security.create_access_token(data={"sub": user.wallet_address, "role": user.role.value})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_role": user.role
        }
    except Exception as e:
        # Ovo nam služi da vidimo grešku (ako pukne)
        print(f"Greška: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/me", response_model=schemas.UserDisplay)
def read_current_user(
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(models.User).filter(
        func.lower(models.User.wallet_address) == current_user["wallet_address"].lower()
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    group_name = None
    if user.group_id is not None:
        group = db.query(models.Group).filter(models.Group.id == user.group_id).first()
        if group:
            group_name = group.name

    return {
        "id": user.id,
        "wallet_address": user.wallet_address,
        "role": user.role,
        "group_id": user.group_id,
        "group_name": group_name,
    }

# Ruta za kreiranje grupe
@app.post("/groups", response_model=schemas.Group)
def create_group(
    group: schemas.GroupCreate, 
    current_user: dict = Depends(security.get_current_user), # Ovo proverava token
    db: Session = Depends(database.get_db)
):
    print(f"Zahtev od: {current_user['wallet_address']} sa ulogom {current_user['role']}")

    admin_wallet = current_user["wallet_address"].lower()
    user = db.query(models.User).filter(
        func.lower(models.User.wallet_address) == admin_wallet
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    resolved_contract_address = group.contract_address.lower() if group.contract_address else None
    if group.transaction_hash:
        try:
            event_data = get_contract_service().resolve_group_from_creation_tx(group.transaction_hash)
            chain_group_address = event_data["group_address"].lower()
            chain_admin_address = event_data["admin_address"].lower()
        except ValueError as e:
            detail = str(e)
            lowered = detail.lower()

            # If receipt is not available yet or RPC is throttled, keep user's metadata
            # and let chain listener attach contract address once event is seen.
            if (
                "receipt not found" in lowered
                or "rate limited" in lowered
                or "too many requests" in lowered
                or "transaction not found" in lowered
            ):
                user.role = models.UserRole.ADMIN
                pending_group = models.Group(
                    name=group.name,
                    access_code=group.access_code,
                    admin_wallet=admin_wallet,
                    contract_address=None
                )
                db.add(pending_group)
                db.commit()
                db.refresh(pending_group)
                return pending_group

            raise HTTPException(status_code=400, detail=detail)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to verify blockchain transaction: {e}")

        if chain_admin_address != admin_wallet:
            raise HTTPException(
                status_code=403,
                detail="Transaction admin does not match authenticated user"
            )

        if (
            group.contract_address
            and group.contract_address.lower() != chain_group_address.lower()
        ):
            raise HTTPException(
                status_code=400,
                detail="Provided contract_address does not match transaction result"
            )

        resolved_contract_address = chain_group_address

    if not resolved_contract_address:
        raise HTTPException(
            status_code=400,
            detail="contract_address or transaction_hash is required"
        )

    existing_contract = db.query(models.Group).filter(
        func.lower(models.Group.contract_address) == resolved_contract_address.lower()
    ).first()
    if existing_contract:
        if existing_contract.admin_wallet.lower() != admin_wallet:
            raise HTTPException(status_code=400, detail="Grupa za ovaj smart contract već postoji")

        conflicting_group = db.query(models.Group).filter(
            models.Group.id != existing_contract.id,
            (models.Group.name == group.name) | (models.Group.access_code == group.access_code)
        ).first()
        if conflicting_group:
            raise HTTPException(status_code=400, detail="Grupa sa tim imenom ili šifrom već postoji")

        user.role = models.UserRole.ADMIN
        existing_contract.name = group.name
        existing_contract.access_code = group.access_code
        db.commit()
        db.refresh(existing_contract)
        return existing_contract

    # Da li grupa već postoji? (Po imenu ili šifri)
    existing_group = db.query(models.Group).filter(
        (models.Group.name == group.name) | (models.Group.access_code == group.access_code)
    ).first()
    if existing_group:
        raise HTTPException(status_code=400, detail="Grupa sa tim imenom ili šifrom već postoji")

    # Kad zavrsi, upisuju se u bazu
    user.role = models.UserRole.ADMIN
    new_group = models.Group(
        name=group.name,
        access_code=group.access_code,
        admin_wallet=admin_wallet,
        contract_address=resolved_contract_address
    )
    
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    return new_group


# Ruta za pridruzivanje grupi
@app.post("/join")
def join_group(
    join_data: schemas.JoinGroup,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Nađi korisnika u bazi
    user = db.query(models.User).filter(func.lower(models.User.wallet_address) == current_user["wallet_address"].lower()).first()

    # Ako je već u grupi, javi grešku 
    if user.group_id is not None:
        raise HTTPException(status_code=400, detail="Već ste član jedne grupe!")

    # Nađi grupu po šifri
    group = db.query(models.Group).filter(
        func.lower(models.Group.access_code) == join_data.access_code.lower()
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Pogrešna šifra grupe!")

    # Ubaci korisnika u grupu
    user.group_id = group.id
    db.commit()
    
    return {"message": f"Uspešno ste pristupili grupi: {group.name}",
            "contract_address": group.contract_address}


@app.get("/groups/mine", response_model=list[schemas.Group])
def get_my_groups(
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(database.get_db)
):
    if current_user["role"].lower() != "admin":
        return []

    wallet = current_user["wallet_address"].lower()
    return db.query(models.Group).filter(
        func.lower(models.Group.admin_wallet) == wallet
    ).all()


# Ruta za kreiranje teme
@app.post("/topics", response_model=schemas.Topic)
def create_topic(
    topic: schemas.TopicCreate,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Prvo moramo naći korisnika da vidimo u kojoj je grupi
    user = db.query(models.User).filter(func.lower(models.User.wallet_address) == current_user["wallet_address"].lower()).first()

    if not user.group_id:
        raise HTTPException(status_code=400, detail="Morate biti član grupe da biste predložili temu!")

    group = db.query(models.Group).filter(models.Group.id == user.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nije pronađena")

    # Count members in the group to set voters_count
    voters_count = db.query(models.User).filter(models.User.group_id == user.group_id).count()

    # Kreiraj temu
    new_topic = models.Topic(
        title=topic.title,
        description=topic.description,
        status=models.TopicStatus.PENDING, # Po defaultu čeka odobrenje
        group_id=user.group_id,
        contract_address=group.contract_address.lower() if group.contract_address else None,
        voters_count=voters_count
    )
    
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    
    return new_topic

# Ruta za uzimanje tema(iz jedne grupe)
@app.get("/topics", response_model=list[schemas.Topic])
def get_topics(
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(database.get_db)
):
    wallet = current_user["wallet_address"].lower()
    role = current_user["role"].lower()

    # Pronalazenje tema na osnovu uloge
    if role == "admin":
        owned_groups = db.query(models.Group).filter(models.Group.admin_wallet == wallet).all()
        group_ids = [g.id for g in owned_groups]
        if not group_ids:
            return []
        topics = db.query(models.Topic).filter(models.Topic.group_id.in_(group_ids)).all()
    else:
        user = db.query(models.User).filter(func.lower(models.User.wallet_address) == wallet).first()
        if not user or not user.group_id:
            return []
        topics = db.query(models.Topic).filter(models.Topic.group_id == user.group_id).all()

    group_contract_cache = {}

    # Prebrojavanje glasova za svaku temu
    for topic in topics:
        if not topic.contract_address:
            if topic.group_id not in group_contract_cache:
                group_contract_cache[topic.group_id] = db.query(models.Group.contract_address).filter(
                    models.Group.id == topic.group_id
                ).scalar()
            topic.contract_address = group_contract_cache[topic.group_id]

        yes_count = db.query(models.Vote).filter(models.Vote.topic_id == topic.id, models.Vote.decision == models.VoteOption.YES).count()
        no_count = db.query(models.Vote).filter(models.Vote.topic_id == topic.id, models.Vote.decision == models.VoteOption.NO).count()
        abstain_count = db.query(models.Vote).filter(models.Vote.topic_id == topic.id, models.Vote.decision == models.VoteOption.ABSTAIN).count()
        
        # Update topic vote counts from database
        topic.votes_yes = yes_count
        topic.votes_no = no_count
        topic.votes_abstain = abstain_count
        
        # Pakujemo rezultate u rečnik koji schemas.Topic očekuje za backward compatibility
        topic.results = {
            "yes": yes_count,
            "no": no_count,
            "abstain": abstain_count
        }

    return topics



# Ruta za menjanje statusa teme
@app.put("/topics/{topic_id}/{status}")
def update_topic_status(
    topic_id: int,
    status: str, # "active" ili "closed"
    payload: schemas.TopicStatusUpdate | None = None,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Provera da li je Admin
    if current_user["role"].lower() != "admin":
        raise HTTPException(status_code=403, detail="Samo admin menja status!")

    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Tema nije pronađena")

    # Provera da li je Admin vlasnik grupe kojoj tema pripada
    group = db.query(models.Group).filter(models.Group.id == topic.group_id).first()
    if group.admin_wallet.lower() != current_user["wallet_address"].lower():
        raise HTTPException(status_code=403, detail="Niste vlasnik ove grupe!")

    # Azuriranje statusa
    # Mapiramo string u Enum (active - ACTIVE, closed - CLOSED)
    if status == "active":
        topic.status = models.TopicStatus.ACTIVE
    elif status == "closed":
        topic.status = models.TopicStatus.CLOSED
    else:
        raise HTTPException(status_code=400, detail="Nepoznat status")

    if payload:
        if payload.on_chain_topic_id is not None:
            topic.on_chain_topic_id = payload.on_chain_topic_id
        if payload.contract_address:
            topic.contract_address = payload.contract_address.lower()
        if payload.ipfs_hash:
            topic.ipfs_hash = payload.ipfs_hash

    db.commit()
    return {"message": f"Status teme promenjen u {status}"}

# Ruta za glasanje 
@app.post("/votes")
def cast_vote(
    vote: schemas.VoteCreate,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Trazi usera
    user = db.query(models.User).filter(
        func.lower(models.User.wallet_address) == current_user["wallet_address"].lower()
    ).first()

    # Trazi temu
    topic = db.query(models.Topic).filter(models.Topic.id == vote.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Tema ne postoji")

    # Proveri da li je tema aktivna
    if topic.status != models.TopicStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Glasanje nije aktivno za ovu temu")

    # Proveri da li je korisnik vec glasao
    existing_vote = db.query(models.Vote).filter(
        models.Vote.user_id == user.id,
        models.Vote.topic_id == topic.id
    ).first()

    if existing_vote:
        raise HTTPException(status_code=400, detail="Već ste glasali na ovu temu!")

    # Map string decision to enum
    try:
        vote_option = models.VoteOption[vote.decision.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail="Nevažeća odluka. Koristi: YES, NO, ABSTAIN")

    # Na kraju upisi glas
    new_vote = models.Vote(
        decision=vote_option,
        user_id=user.id,
        topic_id=topic.id
    )
    
    db.add(new_vote)
    db.commit()
    
    return {"message": "Glas uspešno zabeležen!"}
