"""LUNA server: отдаёт приложение, принимает синхронизацию, рассылает напоминания и запускает бота.

Запуск: uvicorn app.main:app --host 0.0.0.0 --port 80   (из папки server/)
"""
from __future__ import annotations

import asyncio
import contextlib
import logging
import mimetypes
import time
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .auth import AuthError, TgUser, validate_init_data
from .config import load_settings
from .db import Db, loads
from .reminders import due_messages, period_just_started
from . import texts

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("luna")

settings = load_settings()
db = Db(settings.data_dir / "luna.db")

luna = None
if settings.bot_token:
    from .bot import LunaBot

    luna = LunaBot(settings, db)

# Без активности в приложении две недели — не напоминаем «как ты сегодня» (без давления)
INACTIVE_SECONDS = 14 * 24 * 3600
TICK_SECONDS = 60


def _tz(name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(name or "Europe/Moscow")
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("Europe/Moscow")


async def reminders_tick() -> None:
    if not luna:
        return
    for row in db.users_with_plan():
        uid = int(row["tg_id"])
        if not luna.is_allowed(uid):
            continue
        plan, snapshot = loads(row["plan"]), loads(row["snapshot"])
        partner = db.partner(uid)
        partner_id = int(partner["partner_id"]) if partner and partner["partner_id"] and partner["enabled"] else None
        now = datetime.now(_tz(plan.get("tz")))
        day = now.date().isoformat()
        inactive = time.time() - (row["updated_at"] or 0) > INACTIVE_SECONDS
        for m in due_messages(plan, snapshot, now, partner_linked=partner_id is not None):
            if inactive and m.kind in {"checkin", "weekly"}:
                continue
            if db.was_sent(uid, m.kind, day):
                continue
            target = partner_id if m.to == "partner" else uid
            if target is None:
                continue
            result = await luna.send(target, m.text, app_button=m.with_app_button)
            if result is not None:  # отправлено или навсегда недоступно — больше не пытаемся сегодня
                db.mark_sent(uid, m.kind, day)


async def scheduler() -> None:
    while True:
        try:
            await reminders_tick()
        except Exception:
            log.exception("reminders tick failed")
        await asyncio.sleep(TICK_SECONDS)


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI):
    tasks: list[asyncio.Task] = []
    if luna:
        me = await luna.bot.get_me()
        luna.username = me.username
        log.info("bot @%s started", me.username)
        tasks.append(asyncio.create_task(luna.dp.start_polling(luna.bot, handle_signals=False)))
        tasks.append(asyncio.create_task(scheduler()))
    else:
        log.warning("BOT_TOKEN is not set — bot and reminders are disabled")
    yield
    for t in tasks:
        t.cancel()
    if luna:
        await luna.bot.session.close()


app = FastAPI(title="LUNA", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def cache_headers(request: Request, call_next):
    resp = await call_next(request)
    path = request.url.path
    if path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    elif path.startswith("/assets/"):
        resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif path in ("/", "/index.html"):
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    else:
        resp.headers.setdefault("Cache-Control", "public, max-age=86400")
    return resp


# ---------- API ----------
def current_user(authorization: str = Header(default="")) -> TgUser:
    scheme, _, init_data = authorization.partition(" ")
    if scheme.lower() != "tma":
        raise HTTPException(401, "no telegram auth")
    try:
        user = validate_init_data(init_data, settings.bot_token)
    except AuthError as e:
        raise HTTPException(401, str(e)) from e
    db.ensure_user(user.id, user.first_name)
    return user


def allowed(user_id: int) -> bool:
    return bool(luna and luna.is_allowed(user_id))


class SyncBody(BaseModel):
    snapshot: dict[str, Any]
    plan: dict[str, Any]


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "bot": bool(luna)}


@app.get("/api/me")
async def me(user: TgUser = Depends(current_user)) -> dict:
    is_allowed = allowed(user.id)
    denied = bool(luna and luna.is_denied(user.id))
    # Первое открытие приложения незнакомым аккаунтом — владелец получает запрос с кнопками
    if luna and not is_allowed and not denied:
        await luna.request_access(user.id, user.first_name, user.username)
    row = db.user(user.id)
    partner = db.partner(user.id)
    return {
        "allowed": is_allowed,
        "denied": denied,
        "pending": not is_allowed and not denied,
        "started": bool(row and row["started"]),
        "bot": luna.username if luna else None,
        "partner": {
            "linked": bool(partner and partner["partner_id"]),
            "name": partner["partner_name"] if partner else None,
            "invite": f"https://t.me/{luna.username}?start=p_{partner['invite_token']}" if partner and partner["invite_token"] and luna else None,
        },
    }


@app.post("/api/sync")
async def sync(body: SyncBody, user: TgUser = Depends(current_user)) -> dict:
    if not allowed(user.id):
        if luna:
            await luna.request_access(user.id, user.first_name, user.username)
        raise HTTPException(403, "pending approval")
    prev = db.save_sync(user.id, body.snapshot, body.plan)
    # Месячные только что отметили — мягкая подсказка партнёру (один раз)
    partner = db.partner(user.id)
    if luna and partner and partner["partner_id"] and partner["enabled"]:
        today = datetime.now(_tz(body.plan.get("tz"))).date()
        if period_just_started(prev, body.plan, today) and not db.was_sent(user.id, "p_period_started", body.plan["lastStart"]):
            name = body.plan.get("name") or user.first_name
            if await luna.send(int(partner["partner_id"]), texts.p_period_started(name)) is not None:
                db.mark_sent(user.id, "p_period_started", body.plan["lastStart"])
    return {"ok": True}


@app.post("/api/started")
def started(user: TgUser = Depends(current_user)) -> dict:
    """Пользователь разрешил боту писать (requestWriteAccess в приложении)."""
    db.set_flag(user.id, "started")
    return {"ok": True}


@app.post("/api/test")
async def test_notification(user: TgUser = Depends(current_user)) -> dict:
    if not luna or not allowed(user.id):
        raise HTTPException(403, "not allowed")
    ok = await luna.send(user.id, texts.test_message(), app_button=False)
    if ok:
        db.set_flag(user.id, "started")
    return {"ok": bool(ok)}


@app.post("/api/partner/invite")
def partner_invite(user: TgUser = Depends(current_user)) -> dict:
    if not luna or not allowed(user.id):
        raise HTTPException(403, "not allowed")
    token = db.create_invite(user.id)
    return {"invite": f"https://t.me/{luna.username}?start=p_{token}"}


@app.delete("/api/partner")
async def partner_remove(user: TgUser = Depends(current_user)) -> dict:
    partner_id = db.unlink_partner(user.id)
    if luna and partner_id:
        await luna.send(partner_id, texts.partner_unlinked())
    return {"ok": True}


@app.delete("/api/data")
async def delete_data(user: TgUser = Depends(current_user)) -> dict:
    """«Удалить все данные» в приложении — стираем и копию на сервере."""
    partner_id = db.unlink_partner(user.id)
    if luna and partner_id:
        await luna.send(partner_id, texts.partner_unlinked())
    db.delete_user_data(user.id)
    return {"ok": True}


# ---------- приложение (статика) ----------
# Явно: на некоторых системах .webp/.woff2 по умолчанию отдаются как text/plain
for _ext, _type in {".webp": "image/webp", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".js": "text/javascript", ".svg": "image/svg+xml"}.items():
    mimetypes.add_type(_type, _ext)

if settings.static_dir.exists():
    app.mount("/", StaticFiles(directory=settings.static_dir, html=True), name="static")
else:
    log.warning("static dir %s not found — only API is served", settings.static_dir)
