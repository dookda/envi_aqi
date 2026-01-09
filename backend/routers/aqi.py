"""
AQI Data API Endpoints
"""

from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from loguru import logger

from db import get_db

router = APIRouter()


class AQIMeasurement(BaseModel):
    """AQI measurement response model"""
    id: int
    station_id: int
    station_name: Optional[str]
    measured_at: datetime
    aqi: Optional[int]
    aqi_level: Optional[str]
    aqi_color: Optional[str]
    pm25: Optional[float]
    pm10: Optional[float]
    o3: Optional[float]
    co: Optional[float]
    no2: Optional[float]
    so2: Optional[float]
    temperature: Optional[float]
    humidity: Optional[float]


class DailySummary(BaseModel):
    """Daily AQI summary response model"""
    date: date
    station_id: int
    station_name: Optional[str]
    aqi_avg: Optional[float]
    aqi_max: Optional[int]
    aqi_min: Optional[int]
    pm25_avg: Optional[float]
    pm25_max: Optional[float]
    reading_count: Optional[int]
    hours_unhealthy: Optional[int]


class AQIStatistics(BaseModel):
    """AQI statistics response model"""
    period_start: date
    period_end: date
    total_readings: int
    avg_aqi: float
    max_aqi: int
    min_aqi: int
    avg_pm25: float
    max_pm25: float
    days_good: int
    days_moderate: int
    days_unhealthy: int


