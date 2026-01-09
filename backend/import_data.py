"""
Data Import Script for Air4Thai AQI Data
Fetches historical AQI data from air4thai.com and imports into PostgreSQL
"""

import asyncio
import httpx
import asyncpg
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://aqi_user:aqi_password@postgres:5432/aqi_database"
)

# Air4Thai API Configuration
AIR4THAI_BASE_URL = "http://air4thai.com/forweb/getHistoryData.php"

# Stations to import (station_code, name, name_th, province, province_th, lat, lon)
STATIONS = [
    ("35t", "Chiang Mai City Hall", "ศาลากลางจังหวัดเชียงใหม่", "Chiang Mai", "เชียงใหม่", 18.7879, 98.9932),
    ("36t", "Chiang Rai City", "เชียงราย", "Chiang Rai", "เชียงราย", 19.9071, 99.8330),
    ("02t", "Din Daeng", "ดินแดง", "Bangkok", "กรุงเทพมหานคร", 13.7649, 100.5588),
    ("03t", "Chok Chai 4", "โชคชัย 4", "Bangkok", "กรุงเทพมหานคร", 13.8179, 100.5759),
    ("05t", "Wang Thonglang", "วังทองหลาง", "Bangkok", "กรุงเทพมหานคร", 13.7783, 100.6092),
    ("10t", "Government House", "ทำเนียบรัฐบาล", "Bangkok", "กรุงเทพมหานคร", 13.7623, 100.5139),
    ("54t", "Khon Kaen", "ขอนแก่น", "Khon Kaen", "ขอนแก่น", 16.4203, 102.8338),
    ("59t", "Rayong Industrial", "ระยอง", "Rayong", "ระยอง", 12.6828, 101.2737),
    ("70t", "Phuket Town", "ภูเก็ต", "Phuket", "ภูเก็ต", 7.8804, 98.3923),
]


def calculate_aqi_from_pm25(pm25: float) -> int:
    """Calculate AQI from PM2.5 concentration (Thailand standard)"""
    if pm25 is None:
        return None
    
    # Thailand AQI breakpoints for PM2.5
    breakpoints = [
        (0, 25, 0, 25),       # Good
        (25.1, 37, 26, 50),   # Moderate 
        (37.1, 50, 51, 100),  # Unhealthy for Sensitive
        (50.1, 90, 101, 200), # Unhealthy
        (90.1, 500, 201, 500) # Very Unhealthy to Hazardous
    ]
    
    for bp_lo, bp_hi, i_lo, i_hi in breakpoints:
        if bp_lo <= pm25 <= bp_hi:
            aqi = ((i_hi - i_lo) / (bp_hi - bp_lo)) * (pm25 - bp_lo) + i_lo
            return int(round(aqi))
    
    return int(round(pm25 * 4))  # Fallback for extreme values


def get_aqi_level(aqi: int) -> tuple:
    """Get AQI level and color from AQI value"""
    if aqi is None:
        return None, None
    
    if aqi <= 25:
        return "Good", "#00E400"
    elif aqi <= 50:
        return "Moderate", "#FFFF00"
    elif aqi <= 100:
        return "Unhealthy for Sensitive Groups", "#FF7E00"
    elif aqi <= 200:
        return "Unhealthy", "#FF0000"
    elif aqi <= 300:
        return "Very Unhealthy", "#8F3F97"
    else:
        return "Hazardous", "#7E0023"


async def fetch_station_data(
    station_id: str, 
    start_date: str, 
    end_date: str
) -> List[Dict[str, Any]]:
    """Fetch historical data from Air4Thai API"""
    
    params = {
        "stationID": station_id,
        "param": "PM25,PM10,O3,CO,NO2,SO2,WS,WD,TEMP,RH",
        "type": "hr",
        "sdate": start_date,
        "edate": end_date,
        "stime": "00",
        "etime": "23"
    }
    
    url = f"{AIR4THAI_BASE_URL}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("result") == "OK" and data.get("stations"):
                    return data["stations"][0].get("data", [])
    except Exception as e:
        print(f"Error fetching data for station {station_id}: {e}")
    
    return []


