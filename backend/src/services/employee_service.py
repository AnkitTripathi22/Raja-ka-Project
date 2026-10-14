from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src import clock
from src.repositories import employee_repository as repo
from src.repositories import leave_repository as leave_repo
from src.repositories import policy_repository as policy_repo
from src.requests.employee import ProfileUpdateRequest
from src.services import attendance_service, leave_service


def profile(employee: dict) -> dict:
    return {
        "id": employee["id"],
        "first_name": employee["first_name"],
        "last_name": employee["last_name"],
        "email": employee["email"],
        "mobile": employee["mobile"],
        "department": employee["department"],
        "designation": employee["designation"],
        "salary": employee["salary"],
        "status": employee["status"],
        "joined_on": employee["created_at"].date() if employee["created_at"] else None,
    }


def update_profile(db: Session, employee: dict, payload: ProfileUpdateRequest) -> dict:
    # Department, designation, email and salary are not self-service fields
    try:
        repo.update_profile(
            db, employee["id"], payload.first_name.strip(), payload.last_name.strip(), payload.mobile
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Mobile number is already in use",
        )
    return profile(repo.get_by_id(db, employee["id"]))


def policies(db: Session, employee: dict) -> list[dict]:
    return [
        {**policy, "scope": "department" if policy["department"] else "company"}
        for policy in policy_repo.list_for_department(db, employee["department"])
    ]


def team(db: Session, employee: dict) -> list[dict]:
    on_leave = leave_repo.on_leave_in_department(db, employee["department"], clock.today())
    return [
        {**member, "on_leave_today": member["id"] in on_leave, "is_me": member["id"] == employee["id"]}
        for member in repo.list_by_department(db, employee["department"])
    ]


def dashboard(db: Session, employee: dict) -> dict:
    leave = leave_service.overview(db, employee)
    members = team(db, employee)
    department_policies = policies(db, employee)
    return {
        "employee": profile(employee),
        "today": attendance_service.today(db, employee),
        "month": attendance_service.month_view(db, employee)["summary"],
        "leave": {
            "year": leave["year"],
            "balances": leave["balances"],
            "pending_requests": sum(1 for r in leave["requests"] if r["status"] == "pending"),
        },
        "department": {
            "name": employee["department"],
            "team_size": len(members),
            "on_leave_today": sum(1 for m in members if m["on_leave_today"]),
            "team": members,
        },
        "policies": [
            {key: p[key] for key in ("id", "title", "category", "scope", "summary")}
            for p in department_policies
        ],
    }
