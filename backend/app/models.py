import uuid
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, Float, Numeric, Boolean, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

class SourceType(PyEnum):
    solar = "solar"
    wind = "wind"
    hydro = "hydro"
    grid = "grid"
    battery = "battery"

class User(Base):
    __tablename__ = "users"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    readings = relationship("EnergyReading", back_populates="user", cascade="all, delete")
    favourites = relationship("Favourite",     back_populates="user", cascade="all, delete")
    alerts     = relationship("Alert",         back_populates="user", cascade="all, delete")

class EnergyReading(Base):
    __tablename__ = "energy_readings"
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    timestamp = Column(DateTime(timezone=True), index=True, nullable=False)
    # totals
    consumption_kwh = Column(Numeric(14,3), nullable=False)
    production_kwh  = Column(Numeric(14,3), nullable=False)
    # breakdown
    nuclear_kwh       = Column(Numeric(14,3), nullable=False)
    wind_kwh          = Column(Numeric(14,3), nullable=False)
    hydroelectric_kwh = Column(Numeric(14,3), nullable=False)
    oil_and_gas_kwh   = Column(Numeric(14,3), nullable=False)
    coal_kwh          = Column(Numeric(14,3), nullable=False)
    solar_kwh         = Column(Numeric(14,3), nullable=False)
    biomass_kwh       = Column(Numeric(14,3), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="readings")
    
class Favourite(Base):
    __tablename__ = "favourites"

    id          = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    name        = Column(String(100), nullable=False)
    config_json = Column(JSON, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="favourites")

class AlertDirection(PyEnum):
    above = "above"
    below = "below"

class Alert(Base):
    __tablename__ = "alerts"

    id        = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id   = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    metric    = Column(String, nullable=False)
    threshold = Column(Numeric(14, 3), nullable=False)  # MW
    direction = Column(Enum(AlertDirection), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="alerts")
