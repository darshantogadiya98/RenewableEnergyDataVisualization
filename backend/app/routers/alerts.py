# app/routers/alerts.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, insert
from app.deps import get_db, get_current_user
from app.models import Alert, User
from app.schemas import AlertIn, AlertOut
from uuid import UUID

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("/", response_model=list[AlertOut])
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    res = await db.execute(select(Alert).where(Alert.user_id == user.id))
    alerts = res.scalars().all()
    # manually unfold into dict, using .value for the enum
    return [
        {
            "id": a.id,
            "metric": a.metric,
            "threshold": a.threshold,
            "direction": a.direction.value,
            "created_at": a.created_at,
        }
        for a in alerts
    ]

@router.post("/", response_model=AlertOut, status_code=201)
async def add_alert(
    alert: AlertIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = (
        insert(Alert)
        .values(user_id=user.id, **alert.dict())
        .returning(Alert)
    )
    obj = (await db.execute(stmt)).scalar_one()
    await db.commit()
    return {
        "id": obj.id,
        "metric": obj.metric,
        "threshold": obj.threshold,
        "direction": obj.direction.value,
        "created_at": obj.created_at,
    }

@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = delete(Alert).where(Alert.id == alert_id, Alert.user_id == user.id)
    result = await db.execute(q)
    if result.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await db.commit()