@router.get("/current", response_model=List[AQIMeasurement])
async def get_current_aqi(
    station_id: Optional[int] = None,
    province: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get the most recent AQI reading for each station"""
    
    query = """
        SELECT DISTINCT ON (m.station_id)
            m.id,
            m.station_id,
            s.name as station_name,
            m.measured_at,
            m.aqi,
            m.aqi_level,
            m.aqi_color,
            m.pm25,
            m.pm10,
            m.o3,
            m.co,
            m.no2,
            m.so2,
            m.temperature,
            m.humidity
        FROM aqi_measurements m
        JOIN stations s ON m.station_id = s.id
        WHERE 1=1
    """
    params = {}
    
    if station_id:
        query += " AND m.station_id = :station_id"
        params["station_id"] = station_id
    
    if province:
        query += " AND s.province ILIKE :province"
        params["province"] = f"%{province}%"
    
    query += " ORDER BY m.station_id, m.measured_at DESC"
    
    result = await db.execute(text(query), params)
    rows = result.fetchall()
    
    return [
        AQIMeasurement(
            id=row[0],
            station_id=row[1],
            station_name=row[2],
            measured_at=row[3],
            aqi=row[4],
            aqi_level=row[5],
            aqi_color=row[6],
            pm25=row[7],
            pm10=row[8],
            o3=row[9],
            co=row[10],
            no2=row[11],
            so2=row[12],
            temperature=row[13],
            humidity=row[14]
        )
        for row in rows
    ]


@router.get("/history")
async def get_aqi_history(
    station_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(default=100, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get historical AQI data for a station"""
    
    if not start_date:
        start_date = date.today() - timedelta(days=7)
    if not end_date:
        end_date = date.today()
    
    query = """
        SELECT 
            m.id,
            m.station_id,
            s.name as station_name,
            m.measured_at,
            m.aqi,
            m.aqi_level,
            m.aqi_color,
            m.pm25,
            m.pm10,
            m.o3,
            m.co,
            m.no2,
            m.so2,
            m.temperature,
            m.humidity
        FROM aqi_measurements m
        JOIN stations s ON m.station_id = s.id
        WHERE m.station_id = :station_id
          AND DATE(m.measured_at) BETWEEN :start_date AND :end_date
        ORDER BY m.measured_at DESC
        LIMIT :limit
    """
    
    result = await db.execute(text(query), {
        "station_id": station_id,
        "start_date": start_date,
        "end_date": end_date,
        "limit": limit
    })
    rows = result.fetchall()
    
    return [
        {
            "id": row[0],
            "station_id": row[1],
            "station_name": row[2],
            "measured_at": row[3].isoformat(),
            "aqi": row[4],
            "aqi_level": row[5],
            "aqi_color": row[6],
            "pm25": row[7],
            "pm10": row[8],
            "o3": row[9],
            "co": row[10],
            "no2": row[11],
            "so2": row[12],
            "temperature": row[13],
            "humidity": row[14]
        }
        for row in rows
    ]


@router.get("/daily-summary")
async def get_daily_summary(
    station_id: Optional[int] = None,
    province: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get daily AQI summary"""
    
    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    
    query = """
        SELECT 
            d.date,
            d.station_id,
            s.name as station_name,
            d.aqi_avg,
            d.aqi_max,
            d.aqi_min,
            d.pm25_avg,
            d.pm25_max,
            d.reading_count,
            d.hours_unhealthy
        FROM daily_aqi_summary d
        JOIN stations s ON d.station_id = s.id
        WHERE d.date BETWEEN :start_date AND :end_date
    """
    params = {"start_date": start_date, "end_date": end_date}
    
    if station_id:
        query += " AND d.station_id = :station_id"
        params["station_id"] = station_id
    
    if province:
        query += " AND s.province ILIKE :province"
        params["province"] = f"%{province}%"
    
    query += " ORDER BY d.date DESC, s.name"
    
    result = await db.execute(text(query), params)
    rows = result.fetchall()
    
    return [
        {
            "date": row[0].isoformat(),
            "station_id": row[1],
            "station_name": row[2],
            "aqi_avg": row[3],
            "aqi_max": row[4],
            "aqi_min": row[5],
            "pm25_avg": row[6],
            "pm25_max": row[7],
            "reading_count": row[8],
            "hours_unhealthy": row[9]
        }
        for row in rows
    ]


@router.get("/statistics")
async def get_aqi_statistics(
    station_id: Optional[int] = None,
    province: Optional[str] = None,
    days: int = Query(default=30, le=365),
    db: AsyncSession = Depends(get_db)
):
    """Get aggregated AQI statistics"""
    
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    query = """
        SELECT 
            COUNT(*) as total_readings,
            ROUND(AVG(aqi)::numeric, 2) as avg_aqi,
            MAX(aqi) as max_aqi,
            MIN(aqi) as min_aqi,
            ROUND(AVG(pm25)::numeric, 2) as avg_pm25,
            ROUND(MAX(pm25)::numeric, 2) as max_pm25
        FROM aqi_measurements m
        JOIN stations s ON m.station_id = s.id
        WHERE DATE(measured_at) BETWEEN :start_date AND :end_date
    """
    params = {"start_date": start_date, "end_date": end_date}
    
    if station_id:
        query += " AND m.station_id = :station_id"
        params["station_id"] = station_id
    
    if province:
        query += " AND s.province ILIKE :province"
        params["province"] = f"%{province}%"
    
    result = await db.execute(text(query), params)
    row = result.fetchone()
    
    # Count days by AQI level
    level_query = """
        SELECT 
            COUNT(*) FILTER (WHERE aqi_avg <= 50) as days_good,
            COUNT(*) FILTER (WHERE aqi_avg > 50 AND aqi_avg <= 100) as days_moderate,
            COUNT(*) FILTER (WHERE aqi_avg > 100) as days_unhealthy
        FROM daily_aqi_summary d
        JOIN stations s ON d.station_id = s.id
        WHERE date BETWEEN :start_date AND :end_date
    """
    
    if station_id:
        level_query += " AND d.station_id = :station_id"
    if province:
        level_query += " AND s.province ILIKE :province"
    
    level_result = await db.execute(text(level_query), params)
    level_row = level_result.fetchone()
    
    return {
        "period_start": start_date.isoformat(),
        "period_end": end_date.isoformat(),
        "total_readings": row[0] or 0,
        "avg_aqi": float(row[1]) if row[1] else 0,
        "max_aqi": row[2] or 0,
        "min_aqi": row[3] or 0,
        "avg_pm25": float(row[4]) if row[4] else 0,
        "max_pm25": float(row[5]) if row[5] else 0,
        "days_good": level_row[0] or 0,
        "days_moderate": level_row[1] or 0,
        "days_unhealthy": level_row[2] or 0
    }


@router.get("/compare")
async def compare_stations(
    station_ids: str = Query(..., description="Comma-separated station IDs"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db)
):
    """Compare AQI data between multiple stations"""
    
    ids = [int(id.strip()) for id in station_ids.split(",")]
    
    if not start_date:
        start_date = date.today() - timedelta(days=7)
    if not end_date:
        end_date = date.today()
    
    query = """
        SELECT 
            s.id as station_id,
            s.name as station_name,
            s.province,
            ROUND(AVG(m.aqi)::numeric, 2) as avg_aqi,
            MAX(m.aqi) as max_aqi,
            MIN(m.aqi) as min_aqi,
            ROUND(AVG(m.pm25)::numeric, 2) as avg_pm25
        FROM stations s
        LEFT JOIN aqi_measurements m ON s.id = m.station_id
            AND DATE(m.measured_at) BETWEEN :start_date AND :end_date
        WHERE s.id = ANY(:station_ids)
        GROUP BY s.id, s.name, s.province
        ORDER BY avg_aqi DESC NULLS LAST
    """
    
    result = await db.execute(text(query), {
        "station_ids": ids,
        "start_date": start_date,
        "end_date": end_date
    })
    rows = result.fetchall()
    
    return [
        {
            "station_id": row[0],
            "station_name": row[1],
            "province": row[2],
            "avg_aqi": row[3],
            "max_aqi": row[4],
            "min_aqi": row[5],
            "avg_pm25": row[6]
        }
        for row in rows
    ]
