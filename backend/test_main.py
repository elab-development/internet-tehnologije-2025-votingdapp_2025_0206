from fastapi.testclient import TestClient
from app.main import app 

client = TestClient(app)

def test_get_topics_without_auth():
    response = client.get("/topics")

    assert response.status_code in [200, 401, 403] 
    print("Backend test uspešno komunicira sa API-jem!")