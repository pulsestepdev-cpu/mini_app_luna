"""Логика доступа на настоящем классе бота (без сети: aiogram не ходит в Telegram при создании)."""
import sqlite3
import tempfile
from pathlib import Path

from app.bot import LunaBot
from app.config import Settings
from app.db import Db

ADMIN, WIFE, ENV_FRIEND, STRANGER = 1, 2, 3, 4


def make(allowed=frozenset({ENV_FRIEND})):
    db = Db(Path(tempfile.mkdtemp()) / "t.db")
    s = Settings(bot_token="123456:ABCDEF", admin_id=ADMIN, allowed_ids=allowed, data_dir=Path("."), static_dir=Path("."), webapp_url="")
    return LunaBot(s, db), db


def test_admin_always_allowed_and_never_denied():
    bot, db = make()
    db.set_access(ADMIN, False)
    assert bot.is_allowed(ADMIN) and not bot.is_denied(ADMIN)


def test_approve_and_block_and_change_mind():
    bot, db = make()
    assert not bot.is_allowed(WIFE)
    db.set_access(WIFE, True)
    assert bot.is_allowed(WIFE)
    db.set_access(WIFE, False)
    assert not bot.is_allowed(WIFE) and bot.is_denied(WIFE)
    db.set_access(WIFE, True)
    assert bot.is_allowed(WIFE) and not bot.is_denied(WIFE)


def test_block_overrides_env_list():
    bot, db = make()
    assert bot.is_allowed(ENV_FRIEND)
    db.set_access(ENV_FRIEND, False)
    assert not bot.is_allowed(ENV_FRIEND)


def test_users_keyboard_lists_everyone_but_admin():
    bot, db = make()
    db.ensure_user(ADMIN, "Я")
    db.ensure_user(WIFE, "Анна")
    db.set_access(STRANGER, False)
    labels = [row[0].text for row in bot.users_keyboard().inline_keyboard]
    assert any("Анна" in x and "разрешить" in x for x in labels)
    assert not any("Я —" in x for x in labels)
    assert len(labels) == 2


def test_migration_adds_denied_column_to_old_db():
    path = Path(tempfile.mkdtemp()) / "old.db"
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE users (tg_id INTEGER PRIMARY KEY, first_name TEXT NOT NULL DEFAULT '', approved INTEGER NOT NULL DEFAULT 0, requested INTEGER NOT NULL DEFAULT 0, started INTEGER NOT NULL DEFAULT 0, snapshot TEXT, plan TEXT, updated_at REAL)")
    con.execute("INSERT INTO users (tg_id, first_name, approved) VALUES (2, 'Анна', 1)")
    con.commit()
    con.close()
    db = Db(path)
    row = db.user(2)
    assert row["approved"] == 1 and row["denied"] == 0
