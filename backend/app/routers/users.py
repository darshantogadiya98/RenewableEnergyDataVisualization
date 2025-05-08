from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta

from app.schemas import UserCreate, UserLogin, UserOut, Token
from app import models, auth
from app.deps import get_db, get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    exists = await db.execute(
        select(models.User).where(models.User.email == user_in.email)
    )
    if exists.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = models.User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=auth.get_password_hash(user_in.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(
    form: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.User).where(models.User.email == form.email)
    )
    user = result.scalar_one_or_none()
    if not user or not auth.verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = auth.create_access_token(
        {"sub": str(user.id)},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = auth.create_refresh_token(
        {"sub": str(user.id)},
        expires_delta=timedelta(days=auth.REFRESH_TOKEN_EXPIRE_DAYS),
    )

    # store both in session cookie
    request.session["access_token"] = access_token
    request.session["refresh_token"] = refresh_token

    # 4) also send them as HttpOnly, Secure, SameSite=None cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=auth.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    # 5) return everything—including the user ID—to the frontend
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        id=user.id,
    )

@router.get(
    "/{user_id}",
    response_model=UserOut,
    summary="Fetch a single user by ID",
)
async def fetch_user_by_id(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Retrieve a user's public info (email, full_name, id, created_at) by their UUID.
    Requires you to be authenticated.
    """
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user