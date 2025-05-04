from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings
import os
from app.config import settings

DATABASE_URL = str(settings.database_url)

# Pull the fully-qualified URL from .env via Pydantic
engine = create_async_engine(DATABASE_URL, echo=False, future=True)

# Create your async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
)

Base = declarative_base()