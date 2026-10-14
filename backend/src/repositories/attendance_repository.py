from datetime import date, datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

# One row per employee per day. Rows created before check-in/check-out existed
# have only a status ("Present", "Absent", ...) and no times.
COLUMNS = "id, date AS work_date, status, check_in, check_out, remarks"


def get_for_date(db: Session, employee_id: int, work_date: date) -> dict | None:
    row = db.execute(
        text(f"""
            SELECT {COLUMNS}
            FROM attendance
            WHERE employee_id = :employee_id AND date = :work_date
        """),
        {"employee_id": employee_id, "work_date": work_date},
    ).mappings().first()
    return dict(row) if row else None


def list_between(db: Session, employee_id: int, start: date, end: date) -> list[dict]:
    rows = db.execute(
        text(f"""
            SELECT {COLUMNS}
            FROM attendance
            WHERE employee_id = :employee_id AND date BETWEEN :start AND :end
            ORDER BY date
        """),
        {"employee_id": employee_id, "start": start, "end": end},
    ).mappings().all()
    return [dict(row) for row in rows]


def check_in(db: Session, employee_id: int, work_date: date, at: datetime) -> dict | None:
    # Returns None when the day is already marked (the unique constraint decides, not a prior read)
    row = db.execute(
        text(f"""
            INSERT INTO attendance (employee_id, date, status, check_in)
            VALUES (:employee_id, :work_date, 'Present', :at)
            ON CONFLICT (employee_id, date) DO NOTHING
            RETURNING {COLUMNS}
        """),
        {"employee_id": employee_id, "work_date": work_date, "at": at},
    ).mappings().first()
    return dict(row) if row else None


def check_out(db: Session, employee_id: int, work_date: date, at: datetime) -> dict | None:
    # Returns None when there is no open check-in for the day
    row = db.execute(
        text(f"""
            UPDATE attendance
            SET check_out = :at, updated_at = CURRENT_TIMESTAMP
            WHERE employee_id = :employee_id AND date = :work_date
              AND check_in IS NOT NULL AND check_out IS NULL
            RETURNING {COLUMNS}
        """),
        {"employee_id": employee_id, "work_date": work_date, "at": at},
    ).mappings().first()
    return dict(row) if row else None


def list_for_date(db: Session, work_date: date) -> list[dict]:
    rows = db.execute(
        text(f"SELECT employee_id, {COLUMNS} FROM attendance WHERE date = :work_date"),
        {"work_date": work_date},
    ).mappings().all()
    return [dict(row) for row in rows]


def upsert(
    db: Session,
    employee_id: int,
    work_date: date,
    status: str,
    check_in: datetime | None,
    check_out: datetime | None,
    remarks: str | None,
) -> None:
    # The admin's entry replaces whatever was recorded for the day; the caller commits
    db.execute(
        text("""
            INSERT INTO attendance (employee_id, date, status, check_in, check_out, remarks)
            VALUES (:employee_id, :work_date, :status, :check_in, :check_out, :remarks)
            ON CONFLICT (employee_id, date) DO UPDATE
            SET status = EXCLUDED.status, check_in = EXCLUDED.check_in, check_out = EXCLUDED.check_out,
                remarks = EXCLUDED.remarks, updated_at = CURRENT_TIMESTAMP
        """),
        {
            "employee_id": employee_id,
            "work_date": work_date,
            "status": status,
            "check_in": check_in,
            "check_out": check_out,
            "remarks": remarks,
        },
    )


def delete_for_date(db: Session, employee_id: int, work_date: date) -> None:
    # The caller commits
    db.execute(
        text("DELETE FROM attendance WHERE employee_id = :employee_id AND date = :work_date"),
        {"employee_id": employee_id, "work_date": work_date},
    )


def delete_absent_between(db: Session, employee_id: int, start: date, end: date) -> None:
    # Days marked absent that an approved leave now covers; the caller commits
    db.execute(
        text("""
            DELETE FROM attendance
            WHERE employee_id = :employee_id AND date BETWEEN :start AND :end
              AND check_in IS NULL AND LOWER(TRIM(status)) = 'absent'
        """),
        {"employee_id": employee_id, "start": start, "end": end},
    )
