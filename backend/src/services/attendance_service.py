import calendar
import csv
import io
from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src import clock
from src.repositories import attendance_repository as repo
from src.repositories import leave_repository as leave_repo

# A completed day shorter than this counts as a half day
HALF_DAY_HOURS = 4

# Longest period one report can cover
MAX_REPORT_DAYS = 366

STATUS_LABELS = {
    "present": "Present",
    "half_day": "Half day",
    "absent": "Absent",
    "leave": "On leave",
    "weekly_off": "Weekly off",
    "not_marked": "Not marked",
    "none": "",
}


def _hours(record: dict) -> float | None:
    if not record["check_in"] or not record["check_out"]:
        return None
    return round((record["check_out"] - record["check_in"]).total_seconds() / 3600, 2)


def status_of(record: dict) -> str:
    # Rows without times carry only a stored status such as "Absent" or "Leave"
    stored = record["status"].strip().lower()
    if stored in ("absent", "leave"):
        return stored
    # Marked by the admin, with or without times
    if stored == "half day":
        return "half_day"
    hours = _hours(record)
    return "half_day" if hours is not None and hours < HALF_DAY_HOURS else "present"


def public_record(record: dict | None, day: date) -> dict:
    return {
        "date": day,
        "check_in": record["check_in"] if record else None,
        "check_out": record["check_out"] if record else None,
        "hours": _hours(record) if record else None,
    }


def today(db: Session, employee: dict) -> dict:
    day = clock.today()
    record = repo.get_for_date(db, employee["id"], day)
    return {
        **public_record(record, day),
        # A day marked without times (no check-in) cannot be checked in again
        "marked": record is not None,
        "is_working_day": clock.is_working_day(day),
    }


def check_in(db: Session, employee: dict) -> dict:
    day = clock.today()
    record = repo.check_in(db, employee["id"], day, clock.now())
    if not record:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance is already marked for today",
        )
    db.commit()
    return public_record(record, day)


def check_out(db: Session, employee: dict) -> dict:
    day = clock.today()
    record = repo.check_out(db, employee["id"], day, clock.now())
    if not record:
        existing = repo.get_for_date(db, employee["id"], day)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already checked out today"
            if existing and existing["check_out"]
            else "Check in before checking out",
        )
    db.commit()
    return public_record(record, day)


def range_view(db: Session, employee: dict, first: date, last: date) -> tuple[dict, list[dict]]:
    current = clock.today()
    records = {r["work_date"]: r for r in repo.list_between(db, employee["id"], first, last)}
    leave_days = {
        day
        for leave in leave_repo.approved_between(db, employee["id"], first, last)
        for day in clock.days_between(leave["start_date"], leave["end_date"])
    }
    # Days before the employee joined are not absences
    joined = employee["created_at"].date() if employee["created_at"] else first

    days = []
    summary = {"present": 0, "half_day": 0, "leave": 0, "absent": 0, "hours": 0.0}
    for day in clock.days_between(first, last):
        record = records.get(day)
        if record:
            day_status = status_of(record)
        elif not clock.is_working_day(day):
            day_status = "weekly_off"
        elif day in leave_days:
            day_status = "leave"
        elif day > current or day < joined:
            day_status = "none"
        elif day == current:
            day_status = "not_marked"
        else:
            day_status = "absent"

        if day_status in summary:
            summary[day_status] += 1
        entry = {**public_record(record, day), "status": day_status}
        summary["hours"] += entry["hours"] or 0
        days.append(entry)

    summary["hours"] = round(summary["hours"], 2)
    return summary, days


def month_view(db: Session, employee: dict, month: str | None = None) -> dict:
    current = clock.today()
    if month:
        year, month_number = (int(part) for part in month.split("-"))
        first = date(year, month_number, 1)
    else:
        first = current.replace(day=1)
    last = first.replace(day=calendar.monthrange(first.year, first.month)[1])

    summary, days = range_view(db, employee, first, last)
    return {
        "month": first.strftime("%Y-%m"),
        "today": current,
        "today_record": today(db, employee),
        "summary": summary,
        "days": days,
    }


def report_period(start: date | None, end: date | None) -> tuple[date, date]:
    # Defaults to the current month up to today
    end = end or clock.today()
    start = start or end.replace(day=1)
    if start > end:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The start date must be on or before the end date",
        )
    if (end - start).days >= MAX_REPORT_DAYS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"A report can cover at most {MAX_REPORT_DAYS} days",
        )
    return start, end


def report(db: Session, employee: dict, start: date | None = None, end: date | None = None) -> dict:
    start, end = report_period(start, end)
    summary, days = range_view(db, employee, start, end)
    attended = summary["present"] + summary["half_day"]
    # Days the employee was expected at work: leave, weekly offs and unmarked days are left out
    expected = attended + summary["absent"]
    timed = sum(1 for day in days if day["hours"] is not None)
    return {
        "from": start,
        "to": end,
        "generated_at": clock.now(),
        "employee": {
            "id": employee["id"],
            "name": f"{employee['first_name']} {employee['last_name']}".strip(),
            "department": employee["department"],
            "designation": employee["designation"],
        },
        "summary": {
            **summary,
            "working_days": expected + summary["leave"],
            "attendance_rate": round(attended / expected * 100, 1) if expected else None,
            "average_hours": round(summary["hours"] / timed, 2) if timed else None,
        },
        "days": days,
    }


def clock_time(value: datetime | None) -> str:
    return value.astimezone(clock.APP_TIMEZONE).strftime("%H:%M") if value else ""


def report_csv(db: Session, employee: dict, start: date | None = None, end: date | None = None) -> str:
    data = report(db, employee, start, end)
    summary = data["summary"]
    rate = summary["attendance_rate"]

    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerows([
        ["Attendance report"],
        ["Employee", data["employee"]["name"]],
        ["Department", data["employee"]["department"]],
        ["Designation", data["employee"]["designation"]],
        ["Period", f"{data['from']} to {data['to']}"],
        ["Generated at", data["generated_at"].strftime("%Y-%m-%d %H:%M")],
        [],
        ["Working days", summary["working_days"]],
        ["Present", summary["present"]],
        ["Half day", summary["half_day"]],
        ["Absent", summary["absent"]],
        ["On leave", summary["leave"]],
        ["Hours worked", summary["hours"]],
        ["Attendance %", "" if rate is None else rate],
        [],
        ["Date", "Day", "Status", "Check-in", "Check-out", "Hours"],
    ])
    for day in data["days"]:
        writer.writerow([
            day["date"],
            day["date"].strftime("%A"),
            STATUS_LABELS[day["status"]],
            clock_time(day["check_in"]),
            clock_time(day["check_out"]),
            "" if day["hours"] is None else day["hours"],
        ])
    return out.getvalue()
