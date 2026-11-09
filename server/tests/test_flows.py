"""Сценарии API целиком — с подставным ботом (без сети и реальных сообщений)."""
import asyncio
import json
import time
from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.auth import sign_init_data

TOKEN = "123456:TEST"
OWNER, STRANGER, PARTNER = 100, 200, 300


class FakeLuna:
    username = "luna_tracker_bot"

    def __init__(self, allowed: set[int]):
        self.allowed = allowed
        self.sent: list[tuple[int, str]] = []
        self.requests: list[int] = []

    def is_allowed(self, uid: int) -> bool:
        return uid in self.allowed

    async def request_access(self, uid, name, username):
        self.requests.append(uid)

    async def send(self, chat_id, text, app_button=False, markup=None):
        self.sent.append((chat_id, text))
        return True


@pytest.fixture
def client(monkeypatch):
    fake = FakeLuna({OWNER})
    monkeypatch.setattr(main, "luna", fake)
    monkeypatch.setattr(main, "settings", main.settings.__class__(**{**main.settings.__dict__, "bot_token": TOKEN}))
    return TestClient(main.app), fake


def auth(uid: int, name: str = "Анна") -> dict:
    user = json.dumps({"id": uid, "first_name": name}, ensure_ascii=False)
    return {"Authorization": "tma " + sign_init_data({"auth_date": str(int(time.time())), "user": user}, TOKEN)}


def plan(last_start: str) -> dict:
    return {
        "v": 1, "tz": "Europe/Moscow", "time": "09:00", "name": "Анна",
        "settings": {"periodReminder": True, "symptomReminder": True, "tips": False, "weeklyReport": True},
        "lastStart": last_start, "nextStart": "2026-12-20", "rangeStart": "2026-12-18", "rangeEnd": "2026-12-22",
        "pmsStart": "2026-12-15", "lastLogDate": None,
    }


def test_stranger_is_not_synced_and_owner_is_asked(client):
    c, fake = client
    r = c.post("/api/sync", json={"snapshot": {}, "plan": plan("2026-11-01")}, headers=auth(STRANGER, "Незнакомка"))
    assert r.status_code == 403
    assert fake.requests == [STRANGER]
    assert c.get("/api/me", headers=auth(STRANGER)).json()["allowed"] is False


def test_owner_sync_partner_invite_and_period_hint(client):
    c, fake = client
    today = datetime.now(main._tz("Europe/Moscow")).date().isoformat()
    assert c.post("/api/sync", json={"snapshot": {"logs": {}}, "plan": plan("2026-10-01")}, headers=auth(OWNER)).status_code == 200

    invite = c.post("/api/partner/invite", headers=auth(OWNER)).json()["invite"]
    assert invite.startswith("https://t.me/luna_tracker_bot?start=p_")
    token = invite.split("p_", 1)[1]
    assert main.db.link_partner(token, PARTNER, "Иван") == OWNER
    me = c.get("/api/me", headers=auth(OWNER)).json()
    assert me["partner"] == {"linked": True, "name": "Иван", "invite": None}

    # Отметила начало месячных сегодня → партнёр получает одну мягкую подсказку
    c.post("/api/sync", json={"snapshot": {}, "plan": plan(today)}, headers=auth(OWNER))
    c.post("/api/sync", json={"snapshot": {}, "plan": plan(today)}, headers=auth(OWNER))
    hints = [t for chat, t in fake.sent if chat == PARTNER]
    assert len(hints) == 1 and "начались месячные" in hints[0]

    # Отключение: партнёр получает прощальное сообщение
    c.delete("/api/partner", headers=auth(OWNER))
    assert "отключены" in fake.sent[-1][1]
    assert main.db.owner_of_partner(PARTNER) is None


def test_scheduler_sends_once_per_day(client, monkeypatch):
    c, fake = client
    c.post("/api/sync", json={"snapshot": {"logs": {}}, "plan": plan("2026-11-01")}, headers=auth(OWNER))
    fake.sent.clear()

    class Frozen(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 11, 18, 10, 0, tzinfo=tz)  # среда, 10:00 — пора «как ты сегодня?»

    monkeypatch.setattr(main, "datetime", Frozen)
    asyncio.run(main.reminders_tick())
    asyncio.run(main.reminders_tick())
    checkins = [t for chat, t in fake.sent if chat == OWNER and "Как ты сегодня" in t]
    assert len(checkins) == 1


def test_delete_data_clears_server_copy(client):
    c, _ = client
    c.post("/api/sync", json={"snapshot": {"logs": {"2026-11-01": {}}}, "plan": plan("2026-11-01")}, headers=auth(OWNER))
    assert c.delete("/api/data", headers=auth(OWNER)).status_code == 200
    row = main.db.user(OWNER)
    assert row["snapshot"] is None and row["plan"] is None
