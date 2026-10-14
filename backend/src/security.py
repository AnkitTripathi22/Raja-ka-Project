import hmac
import os
from datetime import datetime, timedelta, timezone

import bcrypt
from dotenv import load_dotenv
from jose import jwt

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
# Registering with this code creates an admin; empty means nobody can
ADMIN_SIGNUP_CODE = os.getenv("ADMIN_SIGNUP_CODE", "").strip()

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be set in .env")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def is_admin_code(code: str) -> bool:
    if not ADMIN_SIGNUP_CODE:
        return False
    return hmac.compare_digest(code.encode("utf-8"), ADMIN_SIGNUP_CODE.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    # Raises jose.JWTError if the token is expired or invalid
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])