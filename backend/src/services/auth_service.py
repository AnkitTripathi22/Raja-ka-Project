from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.repositories import employee_repository as employee_repo
from src.repositories import user_repository as repo
from src.requests.auth import LoginRequest, RegisterRequest
from src.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    hash_password,
    is_admin_code,
    verify_password,
)


def _public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
    }


def _token_response(user: dict) -> dict:
    return {
        "access_token": create_access_token(user["id"]),
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": _public_user(user),
    }


def register(db: Session, payload: RegisterRequest) -> dict:
    # Emails are stored in lowercase because the unique constraints are case-sensitive
    email = payload.email.strip().lower()
    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    conflict = HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Email or mobile already registered",
    )

    admin_code = payload.admin_code.strip()
    if admin_code and not is_admin_code(admin_code):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin code is not correct",
        )
    role = "admin" if admin_code else "employee"

    if (
        repo.get_by_email(db, email)
        or employee_repo.get_by_email(db, email)
        or employee_repo.get_by_mobile(db, payload.mobile)
    ):
        raise conflict

    try:
        user_id = repo.create_user(db, email, hash_password(payload.password), role)
        employee_repo.create_employee(
            db,
            first_name,
            last_name,
            email,
            payload.mobile,
            payload.department.strip(),
            payload.designation.strip(),
            payload.salary,
        )
        db.commit()
    except IntegrityError:
        # Concurrent requests can pass the check above; the unique constraint catches them here
        db.rollback()
        raise conflict

    return _token_response(
        {"id": user_id, "email": email, "first_name": first_name, "last_name": last_name}
    )


def login(db: Session, payload: LoginRequest) -> dict:
    user = repo.get_by_email(db, payload.email.strip())

    # Same message for a wrong email or a wrong password, so neither is revealed
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    return _token_response(user)
