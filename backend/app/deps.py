# from fastapi import Depends, HTTPException, status, Request
# from fastapi.security import OAuth2PasswordBearer
# from jose import jwt, JWTError
# from datetime import datetime
# from sqlalchemy import select
# from sqlalchemy.ext.asyncio import AsyncSession
# from app.database import AsyncSessionLocal
# from app.config import settings

# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")

# async def get_db() -> AsyncSession:
#     async with AsyncSessionLocal() as session:
#         yield session

# async def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
#     if not token:
#         token = request.session.get("access_token")
#     if not token:
#         raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
#     try:
#         payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
#         uid = payload.get("sub")
#         exp = payload.get("exp", 0)
#         if uid is None or datetime.utcfromtimestamp(exp) < datetime.utcnow():
#             raise JWTError()
#     except JWTError:
#         raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
#     from app.models import User
#     result = await db.execute(select(User).where(User.id == uid))
#     user = result.scalar_one_or_none()
#     if not user:
#         raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
#     return user

# backend/app/deps.py
from fastapi import Depends, HTTPException, status, Request
from jose import JWTError, jwt
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User
from app.config import settings

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = request.session.get("access_token")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated",
                            headers={"WWW-Authenticate": "Bearer"})

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        exp: int = payload.get("exp", 0)
        if user_id is None or datetime.utcfromtimestamp(exp) < datetime.utcnow():
            raise
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token",
                            headers={"WWW-Authenticate": "Bearer"})

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid user",
                            headers={"WWW-Authenticate": "Bearer"})
    return user