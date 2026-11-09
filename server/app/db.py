"""SQLite в постоянной папке (/data в CapRover). Нагрузка — один-два человека, поэтому
простой sqlite3 с блокировкой, без ORM."""
from __future__ import annotations

import json
import secrets
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  tg_id INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  approved INTEGER NOT NULL DEFAULT 0,      -- одобрен владельцем через бота
  requested INTEGER NOT NULL DEFAULT 0,     -- запрос на доступ уже отправлен админу
  denied INTEGER NOT NULL DEFAULT 0,        -- владелец закрыл доступ
  started INTEGER NOT NULL DEFAULT 0,       -- писал боту / разрешил сообщения
  snapshot TEXT,                            -- данные приложения (JSON)
  plan TEXT,                                -- расписание напоминаний, посчитанное приложением (JSON)
  updated_at REAL
);
CREATE TABLE IF NOT EXISTS partners (
  owner_id INTEGER PRIMARY KEY,
  invite_token TEXT UNIQUE,
  partner_id INTEGER,
  partner_name TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  linked_at REAL
);
CREATE TABLE IF NOT EXISTS sent (
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (user_id, kind, day)
);
"""


class Db:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.executescript(SCHEMA)
            # Миграции для баз, созданных раньше
            cols = {r[1] for r in self._conn.execute("PRAGMA table_info(users)")}
            if "denied" not in cols:
                self._conn.execute("ALTER TABLE users ADD COLUMN denied INTEGER NOT NULL DEFAULT 0")
            self._conn.commit()

    def _exec(self, sql: str, args: tuple = ()) -> sqlite3.Cursor:
        with self._lock:
            cur = self._conn.execute(sql, args)
            self._conn.commit()
            return cur

    def _one(self, sql: str, args: tuple = ()) -> sqlite3.Row | None:
        with self._lock:
            return self._conn.execute(sql, args).fetchone()

    def _all(self, sql: str, args: tuple = ()) -> list[sqlite3.Row]:
        with self._lock:
            return self._conn.execute(sql, args).fetchall()

    # ---------- пользователи ----------
    def ensure_user(self, tg_id: int, first_name: str = "") -> None:
        self._exec(
            "INSERT INTO users (tg_id, first_name) VALUES (?, ?) "
            "ON CONFLICT(tg_id) DO UPDATE SET first_name = CASE WHEN excluded.first_name != '' THEN excluded.first_name ELSE first_name END",
            (tg_id, first_name),
        )

    def user(self, tg_id: int) -> sqlite3.Row | None:
        return self._one("SELECT * FROM users WHERE tg_id = ?", (tg_id,))

    def set_flag(self, tg_id: int, flag: str, value: bool = True) -> None:
        assert flag in {"approved", "requested", "started", "denied"}
        self.ensure_user(tg_id)
        self._exec(f"UPDATE users SET {flag} = ? WHERE tg_id = ?", (int(value), tg_id))

    def save_sync(self, tg_id: int, snapshot: dict, plan: dict) -> dict | None:
        """Сохраняет данные и возвращает предыдущий план (чтобы заметить начало месячных)."""
        row = self.user(tg_id)
        prev = json.loads(row["plan"]) if row and row["plan"] else None
        self._exec(
            "UPDATE users SET snapshot = ?, plan = ?, updated_at = ? WHERE tg_id = ?",
            (json.dumps(snapshot, ensure_ascii=False), json.dumps(plan, ensure_ascii=False), time.time(), tg_id),
        )
        return prev

    def set_access(self, tg_id: int, allowed: bool) -> None:
        self.ensure_user(tg_id)
        self._exec("UPDATE users SET approved = ?, denied = ?, requested = 1 WHERE tg_id = ?", (int(allowed), int(not allowed), tg_id))

    def all_users(self) -> list[sqlite3.Row]:
        return self._all("SELECT * FROM users ORDER BY updated_at DESC, tg_id")

    def users_with_plan(self) -> list[sqlite3.Row]:
        return self._all("SELECT * FROM users WHERE plan IS NOT NULL")

    # ---------- партнёр ----------
    def partner(self, owner_id: int) -> sqlite3.Row | None:
        return self._one("SELECT * FROM partners WHERE owner_id = ?", (owner_id,))

    def create_invite(self, owner_id: int) -> str:
        token = secrets.token_urlsafe(12).replace("-", "").replace("_", "")[:16]
        self._exec(
            "INSERT INTO partners (owner_id, invite_token, enabled) VALUES (?, ?, 1) "
            "ON CONFLICT(owner_id) DO UPDATE SET invite_token = excluded.invite_token, enabled = 1",
            (owner_id, token),
        )
        return token

    def link_partner(self, token: str, partner_id: int, partner_name: str) -> int | None:
        row = self._one("SELECT owner_id FROM partners WHERE invite_token = ?", (token,))
        if not row or row["owner_id"] == partner_id:
            return None
        self._exec(
            "UPDATE partners SET partner_id = ?, partner_name = ?, linked_at = ?, enabled = 1, invite_token = NULL WHERE owner_id = ?",
            (partner_id, partner_name, time.time(), row["owner_id"]),
        )
        return int(row["owner_id"])

    def unlink_partner(self, owner_id: int) -> int | None:
        row = self.partner(owner_id)
        self._exec("DELETE FROM partners WHERE owner_id = ?", (owner_id,))
        return int(row["partner_id"]) if row and row["partner_id"] else None

    def owner_of_partner(self, partner_id: int) -> int | None:
        row = self._one("SELECT owner_id FROM partners WHERE partner_id = ?", (partner_id,))
        return int(row["owner_id"]) if row else None

    # ---------- журнал отправленного ----------
    def was_sent(self, user_id: int, kind: str, day: str) -> bool:
        return self._one("SELECT 1 FROM sent WHERE user_id = ? AND kind = ? AND day = ?", (user_id, kind, day)) is not None

    def mark_sent(self, user_id: int, kind: str, day: str) -> None:
        self._exec("INSERT OR IGNORE INTO sent (user_id, kind, day) VALUES (?, ?, ?)", (user_id, kind, day))

    def delete_user_data(self, tg_id: int) -> None:
        self._exec("UPDATE users SET snapshot = NULL, plan = NULL WHERE tg_id = ?", (tg_id,))
        self._exec("DELETE FROM partners WHERE owner_id = ?", (tg_id,))


def loads(raw: Any) -> dict:
    return json.loads(raw) if raw else {}