async def import_data():
    """Main import function"""
    
    print("🚀 Starting AQI data import from Air4Thai...")
    
    # Parse database URL
    db_url = DATABASE_URL.replace("postgresql://", "")
    auth, host_db = db_url.split("@")
    user, password = auth.split(":")
    host_port, db = host_db.split("/")
    host = host_port.split(":")[0]
    port = int(host_port.split(":")[1]) if ":" in host_port else 5432
    
    # Connect to database
    print(f"📦 Connecting to database at {host}:{port}/{db}...")
    
    try:
        conn = await asyncpg.connect(
            user=user,
            password=password,
            database=db,
            host=host,
            port=port
        )
        print("✅ Database connected")
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        print("   Make sure PostgreSQL is running and the database is initialized.")
        return
    
    try:
        # Clear existing data
        print("🗑️  Clearing existing measurement data...")
        await conn.execute("DELETE FROM aqi_measurements")
        await conn.execute("DELETE FROM daily_aqi_summary")
        await conn.execute("DELETE FROM stations")
        
        # Insert stations
        print("📍 Inserting stations...")
        for station_code, name, name_th, province, province_th, lat, lon in STATIONS:
            # Create the POINT WKT directly - avoid type confusion in SQL
            point_wkt = f"POINT({lon} {lat})"
            await conn.execute("""
                INSERT INTO stations (station_code, name, name_th, province, province_th, 
                                     latitude, longitude, location, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, ST_GeogFromText($8), TRUE)
                ON CONFLICT (station_code) DO UPDATE SET
                    name = EXCLUDED.name,
                    name_th = EXCLUDED.name_th,
                    province = EXCLUDED.province,
                    province_th = EXCLUDED.province_th,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude
            """, station_code, name, name_th, province, province_th, float(lat), float(lon), point_wkt)
        
        print(f"   Inserted {len(STATIONS)} stations")
        
        # Calculate date range (last 2 months of data)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=70)  # ~2.5 months
        
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        
        print(f"📅 Fetching data from {start_str} to {end_str}...")
        
        total_records = 0
        
        for station_code, name, *_ in STATIONS:
            print(f"   📡 Fetching {name} ({station_code})...")
            
            # Get station ID from database
            station_id = await conn.fetchval(
                "SELECT id FROM stations WHERE station_code = $1",
                station_code
            )
            
            if not station_id:
                print(f"      ⚠️ Station {station_code} not found in database")
                continue
            
            # Fetch data from API
            data = await fetch_station_data(station_code, start_str, end_str)
            
            if not data:
                print(f"      ⚠️ No data received for {station_code}")
                continue
            
            # Insert measurements
            records_inserted = 0
            for record in data:
                try:
                    datetime_str = record.get("DATETIMEDATA")
                    pm25 = record.get("PM25")
                    
                    if datetime_str is None:
                        continue
                    
                    measured_at = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
                    
                    # Calculate AQI from PM2.5
                    aqi = calculate_aqi_from_pm25(pm25) if pm25 else None
                    aqi_level, aqi_color = get_aqi_level(aqi)
                    
                    await conn.execute("""
                        INSERT INTO aqi_measurements (
                            station_id, measured_at, aqi, aqi_level, aqi_color,
                            pm25, pm10, o3, co, no2, so2,
                            temperature, humidity, wind_speed, wind_direction,
                            data_source, is_valid
                        ) VALUES (
                            $1, $2, $3, $4, $5,
                            $6, $7, $8, $9, $10, $11,
                            $12, $13, $14, $15,
                            'air4thai', TRUE
                        )
                    """,
                        station_id,
                        measured_at,
                        aqi,
                        aqi_level,
                        aqi_color,
                        pm25,
                        record.get("PM10"),
                        record.get("O3"),
                        record.get("CO"),
                        record.get("NO2"),
                        record.get("SO2"),
                        record.get("TEMP") if record.get("TEMP") != 0 else None,
                        record.get("RH") if record.get("RH") != 0 else None,
                        record.get("WS") if record.get("WS") != 0 else None,
                        record.get("WD") if record.get("WD") != 0 else None
                    )
                    records_inserted += 1
                    
                except Exception as e:
                    # Skip invalid records
                    continue
            
            print(f"      ✅ Inserted {records_inserted} records")
            total_records += records_inserted
            
            # Small delay to be nice to the API
            await asyncio.sleep(0.5)
        
        # Generate daily summaries
        print("📊 Generating daily summaries...")
        await conn.execute("""
            INSERT INTO daily_aqi_summary (
                station_id, date, aqi_avg, aqi_max, aqi_min,
                pm25_avg, pm25_max, pm25_min, dominant_pollutant,
                reading_count, hours_unhealthy, hours_hazardous
            )
            SELECT 
                station_id,
                DATE(measured_at) as date,
                ROUND(AVG(aqi)::numeric, 2) as aqi_avg,
                MAX(aqi) as aqi_max,
                MIN(aqi) as aqi_min,
                ROUND(AVG(pm25)::numeric, 2) as pm25_avg,
                ROUND(MAX(pm25)::numeric, 2) as pm25_max,
                ROUND(MIN(pm25)::numeric, 2) as pm25_min,
                'PM2.5' as dominant_pollutant,
                COUNT(*) as reading_count,
                COUNT(*) FILTER (WHERE aqi > 100) as hours_unhealthy,
                COUNT(*) FILTER (WHERE aqi > 300) as hours_hazardous
            FROM aqi_measurements
            WHERE pm25 IS NOT NULL
            GROUP BY station_id, DATE(measured_at)
            ON CONFLICT (station_id, date) DO UPDATE SET
                aqi_avg = EXCLUDED.aqi_avg,
                aqi_max = EXCLUDED.aqi_max,
                aqi_min = EXCLUDED.aqi_min,
                pm25_avg = EXCLUDED.pm25_avg,
                pm25_max = EXCLUDED.pm25_max,
                pm25_min = EXCLUDED.pm25_min,
                reading_count = EXCLUDED.reading_count,
                hours_unhealthy = EXCLUDED.hours_unhealthy,
                hours_hazardous = EXCLUDED.hours_hazardous
        """)
        
        summary_count = await conn.fetchval("SELECT COUNT(*) FROM daily_aqi_summary")
        print(f"   ✅ Generated {summary_count} daily summaries")
        
        print(f"\n🎉 Import complete! Total records: {total_records}")
        
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(import_data())
