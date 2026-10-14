from sqlalchemy import text
from sqlalchemy.orm import Session

# users and employee are linked by email (employee has no user_id column)


def get_by_email(db: Session, email: str) -> dict | None:
    row = db.execute(
        text("""
            SELECT u.id, u.email, u.password_hash, u.is_active, e.first_name, e.last_name
            FROM users u
            LEFT JOIN employee e ON LOWER(e.email) = LOWER(u.email)
            WHERE LOWER(u.email) = LOWER(:email)
        """),
        {"email": email},
    ).mappings().first()
    return dict(row) if row else None


def get_by_id(db: Session, user_id: int) -> dict | None:
    row = db.execute(
        text("""
            SELECT u.id, u.email, u.is_active, u.role,
                   e.id AS employee_id, e.first_name, e.last_name, e.mobile,
                   e.department, e.designation, e.salary, e.status
            FROM users u
            LEFT JOIN employee e ON LOWER(e.email) = LOWER(u.email)
            WHERE u.id = :id
        """),
        {"id": user_id},
    ).mappings().first()
    return dict(row) if row else None


def create_user(db: Session, email: str, password_hash: str, role: str = "employee") -> int:
    # The caller commits, so the user and employee rows are created in one transaction
    return db.execute(
        text("""
            INSERT INTO users (email, password_hash, role)
            VALUES (:email, :password_hash, :role)
            RETURNING id
        """),
        {"email": email, "password_hash": password_hash, "role": role},
    ).scalar_one()


def set_role(db: Session, email: str, role: str) -> bool:
    # The caller commits
    row = db.execute(
        text("""
            UPDATE users SET role = :role, updated_at = NOW()
            WHERE LOWER(email) = LOWER(:email)
            RETURNING id
        """),
        {"email": email, "role": role},
    ).first()
    return row is not None


def change_email(db: Session, old_email: str, new_email: str) -> None:
    # Keeps a login linked to its employee when the admin edits the email; the caller commits
    db.execute(
        text("""
            UPDATE users SET email = :new_email, updated_at = NOW()
            WHERE LOWER(email) = LOWER(:old_email)
        """),
        {"old_email": old_email, "new_email": new_email},
    )
