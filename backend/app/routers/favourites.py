# app/api/routers/favourites.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, insert
from uuid import UUID
from app.deps import get_db, get_current_user  
from app.models import Favourite, User
from app.schemas import FavouriteIn, FavouriteOut

auth_scheme = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/favourites", tags=["favourites"], dependencies=[Depends(get_current_user)])

@router.get("/", response_model=list[FavouriteOut])
async def list_favs(db: AsyncSession = Depends(get_db),
                    user: User = Depends(get_current_user)):
    res = await db.execute(
        select(Favourite)
        .where(Favourite.user_id == user.id)
        .order_by(Favourite.created_at.desc())
    )
    return res.scalars().all()


@router.post("/", response_model=FavouriteOut, status_code=201)
async def add_fav(fav: FavouriteIn, db: AsyncSession = Depends(get_db),
                  user: User = Depends(get_current_user)):
    stmt = (
        insert(Favourite)
        .values(user_id=user.id, **fav.model_dump())
        .returning(Favourite)
    )
    fav_obj = (await db.execute(stmt)).scalar_one()
    await db.commit()
    return fav_obj


@router.delete("/{fav_id}", status_code=204)
async def delete_fav(fav_id: UUID, db: AsyncSession = Depends(get_db),
                     user: User = Depends(get_current_user)):
    res = await db.execute(
        delete(Favourite)
        .where(Favourite.id == fav_id, Favourite.user_id == user.id)
        .returning(Favourite.id)
    )
    if res.scalar_one_or_none() is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await db.commit()