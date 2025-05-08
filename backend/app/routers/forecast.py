# app/routers/forecast.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pandas import DataFrame
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from pathlib import Path

from prophet.serialize import model_from_json   # optional
from app.models import EnergyReading
from app.deps import get_db

router = APIRouter(prefix="/forecast", tags=["forecast"])

# ────────────────── metric → ORM column map ──────────────────
COL = {
    "solar": EnergyReading.solar_kwh,
    "wind": EnergyReading.wind_kwh,
    "geothermal": EnergyReading.nuclear_kwh,
    "biomass": EnergyReading.biomass_kwh,
    "biogas": EnergyReading.oil_and_gas_kwh,
    "small hydro": EnergyReading.hydroelectric_kwh,
    "demand": EnergyReading.consumption_kwh,
}

# ────────────────── Prophet model registry (lazy) ──────────────────
MODEL_DIR = Path("models")
_prophet_cache: dict[str, "Prophet"] = {}


def load_prophet(metric: str):
    """Load a Prophet‐JSON model once and cache it."""
    if metric not in _prophet_cache:
        path = MODEL_DIR / f"prophet_{metric}.json"
        if not path.exists():
            raise FileNotFoundError
        _prophet_cache[metric] = model_from_json(path.read_text())
    return _prophet_cache[metric]


# ───────────────────────── endpoint ─────────────────────────
@router.get(
    "/{metric}",
    response_model=list[tuple[str, float]],
    summary="Forecast a metric with the chosen model",
)
async def forecast(
    metric: str,
    horizon: int = Query(48, ge=1, le=336),
    model: str = Query("hw", regex="^(hw|prophet|xgb|lgbm)$"),
    db: AsyncSession = Depends(get_db),
):
    """
    **metric** can be one of: Solar, Wind, Geothermal, Biomass, Biogas, Small hydro, Demand  
    **model** choices:  
    * `hw` (holt‑winters, default)  
    * `prophet` (pre‑trained JSON per metric)  
    * `xgb` or `lgbm` – stubbed for future use
    """
    col = COL.get(metric.lower())
    if not col:
        raise HTTPException(
            400, f"Unknown metric '{metric}'. Allowed: {list(COL.keys())}"
        )

    # get full history
    res = await db.execute(select(EnergyReading.timestamp, col).order_by(EnergyReading.timestamp))
    rows = res.all()
    if not rows:
        raise HTTPException(404, "No historical data")

    ts, y = zip(*rows)
    y_series = pd.Series(y, dtype=float) / 1000.0  # kWh → MWh

    # ────────────── choose backend ──────────────
    if model == "hw":
        df = DataFrame({"y": y_series})
        fitted = ExponentialSmoothing(df.y, trend="add").fit()
        fc = fitted.forecast(horizon).round(2).tolist()

    elif model == "prophet":
        try:
            m = load_prophet(metric.lower())
            future = m.make_future_dataframe(periods=horizon, freq="H", include_history=False)
            fc = m.predict(future)["yhat"].round(2).tolist()
        except FileNotFoundError:
            # fallback to Holt-Winters if no Prophet model is present
            df = DataFrame({"y": y_series})
            fitted = ExponentialSmoothing(df.y, trend="add").fit()
            fc = fitted.forecast(horizon).round(2).tolist()

    else:
        # placeholder for XGBoost / LightGBM
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            f"Model '{model}' is not implemented yet.",
        )

    future_idx = (
        pd.date_range(ts[-1], periods=horizon + 1, freq="H")[1:].astype(str).tolist()
    )
    return list(zip(future_idx, fc))