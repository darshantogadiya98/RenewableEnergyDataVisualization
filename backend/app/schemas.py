from pydantic import BaseModel, EmailStr, constr, condecimal, ConfigDict
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: constr(strip_whitespace=True, min_length=1, max_length=100)

class UserCreate(UserBase):
    password: constr(min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    refresh_token: str
    id: UUID

class TokenRefresh(BaseModel):
    refresh_token: str

class EnergyBase(BaseModel):
    timestamp: datetime
    consumption_kwh: condecimal(max_digits=14, decimal_places=3)
    production_kwh: condecimal(max_digits=14, decimal_places=3)
    nuclear_kwh: condecimal(max_digits=14, decimal_places=3)
    wind_kwh: condecimal(max_digits=14, decimal_places=3)
    hydroelectric_kwh: condecimal(max_digits=14, decimal_places=3)
    oil_and_gas_kwh: condecimal(max_digits=14, decimal_places=3)
    coal_kwh: condecimal(max_digits=14, decimal_places=3)
    solar_kwh: condecimal(max_digits=14, decimal_places=3)
    biomass_kwh: condecimal(max_digits=14, decimal_places=3)

class EnergyIn(EnergyBase):
    pass

class EnergyOut(EnergyBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
    
class FavouriteIn(BaseModel):
    name: constr(min_length=1, max_length=100)
    config_json: dict

class FavouriteOut(FavouriteIn):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AlertIn(BaseModel):
    metric: constr(min_length=1)
    threshold: condecimal(max_digits=14, decimal_places=3)
    direction: Literal["above", "below"]

class AlertOut(AlertIn):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,     
    )