from datetime import date

from fastapi import HTTPException
from fastapi import status as status_codes
from sqlalchemy.orm import Session

from src import clock
from src.repositories import leave_repository as repo
from src.requests.employee import LeaveApplyRequest


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status_codes.HTTP_400_BAD_REQUEST, detail=detail)


def balances(db: Session, employee_id: int, year: int) -> list[dict]:
    taken = {(row["leave_type_id"], row["status"]): int(row["days"]) for row in repo.days_by_type(db, employee_id, year)}
    result = []
    for leave_type in repo.list_types(db):
        used = taken.get((leave_type["id"], "approved"), 0)
        pending = taken.get((leave_type["id"], "pending"), 0)
        result.append(
            {
                "leave_type_id": leave_type["id"],
                "name": leave_type["name"],
                "allowed": leave_type["days_per_year"],
                "used": used,
                "pending": pending,
                # Pending requests hold their days until they are decided
                "available": leave_type["days_per_year"] - used - pending,
            }
        )
    return result


def overview(db: Session, employee: dict) -> dict:
    year = clock.today().year
    return {
        "year": year,
        "balances": balances(db, employee["id"], year),
        "requests": repo.list_requests(db, employee["id"]),
    }


def create(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    start: date,
    end: date,
    reason: str,
    status: str = "pending",
    allow_past: bool = False,
) -> None:
    # Shared by an employee applying and the admin recording a leave; the caller commits
    if end < start:
        raise _bad_request("End date cannot be before the start date")
    if not allow_past and start < clock.today():
        raise _bad_request("Leave cannot start in the past")
    if start.year != end.year:
        raise _bad_request("Leave cannot span two calendar years; apply separately for each year")

    leave_type = repo.get_type(db, leave_type_id)
    if not leave_type:
        raise _bad_request("Unknown leave type")

    days = clock.working_days(start, end)
    if days == 0:
        raise _bad_request("The selected dates contain no working days")

    if repo.has_overlap(db, employee_id, start, end):
        raise HTTPException(
            status_code=status_codes.HTTP_409_CONFLICT,
            detail="A leave request already exists for these dates",
        )

    balance = next(b for b in balances(db, employee_id, start.year) if b["leave_type_id"] == leave_type["id"])
    if days > balance["available"]:
        raise _bad_request(
            f"Only {balance['available']} day(s) of {leave_type['name']} available, {days} requested"
        )

    repo.create_request(db, employee_id, leave_type["id"], start, end, days, reason, status)


def apply(db: Session, employee: dict, payload: LeaveApplyRequest) -> dict:
    create(db, employee["id"], payload.leave_type_id, payload.start_date, payload.end_date, payload.reason.strip())
    db.commit()
    return overview(db, employee)


def cancel(db: Session, employee: dict, request_id: int) -> dict:
    if not repo.cancel_request(db, employee["id"], request_id):
        raise HTTPException(
            status_code=status_codes.HTTP_404_NOT_FOUND,
            detail="No pending leave request found to cancel",
        )
    db.commit()
    return overview(db, employee)
