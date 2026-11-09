"""Проверка Telegram initData — подписи, которую Telegram добавляет к мини-приложению.

https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
Без валидной подписи сервер не верит ни одному полю (в том числе id пользователя).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl

# initData выдаётся на всю сессию мини-приложения; приложение может долго висеть открытым
MAX_AGE_SECONDS = 7 * 24 * 3600


class AuthError(Exception):
    pass


@dataclass(frozen=True)
class TgUser:
    id: int
    first_name: str
    username: str | None


def validate_init_data(init_data: str, bot_token: str, now: float | None = None) -> TgUser:
    if not init_data or not bot_token:
        raise AuthError("no init data")
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received = pairs.pop("hash", None)
    if not received:
        raise AuthError("no hash")
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received):
        raise AuthError("bad signature")
    auth_date = int(pairs.get("auth_date", "0") or 0)
    if (now or time.time()) - auth_date > MAX_AGE_SECONDS:
        raise AuthError("expired")
    try:
        user = json.loads(pairs["user"])
        return TgUser(id=int(user["id"]), first_name=str(user.get("first_name", "")), username=user.get("username"))
    except (KeyError, ValueError, TypeError) as e:
        raise AuthError("no user") from e


def sign_init_data(fields: dict[str, str], bot_token: str) -> str:
    """Для тестов: собрать initData с правильной подписью."""
    from urllib.parse import urlencode

    check_string = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    digest = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    return urlencode({**fields, "hash": digest})
