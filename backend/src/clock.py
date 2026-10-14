import os
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

load_dotenv()

# "Today" for attendance and leave is the office's day, not the server's
APP_TIMEZONE = ZoneInfo(os.getenv("APP_TIMEZONE", "Asia/Kolkata"))

# date.weekday(): Monday = 0 ... Sunday = 6
WEEKLY_OFF = {5, 6}


def now() -> datetime:
    return datetime.now(APP_TIMEZONE)


def today() -> date:
    return now().date()


def is_working_day(day: date) -> bool:
    return day.weekday() not in WEEKLY_OFF


def days_between(start: date, end: date) -> list[date]:
    return [start + timedelta(days=i) for i in range((end - start).days + 1)]


def working_days(start: date, end: date) -> int:
    return sum(1 for day in days_between(start, end) if is_working_day(day))
