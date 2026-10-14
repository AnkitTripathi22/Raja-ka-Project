import csv
import io
from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src import clock
from src.repositories import attendance_repository as attendance_repo
from src.repositories import employee_repository as employee_repo
from src.repositories import leave_repository as leave_repo
from src.repositories import policy_repository as policy_repo
from src.repositories import user_repository as user_repo
from src.requests.admin import (
    AttendanceSaveRequest,
    EmployeeSaveRequest,
    LeaveRecordRequest,
    LeaveTypeRequest,
    PolicyRequest,
)
from src.services import attendance_service, leave_service

# What the attendance table stores for each status the admin can mark
STORED_STATUS = {"present": "Present", "half_day": "Half Day", "absent": "Absent"}


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _not_found(what: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{what} not found")


def _name(employee: dict) -> str:
    return f"{employee['first_name']} {employee['last_name']}".strip()


def _employee(db: Session, employee_id: int) -> dict:
    employee = employee_repo.get_by_id(db, employee_id)
    if not employee:
        raise _not_found("Employee")
    return employee


# Employees

def _public_employee(employee: dict) -> dict:
    return {
        "id": employee["id"],
        "first_name": employee["first_name"],
        "last_name": employee["last_name"],
        "name": _name(employee),
        "email": employee["email"],
        "mobile": employee["mobile"],
        "department": employee["department"],
        "designation": employee["designation"],
        "salary": employee["salary"],
        "is_active": employee["status"] is not False,
        "joined_on": employee["created_at"].date() if employee["created_at"] else None,
    }


def employees(db: Session) -> list[dict]:
    return [_public_employee(employee) for employee in employee_repo.list_all(db)]


def _employee_values(payload: EmployeeSaveRequest) -> dict:
    return {
        "first_name": payload.first_name.strip(),
        "last_name": payload.last_name.strip(),
        # Emails are stored in lowercase because the unique constraints are case-sensitive
        "email": payload.email.strip().lower() if payload.email else None,
        "mobile": payload.mobile or None,
        "department": payload.department.strip(),
        "designation": payload.designation.strip(),
        "salary": payload.salary,
    }


def _save_employee(db: Session, save) -> None:
    try:
        save()
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or mobile is already used by another employee",
        )


def create_employee(db: Session, payload: EmployeeSaveRequest) -> list[dict]:
    values = _employee_values(payload)

    def save():
        employee_id = employee_repo.create_employee(db, **values)
        if not payload.is_active or payload.joined_on:
            employee_repo.update_employee(
                db, employee_id, **values, is_active=payload.is_active, joined_on=payload.joined_on
            )

    _save_employee(db, save)
    return employees(db)


def update_employee(db: Session, employee_id: int, payload: EmployeeSaveRequest) -> list[dict]:
    employee = _employee(db, employee_id)
    values = _employee_values(payload)

    def save():
        employee_repo.update_employee(
            db, employee_id, **values, is_active=payload.is_active, joined_on=payload.joined_on
        )
        # A login is linked to its employee by email, so it follows the change
        if employee["email"] and values["email"] and employee["email"].lower() != values["email"]:
            user_repo.change_email(db, employee["email"], values["email"])

    _save_employee(db, save)
    return employees(db)


# Attendance

def attendance_sheet(db: Session, day: date | None = None) -> dict:
    day = day or clock.today()
    records = {record["employee_id"]: record for record in attendance_repo.list_for_date(db, day)}
    on_leave = leave_repo.on_leave_on(db, day)
    working_day = clock.is_working_day(day)

    rows = []
    summary = {"present": 0, "half_day": 0, "absent": 0, "leave": 0, "not_marked": 0}
    for employee in employee_repo.list_all(db, active_only=True):
        record = records.get(employee["id"])
        if record:
            day_status = attendance_service.status_of(record)
        elif employee["id"] in on_leave:
            day_status = "leave"
        elif not working_day:
            day_status = "weekly_off"
        else:
            day_status = "not_marked"

        if day_status in summary:
            summary[day_status] += 1
        rows.append({
            "employee_id": employee["id"],
            "name": _name(employee),
            "designation": employee["designation"],
            "status": day_status,
            # False when the status comes from a leave or the calendar, not from a record
            "marked": record is not None,
            "check_in": attendance_service.clock_time(record["check_in"]) if record else "",
            "check_out": attendance_service.clock_time(record["check_out"]) if record else "",
            "hours": attendance_service.public_record(record, day)["hours"] if record else None,
            "remarks": (record["remarks"] or "") if record else "",
        })

    return {
        "date": day,
        "today": clock.today(),
        "is_working_day": working_day,
        "summary": summary,
        "rows": rows,
    }


def save_attendance(db: Session, payload: AttendanceSaveRequest) -> dict:
    day = payload.date
    if day > clock.today():
        raise _bad_request("Attendance cannot be marked for a future date")

    known = {employee["id"] for employee in employee_repo.list_all(db)}
    for entry in payload.entries:
        if entry.employee_id not in known:
            raise _not_found("Employee")
        if entry.status == "unmarked":
            attendance_repo.delete_for_date(db, entry.employee_id, day)
            continue

        check_in = check_out = None
        if entry.status != "absent":
            if entry.check_out and not entry.check_in:
                raise _bad_request("Enter the check-in time before the check-out time")
            if entry.check_in and entry.check_out and entry.check_out <= entry.check_in:
                raise _bad_request("Check-out must be after check-in")
            # The admin types office time
            if entry.check_in:
                check_in = datetime.combine(day, entry.check_in, clock.APP_TIMEZONE)
            if entry.check_out:
                check_out = datetime.combine(day, entry.check_out, clock.APP_TIMEZONE)

        attendance_repo.upsert(
            db,
            entry.employee_id,
            day,
            STORED_STATUS[entry.status],
            check_in,
            check_out,
            (entry.remarks or "").strip() or None,
        )

    db.commit()
    return attendance_sheet(db, day)


