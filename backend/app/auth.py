from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from app.config import settings

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7
ALGORITHM = "HS256"

create_access_token = lambda payload, expires_delta=None: jwt.encode({**payload, "exp": (datetime.utcnow()+expires_delta).timestamp() if expires_delta else (datetime.utcnow()+timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp()}, settings.secret_key, algorithm=ALGORITHM)
create_refresh_token = lambda payload, expires_delta=None: jwt.encode({**payload, "exp": (datetime.utcnow()+expires_delta).timestamp() if expires_delta else (datetime.utcnow()+timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)).timestamp()}, settings.secret_key, algorithm=ALGORITHM)
verify_password = lambda plain, hashed: pwd_ctx.verify(plain, hashed)
get_password_hash = lambda pwd: pwd_ctx.hash(pwd)
verify_refresh_token = lambda token: jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])