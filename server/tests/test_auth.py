import json
import time

import pytest

from app.auth import AuthError, sign_init_data, validate_init_data

TOKEN = "123456:TEST-token"
USER = json.dumps({"id": 42, "first_name": "Анна", "username": "anna"}, ensure_ascii=False)


def fields(**over):
    base = {"auth_date": str(int(time.time())), "query_id": "AAE", "user": USER}
    base.update(over)
    return base


def test_valid_signature():
    u = validate_init_data(sign_init_data(fields(), TOKEN), TOKEN)
    assert (u.id, u.first_name, u.username) == (42, "Анна", "anna")


def test_tampered_user_is_rejected():
    data = sign_init_data(fields(), TOKEN).replace("%22id%22%3A+42", "%22id%22%3A+43")
    with pytest.raises(AuthError):
        validate_init_data(data, TOKEN)


def test_other_bot_token_is_rejected():
    with pytest.raises(AuthError):
        validate_init_data(sign_init_data(fields(), "999:OTHER"), TOKEN)


def test_expired_session_is_rejected():
    old = fields(auth_date=str(int(time.time()) - 8 * 24 * 3600))
    with pytest.raises(AuthError, match="expired"):
        validate_init_data(sign_init_data(old, TOKEN), TOKEN)


def test_missing_hash_is_rejected():
    with pytest.raises(AuthError):
        validate_init_data("user=%7B%7D&auth_date=1", TOKEN)
