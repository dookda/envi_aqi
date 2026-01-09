"""
Stations API Endpoints
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from loguru import logger

from db import get_db

router = APIRouter()


class Station(BaseModel):
    """Station response model"""
    id: int
    station_code: str
    name: str
    name_th: Optional[str]
    province: Optional[str]
    province_th: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    station_type: Optional[str]
    is_active: bool


class StationWithDistance(Station):
    """Station with distance from point"""
    distance_km: Optional[float]


@router.get("/", response_model=List[Station])
async def get_stations(
    province: Optional[str] = None,
    station_type: Optional[str] = None,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Get all stations with optional filters"""
    
    query = """
        SELECT 
            id, station_code, name, name_th,
            province, province_th,
            latitude, longitude,
            station_type, is_active
        FROM stations
        WHERE 1=1
    """
    params = {}
    
    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active
    
    if province:
        query += " AND (province ILIKE :province OR province_th ILIKE :province)"
        params["province"] = f"%{province}%"
    
    if station_type:
        query += " AND station_type = :station_type"
        params["station_type"] = station_type
    
    query += " ORDER BY province, name"
    
    result = await db.execute(text(query), params)
    rows = result.fetchall()
    
    return [
        Station(
            id=row[0],
            station_code=row[1],
            name=row[2],
            name_th=row[3],
            province=row[4],
            province_th=row[5],
            latitude=row[6],
            longitude=row[7],
            station_type=row[8],
            is_active=row[9]
        )
        for row in rows
    ]


@router.get("/provinces")
async def get_provinces(db: AsyncSession = Depends(get_db)):
    """Get list of provinces with stations"""
    
    query = """
        SELECT DISTINCT province, province_th, COUNT(*) as station_count
        FROM stations
        WHERE is_active = TRUE
        GROUP BY province, province_th
        ORDER BY province
    """
    
    result = await db.execute(text(query))
    rows = result.fetchall()
    
    return [
        {
            "province": row[0],
            "province_th": row[1],
            "station_count": row[2]
        }
        for row in rows
    ]


@router.get("/nearby")
async def get_nearby_stations(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    radius_km: float = Query(default=50, description="Search radius in kilometers"),
    limit: int = Query(default=5, le=20),
    db: AsyncSession = Depends(get_db)
):
    """Find stations near a location using PostGIS"""
    
    query = """
        SELECT 
            id, station_code, name, name_th,
            province, province_th,
            latitude, longitude,
            station_type, is_active,
            ROUND((ST_Distance(
                location, 
                ST_GeogFromText('POINT(' || :longitude || ' ' || :latitude || ')')
            ) / 1000)::numeric, 2) as distance_km
        FROM stations
        WHERE is_active = TRUE
          AND ST_DWithin(
                location,
                ST_GeogFromText('POINT(' || :longitude || ' ' || :latitude || ')'),
                :radius_m
            )
        ORDER BY distance_km
        LIMIT :limit
    """
    
    result = await db.execute(text(query), {
        "latitude": latitude,
        "longitude": longitude,
        "radius_m": radius_km * 1000,
        "limit": limit
    })
    rows = result.fetchall()
    
    return [
        {
            "id": row[0],
            "station_code": row[1],
            "name": row[2],
            "name_th": row[3],
            "province": row[4],
            "province_th": row[5],
            "latitude": row[6],
            "longitude": row[7],
            "station_type": row[8],
            "is_active": row[9],
            "distance_km": float(row[10]) if row[10] else None
        }
        for row in rows
    ]


@router.get("/{station_id}")
async def get_station(
    station_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get station details by ID"""
    
    query = """
        SELECT 
            id, station_code, name, name_th,
            province, province_th, district, district_th,
            latitude, longitude,
            station_type, owner, is_active
        FROM stations
        WHERE id = :station_id
    """
    
    result = await db.execute(text(query), {"station_id": station_id})
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Station not found")
    
    return {
        "id": row[0],
        "station_code": row[1],
        "name": row[2],
        "name_th": row[3],
        "province": row[4],
        "province_th": row[5],
        "district": row[6],
        "district_th": row[7],
        "latitude": row[8],
        "longitude": row[9],
        "station_type": row[10],
        "owner": row[11],
        "is_active": row[12]
    }


@router.get("/{station_id}/summary")
async def get_station_summary(
    station_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get station with current AQI and recent summary"""
    
    # Get station details
    station_query = """
        SELECT id, station_code, name, name_th, province, latitude, longitude
        FROM stations WHERE id = :station_id
    """
    station_result = await db.execute(text(station_query), {"station_id": station_id})
    station = station_result.fetchone()
    
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    # Get latest reading
    latest_query = """
        SELECT aqi, aqi_level, aqi_color, pm25, measured_at
        FROM aqi_measurements
        WHERE station_id = :station_id
        ORDER BY measured_at DESC
        LIMIT 1
    """
    latest_result = await db.execute(text(latest_query), {"station_id": station_id})
    latest = latest_result.fetchone()
    
    # Get 7-day summary
    summary_query = """
        SELECT 
            ROUND(AVG(aqi_avg)::numeric, 1) as avg_aqi,
            MAX(aqi_max) as max_aqi,
            MIN(aqi_min) as min_aqi,
            ROUND(AVG(pm25_avg)::numeric, 1) as avg_pm25
        FROM daily_aqi_summary
        WHERE station_id = :station_id
          AND date >= CURRENT_DATE - INTERVAL '7 days'
    """
    summary_result = await db.execute(text(summary_query), {"station_id": station_id})
    summary = summary_result.fetchone()
    
    return {
        "station": {
            "id": station[0],
            "station_code": station[1],
            "name": station[2],
            "name_th": station[3],
            "province": station[4],
            "latitude": station[5],
            "longitude": station[6]
        },
        "current": {
            "aqi": latest[0] if latest else None,
            "aqi_level": latest[1] if latest else None,
            "aqi_color": latest[2] if latest else None,
            "pm25": latest[3] if latest else None,
            "measured_at": latest[4].isoformat() if latest else None
        },
        "week_summary": {
            "avg_aqi": float(summary[0]) if summary and summary[0] else None,
            "max_aqi": summary[1] if summary else None,
            "min_aqi": summary[2] if summary else None,
            "avg_pm25": float(summary[3]) if summary and summary[3] else None
        }
    }
