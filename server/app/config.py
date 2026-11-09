"""Настройки из переменных окружения (в CapRover — App Configs → Environmental Variables)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _load_dotenv() -> None:
    """Для локального запуска: читаем .env из корня проекта (на сервере переменные задаёт CapRover)."""
    env = Path(__file__).resolve().parents[2] / ".env"
    # LUNA_NO_DOTENV=1 — не читать .env (локальные проверки без настоящего бота)
    if os.environ.get("LUNA_NO_DOTENV") == "1" or not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def _ids(raw: str) -> frozenset[int]:
    return frozenset(int(x) for x in raw.replace(" ", "").split(",") if x.strip().lstrip("-").isdigit())


@dataclass(frozen=True)
class Settings:
    bot_token: str
    admin_id: int | None
    allowed_ids: frozenset[int]
    data_dir: Path
    static_dir: Path
    webapp_url: str


def load_settings() -> Settings:
    _load_dotenv()
    admin = os.environ.get("ADMIN_ID", "").strip()
    return Settings(
        bot_token=os.environ.get("BOT_TOKEN", "").strip(),
        admin_id=int(admin) if admin.lstrip("-").isdigit() else None,
        allowed_ids=_ids(os.environ.get("ALLOWED_USER_IDS", "")),
        data_dir=Path(os.environ.get("DATA_DIR", "/data")),
        static_dir=Path(os.environ.get("STATIC_DIR", Path(__file__).resolve().parents[2] / "dist")),
        webapp_url=os.environ.get("WEBAPP_URL", "").strip().rstrip("/"),
    )
