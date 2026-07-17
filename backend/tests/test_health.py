import os
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient


def test_health():
    with patch("db.init_db", new=AsyncMock()), \
         patch("collectors.prometheus.collect_and_store_all", new=AsyncMock()), \
         patch("apscheduler.schedulers.asyncio.AsyncIOScheduler.start"), \
         patch("apscheduler.schedulers.asyncio.AsyncIOScheduler.shutdown"):
        from main import app
        client = TestClient(app)
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
