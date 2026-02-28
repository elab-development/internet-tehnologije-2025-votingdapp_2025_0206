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

# Informacije o trenutno ulogovanom korisniku, uključujući membership-e
@app.get("/me", response_model=schemas.UserDisplay)
def read_current_user(
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(func.lower(models.User.wallet_address) == current_user["wallet_address"].lower()).first()
    # Pydantic će automatski preuzeti related memberships ako ih učitamo
    return user

# Ruta za kreiranje grupe
@app.post("/groups", response_model=schemas.Group)
def create_group(
    group: schemas.GroupCreate, 
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(database.get_db)
):
    # anyone logged in may create a group; the creator becomes its admin
    wallet = current_user["wallet_address"].lower()

    existing_group = db.query(models.Group).filter(
        (models.Group.name == group.name) | (models.Group.access_code == group.access_code)
    ).first()
    if existing_group:
        raise HTTPException(status_code=400, detail="Grupa sa tim imenom ili šifrom već postoji")

    new_group = models.Group(
        name=group.name,
        access_code=group.access_code,
        admin_wallet=wallet
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    # add membership for creator with admin role
    user = db.query(models.User).filter(func.lower(models.User.wallet_address) == wallet).first()
    if user:
        membership = models.Membership(user_id=user.id, group_id=new_group.id, role=models.UserRole.ADMIN)
        db.add(membership)
        db.commit()

    return new_group

# Ruta za pridruzivanje grupi
@app.post("/join")
def join_group(
    join_data: schemas.JoinGroup,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(database.get_db)
):
    wallet = current_user["wallet_address"].lower()
    user = db.query(models.User).filter(func.lower(models.User.wallet_address) == wallet).first()

    # find group by code
    group = db.query(models.Group).filter(models.Group.access_code == join_data.access_code).first()
    if not group:
        raise HTTPException(status_code=404, detail="Pogrešna šifra grupe!")

    # check existing membership
    existing = db.query(models.Membership).filter(
        models.Membership.user_id == user.id,
        models.Membership.group_id == group.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Već ste član te grupe!")

    membership = models.Membership(user_id=user.id, group_id=group.id, role=models.UserRole.USER)
    db.add(membership)
    db.commit()

    return {"message": f"Uspešno ste pristupili grupi: {group.name}"}


# Ruta za kreiranje teme
@app.post("/topics", response_model=schemas.Topic)
def create_topic(
    topic: schemas.TopicCreate,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Prvo moramo naći korisnika da vidimo u kojoj je grupi
    user = db.query(models.User).filter(func.lower(models.User.wallet_address) == current_user["wallet_address"].lower()).first()
    # find any membership (assumes at least one group)
    membership = db.query(models.Membership).filter(models.Membership.user_id == user.id).first()
    if not membership:
        raise HTTPException(status_code=400, detail="Morate biti član grupe da biste predložili temu!")

    # Kreiraj temu in the first group the user belongs to
    new_topic = models.Topic(
        title=topic.title,
        description=topic.description,
        status=models.TopicStatus.PENDING, # Po defaultu čeka odobrenje
        group_id=membership.group_id
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

    user = db.query(models.User).filter(func.lower(models.User.wallet_address) == wallet).first()
    if not user:
        return []

    # get all groups user belongs to
    memberships = db.query(models.Membership).filter(models.Membership.user_id == user.id).all()
    group_ids = [m.group_id for m in memberships]
    if not group_ids:
        return []
    topics = db.query(models.Topic).filter(models.Topic.group_id.in_(group_ids)).all()

    # Prebrojavanje glasova za svaku temu
    for topic in topics:
        yes_count = db.query(models.Vote).filter(models.Vote.topic_id == topic.id, models.Vote.decision == "YES").count()
        no_count = db.query(models.Vote).filter(models.Vote.topic_id == topic.id, models.Vote.decision == "NO").count()
        abstain_count = db.query(models.Vote).filter(models.Vote.topic_id == topic.id, models.Vote.decision == "ABSTAIN").count()
        
        # Pakujemo rezultate u rečnik koji schemas.Topic očekuje
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
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(database.get_db)
):
    # only group-level admins may change status
    wallet = current_user["wallet_address"].lower()

    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Tema nije pronađena")

    membership = db.query(models.Membership).filter(
        models.Membership.user_id == db.query(models.User).filter(func.lower(models.User.wallet_address) == wallet).first().id,
        models.Membership.group_id == topic.group_id
    ).first()
    if not membership or membership.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Samo admin menja status!")

    # Azuriranje statusa
    # Mapiramo string u Enum (active - ACTIVE, closed - CLOSED)
    if status == "active":
        topic.status = models.TopicStatus.ACTIVE
    elif status == "closed":
        topic.status = models.TopicStatus.CLOSED
    else:
        raise HTTPException(status_code=400, detail="Nepoznat status")

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

    # Na kraju upisi glas
    new_vote = models.Vote(
        decision=vote.decision,
        user_id=user.id,
        topic_id=topic.id
    )
    
    db.add(new_vote)
    db.commit()
    
    return {"message": "Glas uspešno zabeležen!"}