import os

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from src.database import get_db
from src.repositories import employee_repository as employee_repo
from src.repositories import user_repository as repo
from src.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

# Local testing only: requests without a token act as this user id. Leave empty in production
DEV_AUTH_USER_ID = os.getenv("DEV_AUTH_USER_ID", "").strip()


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        if DEV_AUTH_USER_ID:
            user = repo.get_by_id(db, int(DEV_AUTH_USER_ID))
            if user and user["is_active"]:
                return user
        raise unauthorized

    try:
        payload = decode_access_token(creds.credentials)
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise unauthorized

    user = repo.get_by_id(db, user_id)
    if not user or not user["is_active"]:
        raise unauthorized
    return user


def get_current_employee(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    employee = employee_repo.get_by_id(db, user["employee_id"]) if user["employee_id"] else None
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No employee profile is linked to this account",
        )
    return employee


def get_current_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an admin can do this",
        )
    return user
