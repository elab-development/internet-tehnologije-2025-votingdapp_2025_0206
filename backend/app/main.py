from fastapi import FastAPI
from . import models, database

# Pravimo tabele(ako ne postoje)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Tabele su uspesno kreirane!"}