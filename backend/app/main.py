

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.database import Base, engine, AsyncSessionLocal
from app.routers import users, energy, favourites, alerts, forecast
from app.config import settings
from sqlalchemy import select
from app import models
import boto3
import asyncio
import csv
import os
from datetime import datetime

app = FastAPI(title="Energy Dashboard API")
app.router.redirect_slashes = False

# S3 client setup
s3 = boto3.client(
    "s3",
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    region_name=settings.aws_region,
)

# CORS
origins = ["http://localhost:5174", "http://127.0.0.1:5174", "http://energy-dashboard-frontend-5790d44a.s3-website-us-west-2.amazonaws.com", "https://d1v02mozm1fy9b.cloudfront.net"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Session-based auth
# app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    # allow the browser to send this cookie on cross-site (CF→API) requests
    same_site="none",
    # only send it over HTTPS
    https_only=True,
)

@app.on_event("startup")
async def startup():
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.drop_all)
    # create schema
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# include routers
app.include_router(users.router)
app.include_router(energy.router)
app.include_router(favourites.router)
app.include_router(alerts.router)
app.include_router(forecast.router)

@app.get("/health")
async def health():
    return {"status": "ok"}


