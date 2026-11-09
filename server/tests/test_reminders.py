from datetime import date, datetime

from app.reminders import due_messages, period_just_started, weekly_summary

# Цикл: последние месячные 1 ноября, следующие ~29 ноября (диапазон 27 нояб – 1 дек), ПМС с 24 ноября
PLAN = {
    "v": 1, "tz": "Europe/Moscow", "time": "09:00", "name": "Анна",
    "settings": {"periodReminder": True, "symptomReminder": True, "tips": True, "weeklyReport": True},
    "lastStart": "2026-11-01", "nextStart": "2026-11-29", "rangeStart": "2026-11-27", "rangeEnd": "2026-12-01",
    "pmsStart": "2026-11-24", "lastLogDate": None,
}


def kinds(day: str, hour: int = 10, plan=PLAN, partner=False, snapshot=None):
    y, m, d = (int(x) for x in day.split("-"))
    return sorted(x.kind for x in due_messages(plan, snapshot or {}, datetime(y, m, d, hour), partner))


def test_nothing_before_reminder_time():
    assert kinds("2026-11-25", hour=8) == []


def test_period_soon_two_days_before_range():
    assert "period_soon" in kinds("2026-11-25")
    assert "period_soon" not in kinds("2026-11-26")


def test_period_today_and_late():
    assert "period_today" in kinds("2026-11-29")
    assert "late" in kinds("2026-12-02")


def test_no_period_reminders_after_period_started():
    started = {**PLAN, "lastStart": "2026-11-26"}
    assert "period_today" not in kinds("2026-11-29", plan=started)
    assert "late" not in kinds("2026-12-02", plan=started)


def test_pms_tip_respects_setting():
    assert "pms" in kinds("2026-11-24")
    no_tips = {**PLAN, "settings": {**PLAN["settings"], "tips": False}}
    assert "pms" not in kinds("2026-11-24", plan=no_tips)


def test_checkin_only_if_not_logged_today():
    assert "checkin" in kinds("2026-11-10")
    logged = {**PLAN, "lastLogDate": "2026-11-10"}
    assert "checkin" not in kinds("2026-11-10", plan=logged)


def test_period_reminders_can_be_turned_off():
    off = {**PLAN, "settings": {**PLAN["settings"], "periodReminder": False}}
    assert not {"period_soon", "period_today", "late"} & set(kinds("2026-11-25", plan=off) + kinds("2026-11-29", plan=off))


def test_partner_gets_only_gentle_hints():
    assert "p_period_soon" in kinds("2026-11-25", partner=True)
    assert "p_pms" in kinds("2026-11-24", partner=True)
    assert not [k for k in kinds("2026-11-25") if k.startswith("p_")]  # без партнёра — ничего


def test_weekly_report_on_sunday():
    snap = {"logs": {"2026-11-13": {"symptoms": ["fatigue", "swelling"], "mood": "good"}, "2026-11-14": {"symptoms": ["fatigue"], "mood": "good"}}}
    assert "weekly" in kinds("2026-11-15", snapshot=snap)  # 15 ноября 2026 — воскресенье
    assert "weekly" not in kinds("2026-11-14", snapshot=snap)
    text = weekly_summary(snap, date(2026, 11, 15))
    assert "2 из 7" in text and "усталость" in text and "хорошее" in text


def test_period_just_started():
    prev = {"lastStart": "2026-10-04"}
    assert period_just_started(prev, {"lastStart": "2026-11-01"}, date(2026, 11, 1))
    assert period_just_started(prev, {"lastStart": "2026-11-01"}, date(2026, 11, 2))
    assert not period_just_started(prev, {"lastStart": "2026-11-01"}, date(2026, 11, 5))  # отметила задним числом
    assert not period_just_started({"lastStart": "2026-11-01"}, {"lastStart": "2026-11-01"}, date(2026, 11, 1))
