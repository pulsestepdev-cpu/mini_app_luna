"""Какие сообщения пора отправить — чистая функция, без бота и базы.

Прогноз считает само приложение (тот же движок, что показывает календарь) и присылает
серверу «план». Сервер только решает, в какой день и час что отправить — в часовом
поясе пользователя, не раньше выбранного времени и не больше одного раза.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Literal

from . import texts

To = Literal["owner", "partner"]


@dataclass(frozen=True)
class Message:
    kind: str
    to: To
    text: str
    with_app_button: bool = False


def _d(iso: str | None) -> date | None:
    return date.fromisoformat(iso) if iso else None


def _remind_time(plan: dict) -> time:
    try:
        h, m = (int(x) for x in str(plan.get("time", "09:00")).split(":"))
        return time(h, m)
    except ValueError:
        return time(9, 0)


def weekly_summary(snapshot: dict, today: date) -> str:
    logs = snapshot.get("logs") or {}
    week = [logs[k] for k in logs if today - timedelta(days=6) <= date.fromisoformat(k) <= today]
    sym = Counter(s for log in week for s in (log.get("symptoms") or []))
    mood = Counter(log.get("mood") for log in week if log.get("mood"))
    top = [texts.SYMPTOMS.get(k, k) for k, _ in sym.most_common(3)]
    m = texts.MOODS.get(mood.most_common(1)[0][0]) if mood else None
    return texts.weekly(len(week), top, m)


def due_messages(plan: dict, snapshot: dict, now: datetime, partner_linked: bool) -> list[Message]:
    """Сообщения на сегодня (локальная дата now), если уже наступило время напоминаний."""
    if now.time() < _remind_time(plan):
        return []
    today = now.date()
    s = plan.get("settings") or {}
    name = plan.get("name") or "твоей девушки"
    out: list[Message] = []

    last_start = _d(plan.get("lastStart"))
    next_start = _d(plan.get("nextStart"))
    range_start = _d(plan.get("rangeStart"))
    pms_start = _d(plan.get("pmsStart"))
    # Месячные ещё не начались в этом цикле (после последнего начала прошло больше недели)
    not_started = last_start is None or (today - last_start).days > 7

    if next_start and range_start and not_started:
        if today == range_start - timedelta(days=2):
            if s.get("periodReminder", True):
                out.append(Message("period_soon", "owner", texts.period_soon(plan["rangeStart"], plan["rangeEnd"]), True))
            if partner_linked:
                out.append(Message("p_period_soon", "partner", texts.p_period_soon(name)))
        if today == next_start and s.get("periodReminder", True):
            out.append(Message("period_today", "owner", texts.period_today(), True))
        if today == next_start + timedelta(days=3) and s.get("periodReminder", True):
            out.append(Message("late", "owner", texts.late(3), True))

    if pms_start and today == pms_start and not_started:
        if s.get("tips", False):
            out.append(Message("pms", "owner", texts.pms(), True))
        if partner_linked:
            out.append(Message("p_pms", "partner", texts.p_pms(name)))

    if s.get("symptomReminder", True) and plan.get("lastLogDate") != today.isoformat():
        out.append(Message("checkin", "owner", texts.checkin(), True))

    if s.get("weeklyReport", True) and today.weekday() == 6:  # воскресенье
        out.append(Message("weekly", "owner", weekly_summary(snapshot, today), True))

    return out


def period_just_started(prev_plan: dict | None, plan: dict, today: date) -> bool:
    """Месячные только что отметили (новое начало цикла, сегодня или вчера) — для подсказки партнёру."""
    new = _d(plan.get("lastStart"))
    old = _d((prev_plan or {}).get("lastStart"))
    return bool(new and (old is None or new > old) and 0 <= (today - new).days <= 1)
