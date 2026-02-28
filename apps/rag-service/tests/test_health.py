import pytest


@pytest.mark.asyncio
async def test_health_returns_ok(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "providers" in data
    assert "llm" in data["providers"]
    assert "vectordb" in data["providers"]


@pytest.mark.asyncio
async def test_health_is_get_only(client):
    response = await client.post("/health")
    assert response.status_code == 405
