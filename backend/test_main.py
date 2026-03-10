import os

# Ubacujemo lažne varijable za bazu pre učitavanja
os.environ["DATABASE_URL"] = "sqlite:///./testbaza.db"
os.environ["SECRET_KEY"] = "super_tajna_sifra_za_test"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_topics_route_protected():
    "Testiranje bezbednosti - blokiranje neulogovanih korisnika (Status 401)"
    # Pokušavamo da dohvatimo teme bez JWT tokena
    response = client.get("/topics")
    # Aplikacija ispravno prepoznaje da nismo ulogovani i blokira pristup
    assert response.status_code == 401

def test_me_route_protected():
    "Testiranje bezbednosti - pristup tuđem profilu (Status 401)"
    response = client.get("/me")
    assert response.status_code == 401

def test_login_validation_error():
    "3. Testiranje Pydantic validacije (Status 422)"
    # Simuliramo POST zahtev sa praznim/pogrešnim telom umesto adrese novčanika
    response = client.post("/login", json={"pogresno_polje": "123"})
    assert response.status_code == 422