# Leave

def leave_overview(db: Session) -> dict:
    year = clock.today().year
    return {
        "year": year,
        "types": leave_repo.list_types(db),
        "requests": leave_repo.list_all_requests(db),
        "employees": [
            {
                "employee_id": employee["id"],
                "name": _name(employee),
                "balances": leave_service.balances(db, employee["id"], year),
            }
            for employee in employee_repo.list_all(db, active_only=True)
        ],
    }


def _leave_approved(db: Session, employee_id: int, start: date, end: date) -> None:
    # Days already marked absent inside an approved leave become leave days
    attendance_repo.delete_absent_between(db, employee_id, start, end)


def record_leave(db: Session, payload: LeaveRecordRequest) -> dict:
    # Recorded by the admin, so it needs no approval and may be in the past
    employee = _employee(db, payload.employee_id)
    leave_service.create(
        db,
        employee["id"],
        payload.leave_type_id,
        payload.start_date,
        payload.end_date,
        payload.reason.strip() or "Recorded by admin",
        status="approved",
        allow_past=True,
    )
    _leave_approved(db, employee["id"], payload.start_date, payload.end_date)
    db.commit()
    return leave_overview(db)


# action -> (statuses it applies to, resulting status)
LEAVE_ACTIONS = {
    "approve": (["pending"], "approved"),
    "reject": (["pending"], "rejected"),
    "cancel": (["pending", "approved"], "cancelled"),
}


def decide_leave(db: Session, request_id: int, action: str) -> dict:
    from_statuses, new_status = LEAVE_ACTIONS[action]
    request = leave_repo.set_status(db, request_id, from_statuses, new_status)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No leave request found to {action}",
        )
    if new_status == "approved":
        _leave_approved(db, request["employee_id"], request["start_date"], request["end_date"])
    db.commit()
    return leave_overview(db)


def _save_leave_type(db: Session, save) -> dict:
    try:
        found = save()
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A leave type with this name already exists",
        )
    if not found:
        raise _not_found("Leave type")
    return leave_overview(db)


def create_leave_type(db: Session, payload: LeaveTypeRequest) -> dict:
    return _save_leave_type(db, lambda: leave_repo.create_type(db, payload.name.strip(), payload.days_per_year))


def update_leave_type(db: Session, leave_type_id: int, payload: LeaveTypeRequest) -> dict:
    return _save_leave_type(
        db, lambda: leave_repo.update_type(db, leave_type_id, payload.name.strip(), payload.days_per_year)
    )


def delete_leave_type(db: Session, leave_type_id: int) -> dict:
    try:
        found = leave_repo.delete_type(db, leave_type_id)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This leave type has leave requests, so it cannot be deleted",
        )
    if not found:
        raise _not_found("Leave type")
    return leave_overview(db)


# Policies

def policies(db: Session) -> list[dict]:
    return policy_repo.list_all(db)


def _policy_values(payload: PolicyRequest) -> dict:
    return {
        "title": payload.title.strip(),
        "category": payload.category.strip(),
        "department": (payload.department or "").strip() or None,
        "summary": payload.summary.strip(),
        "content": payload.content.strip(),
        "effective_from": payload.effective_from,
        "is_active": payload.is_active,
    }


def create_policy(db: Session, payload: PolicyRequest) -> list[dict]:
    policy_repo.create_policy(db, _policy_values(payload))
    db.commit()
    return policies(db)


def update_policy(db: Session, policy_id: int, payload: PolicyRequest) -> list[dict]:
    if not policy_repo.update_policy(db, policy_id, _policy_values(payload)):
        raise _not_found("Policy")
    db.commit()
    return policies(db)


def delete_policy(db: Session, policy_id: int) -> list[dict]:
    if not policy_repo.delete_policy(db, policy_id):
        raise _not_found("Policy")
    db.commit()
    return policies(db)


# Reports

def summary_report(db: Session, start: date | None = None, end: date | None = None) -> dict:
    # One line per active employee for the period
    start, end = attendance_service.report_period(start, end)
    rows = []
    for employee in employee_repo.list_all(db, active_only=True):
        report = attendance_service.report(db, employee, start, end)
        rows.append({**report["employee"], **report["summary"]})
    return {"from": start, "to": end, "generated_at": clock.now(), "employees": rows}


def summary_report_csv(db: Session, start: date | None = None, end: date | None = None) -> str:
    data = summary_report(db, start, end)
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerows([
        ["Attendance summary"],
        ["Period", f"{data['from']} to {data['to']}"],
        ["Generated at", data["generated_at"].strftime("%Y-%m-%d %H:%M")],
        [],
        ["Employee", "Designation", "Working days", "Present", "Half day", "Absent", "On leave", "Hours worked", "Attendance %"],
    ])
    for row in data["employees"]:
        rate = row["attendance_rate"]
        writer.writerow([
            row["name"],
            row["designation"],
            row["working_days"],
            row["present"],
            row["half_day"],
            row["absent"],
            row["leave"],
            row["hours"],
            "" if rate is None else rate,
        ])
    return out.getvalue()


def employee_report(db: Session, employee_id: int, start: date | None = None, end: date | None = None) -> dict:
    employee = _employee(db, employee_id)
    report = attendance_service.report(db, employee, start, end)
    year = report["to"].year
    return {
        **report,
        "leave": {"year": year, "balances": leave_service.balances(db, employee["id"], year)},
    }


def employee_report_csv(db: Session, employee_id: int, start: date | None = None, end: date | None = None) -> str:
    return attendance_service.report_csv(db, _employee(db, employee_id), start, end)
