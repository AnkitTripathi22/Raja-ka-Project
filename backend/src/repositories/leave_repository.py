from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session


def list_types(db: Session) -> list[dict]:
    rows = db.execute(
        text("SELECT id, name, days_per_year FROM leave_type ORDER BY id")
    ).mappings().all()
    return [dict(row) for row in rows]


def get_type(db: Session, leave_type_id: int) -> dict | None:
    row = db.execute(
        text("SELECT id, name, days_per_year FROM leave_type WHERE id = :id"),
        {"id": leave_type_id},
    ).mappings().first()
    return dict(row) if row else None


def list_requests(db: Session, employee_id: int) -> list[dict]:
    rows = db.execute(
        text("""
            SELECT r.id, r.leave_type_id, t.name AS leave_type, r.start_date, r.end_date,
                   r.days, r.reason, r.status, r.created_at
            FROM leave_request r
            JOIN leave_type t ON t.id = r.leave_type_id
            WHERE r.employee_id = :employee_id
            ORDER BY r.start_date DESC, r.id DESC
        """),
        {"employee_id": employee_id},
    ).mappings().all()
    return [dict(row) for row in rows]


def days_by_type(db: Session, employee_id: int, year: int) -> list[dict]:
    # A request belongs to one calendar year (the service rejects requests that span two)
    rows = db.execute(
        text("""
            SELECT leave_type_id, status, SUM(days) AS days
            FROM leave_request
            WHERE employee_id = :employee_id
              AND status IN ('pending', 'approved')
              AND EXTRACT(YEAR FROM start_date) = :year
            GROUP BY leave_type_id, status
        """),
        {"employee_id": employee_id, "year": year},
    ).mappings().all()
    return [dict(row) for row in rows]


def has_overlap(db: Session, employee_id: int, start: date, end: date) -> bool:
    return db.execute(
        text("""
            SELECT 1
            FROM leave_request
            WHERE employee_id = :employee_id
              AND status IN ('pending', 'approved')
              AND start_date <= :end AND end_date >= :start
            LIMIT 1
        """),
        {"employee_id": employee_id, "start": start, "end": end},
    ).first() is not None


def create_request(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    start: date,
    end: date,
    days: int,
    reason: str,
    status: str = "pending",
) -> int:
    # The caller commits
    return db.execute(
        text("""
            INSERT INTO leave_request (employee_id, leave_type_id, start_date, end_date, days, reason, status)
            VALUES (:employee_id, :leave_type_id, :start, :end, :days, :reason, :status)
            RETURNING id
        """),
        {
            "employee_id": employee_id,
            "leave_type_id": leave_type_id,
            "start": start,
            "end": end,
            "days": days,
            "reason": reason,
            "status": status,
        },
    ).scalar_one()


def cancel_request(db: Session, employee_id: int, request_id: int) -> bool:
    # Only the owner's pending request can be cancelled; the caller commits
    row = db.execute(
        text("""
            UPDATE leave_request
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = :id AND employee_id = :employee_id AND status = 'pending'
            RETURNING id
        """),
        {"id": request_id, "employee_id": employee_id},
    ).first()
    return row is not None


def approved_between(db: Session, employee_id: int, start: date, end: date) -> list[dict]:
    rows = db.execute(
        text("""
            SELECT start_date, end_date
            FROM leave_request
            WHERE employee_id = :employee_id AND status = 'approved'
              AND start_date <= :end AND end_date >= :start
        """),
        {"employee_id": employee_id, "start": start, "end": end},
    ).mappings().all()
    return [dict(row) for row in rows]


def on_leave_in_department(db: Session, department: str, day: date) -> set[int]:
    rows = db.execute(
        text("""
            SELECT DISTINCT r.employee_id
            FROM leave_request r
            JOIN employee e ON e.id = r.employee_id
            WHERE LOWER(e.department) = LOWER(:department)
              AND r.status = 'approved'
              AND :day BETWEEN r.start_date AND r.end_date
        """),
        {"department": department, "day": day},
    ).all()
    return {row[0] for row in rows}


def on_leave_on(db: Session, day: date) -> set[int]:
    rows = db.execute(
        text("""
            SELECT DISTINCT employee_id
            FROM leave_request
            WHERE status = 'approved' AND :day BETWEEN start_date AND end_date
        """),
        {"day": day},
    ).all()
    return {row[0] for row in rows}


def list_all_requests(db: Session) -> list[dict]:
    # Admin view: every employee's requests, the ones waiting for a decision first
    rows = db.execute(
        text("""
            SELECT r.id, r.employee_id, TRIM(e.first_name || ' ' || e.last_name) AS employee_name,
                   r.leave_type_id, t.name AS leave_type, r.start_date, r.end_date,
                   r.days, r.reason, r.status, r.created_at
            FROM leave_request r
            JOIN leave_type t ON t.id = r.leave_type_id
            JOIN employee e ON e.id = r.employee_id
            ORDER BY (r.status = 'pending') DESC, r.start_date DESC, r.id DESC
        """)
    ).mappings().all()
    return [dict(row) for row in rows]


def set_status(db: Session, request_id: int, from_statuses: list[str], status: str) -> dict | None:
    # Returns None when the request is not in one of from_statuses; the caller commits
    row = db.execute(
        text("""
            UPDATE leave_request
            SET status = :status, updated_at = NOW()
            WHERE id = :id AND status = ANY(:from_statuses)
            RETURNING id, employee_id, start_date, end_date
        """),
        {"id": request_id, "from_statuses": from_statuses, "status": status},
    ).mappings().first()
    return dict(row) if row else None


def create_type(db: Session, name: str, days_per_year: int) -> int:
    # The caller commits
    return db.execute(
        text("INSERT INTO leave_type (name, days_per_year) VALUES (:name, :days_per_year) RETURNING id"),
        {"name": name, "days_per_year": days_per_year},
    ).scalar_one()


def update_type(db: Session, leave_type_id: int, name: str, days_per_year: int) -> bool:
    # The caller commits
    row = db.execute(
        text("""
            UPDATE leave_type SET name = :name, days_per_year = :days_per_year
            WHERE id = :id
            RETURNING id
        """),
        {"id": leave_type_id, "name": name, "days_per_year": days_per_year},
    ).first()
    return row is not None


def delete_type(db: Session, leave_type_id: int) -> bool:
    # Fails with an IntegrityError while leave requests use the type; the caller commits
    row = db.execute(
        text("DELETE FROM leave_type WHERE id = :id RETURNING id"),
        {"id": leave_type_id},
    ).first()
    return row is not None
