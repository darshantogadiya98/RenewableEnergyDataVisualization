from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import csv, io
from datetime import datetime

from app import models
from app.schemas import EnergyIn, EnergyOut
from app.deps import get_db, get_current_user

router = APIRouter(
    prefix="/energy",
    tags=["energy"],
    dependencies=[Depends(get_current_user)],  # global auth guard
)

# ── helpers ────────────────────────────────────────────────────────────────

def row_to_decimal(val: str) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return 0.0

# ── CRUD endpoints ─────────────────────────────────────────────────────────

@router.get("/", response_model=list[EnergyOut])
async def list_readings(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(models.EnergyReading)
        .where(models.EnergyReading.user_id == current_user.id)
        .order_by(models.EnergyReading.timestamp)
    )
    return result.scalars().all()

@router.post("/", response_model=EnergyOut, status_code=status.HTTP_201_CREATED)
async def create_reading(
    payload: EnergyIn,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    reading = models.EnergyReading(user_id=current_user.id, **payload.model_dump())
    db.add(reading)
    await db.commit(); await db.refresh(reading)
    return reading

@router.get("/{reading_id}", response_model=EnergyOut)
async def get_reading(
    reading_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    res = await db.execute(
        select(models.EnergyReading)
        .where(models.EnergyReading.id == reading_id, models.EnergyReading.user_id == current_user.id)
    )
    reading = res.scalar_one_or_none()
    if not reading:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return reading

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_energy_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Bulk upload CSV rows matching the EnergyReading schema."""
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode()))
    rows = list(reader)
    # print(f">>>> found {len(rows)} rows")
    # print(">>>> sample row:", rows[0] if rows else None)
    imported = 0
    for row in rows:
        try:
            # print(f">>>> found {len(rows)} rows")
            reading = models.EnergyReading(
                user_id=current_user.id,
                timestamp=datetime.fromisoformat(row["DateTime"]),
                consumption_kwh=row_to_decimal(row["Consumption"]),
                production_kwh=row_to_decimal(row["Production"]),
                nuclear_kwh=row_to_decimal(row["Nuclear"]),
                wind_kwh=row_to_decimal(row["Wind"]),
                hydroelectric_kwh=row_to_decimal(row["Hydroelectric"]),
                oil_and_gas_kwh=row_to_decimal(row["Oil and Gas"]),
                coal_kwh=row_to_decimal(row["Coal"]),
                solar_kwh=row_to_decimal(row["Solar"]),
                biomass_kwh=row_to_decimal(row["Biomass"]),
            )
            db.add(reading)
            imported += 1
        except Exception:
            continue  # skip bad rows silently
    await db.commit()
    return {"imported": imported}
