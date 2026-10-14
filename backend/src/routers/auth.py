from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import get_current_user
from src.requests.auth import LoginRequest, RegisterRequest
from src.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register(db, payload)


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(db, payload)


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user
