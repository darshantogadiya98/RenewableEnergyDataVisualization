from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from .. import schemas, models, auth, deps

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/register", response_model=schemas.UserOut)
async def register(user_in: schemas.UserCreate, db: AsyncSession = Depends(deps.get_db)):
    # check if exists
    result = await db.execute(select(models.User).where(models.User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        email=user_in.email,
        password_hash=auth.get_password_hash(user_in.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=schemas.Token)
async def login(user_in: schemas.UserCreate, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(models.User).where(models.User.email == user_in.email))
    user = result.scalar_one_or_none()
    if not user or not auth.verify_password(user_in.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token  = create_access_token({"sub": user.username})
    refresh_token = create_refresh_token({"sub": user.username})
    return schemas.Token(access_token=access_token, refresh_token=refresh_token)
