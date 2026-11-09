"""Тексты бота. Тон — бережный, без давления и без медицинских выводов."""
from __future__ import annotations

from datetime import date

MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"]

SYMPTOMS = {
    "swelling": "отёки", "headache": "головная боль", "fatigue": "усталость", "cramps": "спазмы",
    "bloating": "вздутие", "skin": "изменения кожи", "breast": "болезненность груди",
    "anxiety": "тревожность", "backache": "боль в спине", "nausea": "тошнота",
}
MOODS = {
    "good": "хорошее", "neutral": "спокойное", "sad": "грустное",
    "irritable": "раздражительное", "anxious": "тревожное", "sensitive": "чувствительное",
}


def d(iso: str) -> str:
    x = date.fromisoformat(iso)
    return f"{x.day} {MONTHS[x.month - 1]}"


def d_range(a: str, b: str) -> str:
    x, y = date.fromisoformat(a), date.fromisoformat(b)
    if x.month == y.month:
        return f"{x.day}–{y.day} {MONTHS[y.month - 1]}"
    return f"{d(a)} – {d(b)}"


def days(n: int) -> str:
    n10, n100 = n % 10, n % 100
    word = "день" if n10 == 1 and n100 != 11 else "дня" if 2 <= n10 <= 4 and not 12 <= n100 <= 14 else "дней"
    return f"{n} {word}"


# ---------- ей ----------
def period_soon(range_start: str, range_end: str) -> str:
    return f"🌙 Через пару дней, примерно {d_range(range_start, range_end)}, могут начаться месячные.\nХороший момент положить в сумку всё нужное ♡"


def period_today() -> str:
    return "🌙 Сегодня по прогнозу ожидаются месячные.\nЕсли начались — отметь в LUNA, так прогноз станет точнее ♡"


def late(n: int) -> str:
    return (
        f"🌙 Месячные задерживаются на {days(n)}. Так бывает — из-за стресса, перелётов, болезни.\n"
        "Если хочется разобраться, в LUNA есть статья «Задержка месячных: что делать» ♡"
    )


def pms() -> str:
    return "🌸 Ближайшие дни могут быть чувствительнее обычного — начинается ПМС-период.\nБудь мягче к себе: больше сна, тепла и тишины ♡"


def checkin() -> str:
    return "✨ Как ты сегодня? Отметь самочувствие — это займёт минутку ♡"


def weekly(logs: int, symptoms: list[str], mood: str | None) -> str:
    lines = ["📒 Твоя неделя в LUNA", f"Записей о самочувствии: {logs} из 7"]
    if symptoms:
        lines.append("Чаще всего: " + ", ".join(symptoms))
    if mood:
        lines.append(f"Настроение чаще {mood}")
    lines.append("Спасибо, что заботишься о себе ♡" if logs else "На этой неделе записей не было — ничего страшного, начнём с сегодняшнего дня ♡")
    return "\n".join(lines)


def test_message() -> str:
    return "✨ Так будут выглядеть напоминания LUNA.\nВсё работает ♡"


# ---------- партнёру ----------
def p_period_soon(name: str) -> str:
    return f"🌙 Через пару дней у {name} могут начаться месячные.\nХороший момент запастись её любимым чаем и чем-нибудь вкусным ♡"


def p_pms(name: str) -> str:
    return f"🌸 У {name} сейчас может быть ПМС-период.\nЧуть больше терпения, объятий и помощи по дому — и всё будет хорошо ♡"


def p_period_started(name: str) -> str:
    return f"🌙 У {name} начались месячные.\nТёплый плед, грелка и забота сегодня будут очень кстати ♡"


def partner_welcome(owner_name: str) -> str:
    return (
        f"Привет! {owner_name} пригласила тебя получать бережные подсказки от LUNA ♡\n\n"
        "Иногда я буду писать, когда ей может понадобиться чуть больше заботы. "
        "Никаких подробностей о здоровье — только мягкие напоминания.\n\n"
        "Отписаться можно командой /stop."
    )


def partner_linked_for_owner(partner_name: str) -> str:
    return f"♡ {partner_name} подключился к подсказкам. Отключить можно в LUNA → Уведомления."


def partner_unlinked() -> str:
    return "Подсказки LUNA отключены. Спасибо, что был рядом ♡"


def partner_left_for_owner(partner_name: str) -> str:
    return f"{partner_name} отписался от подсказок LUNA."


# ---------- служебное ----------
def welcome(name: str) -> str:
    return f"Привет{', ' + name if name else ''} ♡\nЯ — LUNA, бережный календарь цикла и самочувствия. Нажми кнопку ниже, чтобы открыть приложение."


def private_bot() -> str:
    return "Это личный бот LUNA ♡ Владелец получил твой запрос — как только он откроет доступ, я напишу."


def access_request(name: str, user_id: int, username: str | None) -> str:
    who = f"{name} (@{username})" if username else name or "Без имени"
    return f"🔔 {who} хочет пользоваться LUNA.\nID: {user_id}"


def access_granted() -> str:
    return "Доступ открыт ♡ Открой LUNA — напоминания и подсказки теперь работают."
