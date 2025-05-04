from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .. import schemas, models, deps

router = APIRouter(prefix="/readings", tags=["energy"])

@router.post("/", response_model=schemas.ReadingOut)
async def add_reading(reading: schemas.ReadingCreate,
                      db: AsyncSession = Depends(deps.get_db),
                      user = Depends(deps.get_current_user)):
    new = models.EnergyReading(user_id=user.id, source=reading.source, kw=reading.kw)
    db.add(new)
    await db.commit()
    await db.refresh(new)
    return new

@router.get("/", response_model=list[schemas.ReadingOut])
async def get_readings(db: AsyncSession = Depends(deps.get_db),
                       user = Depends(deps.get_current_user)):
    result = await db.execute(select(models.EnergyReading).where(models.EnergyReading.user_id == user.id))
    return result.scalars().all()
