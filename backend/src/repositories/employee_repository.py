from datetime import date
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.orm import Session


def create_employee(
    db: Session,
    first_name: str,
    last_name: str,
    email: str | None,
    mobile: str | None,
    department: str,
    designation: str,
    salary: Decimal,
) -> int:
    # The caller commits
    return db.execute(
        text("""
            INSERT INTO employee (first_name, last_name, email, mobile, department, designation, salary)
            VALUES (:first_name, :last_name, :email, :mobile, :department, :designation, :salary)
            RETURNING id
        """),
        {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "mobile": mobile,
            "department": department,
            "designation": designation,
            "salary": salary,
        },
    ).scalar_one()


def get_by_email(db: Session, email: str) -> dict | None:
    row = db.execute(
        text("""
            SELECT id, first_name, last_name, email, mobile, department, designation, salary, status
            FROM employee
            WHERE LOWER(email) = LOWER(:email)
        """),
        {"email": email},
    ).mappings().first()
    return dict(row) if row else None


def get_by_mobile(db: Session, mobile: str) -> dict | None:
    row = db.execute(
        text("SELECT id, email, mobile FROM employee WHERE mobile = :mobile"),
        {"mobile": mobile},
    ).mappings().first()
    return dict(row) if row else None


def get_by_id(db: Session, employee_id: int) -> dict | None:
    row = db.execute(
        text("""
            SELECT id, first_name, last_name, email, mobile, department, designation,
                   salary, status, created_at
            FROM employee
            WHERE id = :id
        """),
        {"id": employee_id},
    ).mappings().first()
    return dict(row) if row else None


def update_profile(db: Session, employee_id: int, first_name: str, last_name: str, mobile: str) -> None:
    # The caller commits
    db.execute(
        text("""
            UPDATE employee
            SET first_name = :first_name, last_name = :last_name, mobile = :mobile,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """),
        {"id": employee_id, "first_name": first_name, "last_name": last_name, "mobile": mobile},
    )


def list_by_department(db: Session, department: str) -> list[dict]:
    # Colleagues see each other's contact details only, never salary or mobile
    rows = db.execute(
        text("""
            SELECT id, first_name, last_name, email, designation
            FROM employee
            WHERE LOWER(department) = LOWER(:department) AND status IS NOT FALSE
            ORDER BY first_name, last_name
        """),
        {"department": department},
    ).mappings().all()
    return [dict(row) for row in rows]


def list_all(db: Session, active_only: bool = False) -> list[dict]:
    # Admin view: every column, same shape as get_by_id
    rows = db.execute(
        text("""
            SELECT id, first_name, last_name, email, mobile, department, designation,
                   salary, status, created_at
            FROM employee
            WHERE NOT :active_only OR status IS NOT FALSE
            ORDER BY first_name, last_name, id
        """),
        {"active_only": active_only},
    ).mappings().all()
    return [dict(row) for row in rows]


def update_employee(
    db: Session,
    employee_id: int,
    first_name: str,
    last_name: str,
    email: str | None,
    mobile: str | None,
    department: str,
    designation: str,
    salary: Decimal,
    is_active: bool,
    joined_on: date | None = None,
) -> None:
    # The caller commits
    db.execute(
        text("""
            UPDATE employee
            SET first_name = :first_name, last_name = :last_name, email = :email, mobile = :mobile,
                department = :department, designation = :designation, salary = :salary,
                status = :is_active, updated_at = CURRENT_TIMESTAMP,
                -- created_at doubles as the joining date
                created_at = COALESCE(CAST(:joined_on AS TIMESTAMP), created_at)
            WHERE id = :id
        """),
        {
            "id": employee_id,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "mobile": mobile,
            "department": department,
            "designation": designation,
            "salary": salary,
            "is_active": is_active,
            "joined_on": joined_on,
        },
    )
