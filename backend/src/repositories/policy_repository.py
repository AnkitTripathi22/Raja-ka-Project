from sqlalchemy import text
from sqlalchemy.orm import Session


def list_for_department(db: Session, department: str) -> list[dict]:
    # Company-wide policies (department IS NULL) plus the employee's own department
    rows = db.execute(
        text("""
            SELECT id, title, category, department, summary, content, effective_from
            FROM policy
            WHERE is_active
              AND (department IS NULL OR LOWER(department) = LOWER(:department))
            ORDER BY department NULLS LAST, title
        """),
        {"department": department},
    ).mappings().all()
    return [dict(row) for row in rows]


def list_all(db: Session) -> list[dict]:
    # Admin view: inactive policies too
    rows = db.execute(
        text("""
            SELECT id, title, category, department, summary, content, effective_from, is_active
            FROM policy
            ORDER BY department NULLS FIRST, title
        """)
    ).mappings().all()
    return [dict(row) for row in rows]


def create_policy(db: Session, values: dict) -> int:
    # The caller commits
    return db.execute(
        text("""
            INSERT INTO policy (title, category, department, summary, content, effective_from, is_active)
            VALUES (:title, :category, :department, :summary, :content,
                    COALESCE(:effective_from, CURRENT_DATE), :is_active)
            RETURNING id
        """),
        values,
    ).scalar_one()


def update_policy(db: Session, policy_id: int, values: dict) -> bool:
    # The caller commits
    row = db.execute(
        text("""
            UPDATE policy
            SET title = :title, category = :category, department = :department, summary = :summary,
                content = :content, effective_from = COALESCE(:effective_from, effective_from),
                is_active = :is_active
            WHERE id = :id
            RETURNING id
        """),
        {**values, "id": policy_id},
    ).first()
    return row is not None


def delete_policy(db: Session, policy_id: int) -> bool:
    # The caller commits
    row = db.execute(text("DELETE FROM policy WHERE id = :id RETURNING id"), {"id": policy_id}).first()
    return row is not None
