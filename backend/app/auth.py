from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from app.config import settings
import os

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_expire_days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(
    data: dict,
    expires_delta: timedelta | None = None
) -> str:
    """
    Generate a JWT intended for “refresh” flows, using
    settings.refresh_token_expire_days by default.
    """
    to_encode = data.copy()
    # default to REFRESH_TOKEN_EXPIRE_DAYS if no override
    expire = datetime.utcnow() + (
        expires_delta
        or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire})
    # you can even use a different signing key/alg if you like
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)