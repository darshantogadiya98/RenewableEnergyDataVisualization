from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class ReadingCreate(BaseModel):
    source: str
    kw: float

class ReadingOut(BaseModel):
    id: str
    source: str
    kw: float
    recorded_at: datetime
