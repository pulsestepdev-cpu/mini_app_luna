import json
import tempfile
import time
from pathlib import Path

from fastapi.testclient import TestClient

from app.db import Db


def test_partner_invite_flow():
    db = Db(Path(tempfile.mkdtemp()) / "t.db")
    db.ensure_user(1, "Анна")
    token = db.create_invite(1)
    assert db.link_partner("wrong", 2, "Иван") is None
    assert db.link_partner(token, 1, "Сама себе") is None  # себя пригласить нельзя
    assert db.link_partner(token, 2, "Иван") == 1
    assert db.link_partner(token, 3, "Кто-то") is None  # ссылка одноразовая
    assert db.owner_of_partner(2) == 1
    assert db.unlink_partner(1) == 2
    assert db.owner_of_partner(2) is None


def test_sync_returns_previous_plan_and_sent_log():
    db = Db(Path(tempfile.mkdtemp()) / "t.db")
    db.ensure_user(1, "Анна")
    assert db.save_sync(1, {"a": 1}, {"lastStart": "2026-10-01"}) is None
    assert db.save_sync(1, {"a": 2}, {"lastStart": "2026-11-01"}) == {"lastStart": "2026-10-01"}
    assert not db.was_sent(1, "checkin", "2026-11-10")
    db.mark_sent(1, "checkin", "2026-11-10")
    assert db.was_sent(1, "checkin", "2026-11-10")


def test_api_requires_telegram_auth():
    from app.main import app

    c = TestClient(app)
    assert c.get("/api/health").json()["ok"] is True
    assert c.get("/api/me").status_code == 401
    assert c.get("/api/me", headers={"Authorization": "tma user=%7B%7D&hash=bad"}).status_code == 401
    assert c.post("/api/sync", json={"snapshot": {}, "plan": {}}).status_code == 401
