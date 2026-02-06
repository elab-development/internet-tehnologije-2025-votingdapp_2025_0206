from fastapi import FastAPI
from . import models, database, schemas

# Pravimo tabele(ako ne postoje)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Tabele su uspesno kreirane!"}

# Proveravamo da li FastAPI vidi semu
@app.post("/test-login", response_model=schemas.Token)
def test_login(data: schemas.UserLogin):
    return {
        "access_token": "lazni_token_za_test",
        "token_type": "bearer",
        "user_role": "user"
    }