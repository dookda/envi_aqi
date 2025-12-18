"""
Database connection and ORM models using SQLAlchemy
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, Index
from datetime import datetime
import os

# Database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:5433/air4thai")
# Convert to async URL
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Create async engine
engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,  # Set to True for SQL query logging
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Create async session maker (compatible with SQLAlchemy 2.0+)
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
Base = declarative_base()

# Database dependency for FastAPI
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ORM Models
class AirQualityMeasurement(Base):
    __tablename__ = "air_quality_measurements"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String(50), nullable=False, index=True)
    station_name = Column(String(255))
    parameter = Column(String(50), nullable=False, index=True)
    value = Column(Float)
    unit = Column(String(20))
    timestamp = Column(DateTime, nullable=False, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MonitoringStation(Base):
    __tablename__ = "monitoring_stations"

    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String)
    city = Column(String(100))
    province = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Parameter(Base):
    __tablename__ = "parameters"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    unit = Column(String(20), nullable=False)
    description = Column(String)
    threshold_good = Column(Float)
    threshold_moderate = Column(Float)
    threshold_unhealthy = Column(Float)
    threshold_very_unhealthy = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


class ModelTrainingData(Base):
    __tablename__ = "model_training_data"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    parameter = Column(String(50), nullable=False)
    station_id = Column(String(50))
    training_start_date = Column(DateTime)
    training_end_date = Column(DateTime)
    accuracy_score = Column(Float)
    mae = Column(Float)
    rmse = Column(Float)
    r2_score = Column(Float)
    model_path = Column(String)
    model_metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class DetectedAnomaly(Base):
    __tablename__ = "detected_anomalies"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String(50), nullable=False, index=True)
    parameter = Column(String(50), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    value = Column(Float, nullable=False)
    expected_value = Column(Float)
    anomaly_score = Column(Float)
    detection_method = Column(String(50))
    severity = Column(String(20))
    anomaly_metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


# Initialize database tables
async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        # Note: TimescaleDB-specific tables are created via init.sql
        # This just ensures ORM models are in sync
        await conn.run_sync(Base.metadata.create_all)
