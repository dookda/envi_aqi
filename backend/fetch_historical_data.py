"""
Script to fetch historical air quality data from Air4Thai API for all stations
and insert it into the TimescaleDB database.

Usage:
    python fetch_historical_data.py --days 90 --batch-size 100

Options:
    --days: Number of days of historical data to fetch (default: 90)
    --batch-size: Number of records to insert per batch (default: 100)
    --stations: Comma-separated list of station IDs (default: all stations)
    --parameters: Comma-separated list of parameters (default: all parameters)
"""
import asyncio
import aiohttp
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
from sqlalchemy import select, and_
from database import AsyncSessionLocal, AirQualityMeasurement, MonitoringStation, Parameter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Air4Thai API configuration
AIR4THAI_API_URL = "http://air4thai.com/forweb/getHistoryData.php"

# Default stations (can be expanded)
DEFAULT_STATIONS = [
    {'id': '01t', 'name': 'Bang Khen, Bangkok', 'lat': 13.8267, 'lon': 100.6105},
    {'id': '02t', 'name': 'Bang Khun Thian, Bangkok', 'lat': 13.6447, 'lon': 100.4225},
    {'id': '03t', 'name': 'Bang Na, Bangkok', 'lat': 13.6683, 'lon': 100.6039},
    {'id': '04t', 'name': 'Boom Rung Muang, Bangkok', 'lat': 13.7486, 'lon': 100.5092},
    {'id': '05t', 'name': 'Chom Thong, Bangkok', 'lat': 13.6803, 'lon': 100.4372},
    {'id': '50t', 'name': 'Chiang Mai', 'lat': 18.7883, 'lon': 98.9853},
    {'id': '52t', 'name': 'Lampang', 'lat': 18.2886, 'lon': 99.4919},
    {'id': '54t', 'name': 'Lamphun', 'lat': 18.5744, 'lon': 99.0083},
]

DEFAULT_PARAMETERS = ['PM25', 'PM10', 'O3', 'CO', 'NO2', 'SO2']


async def fetch_station_data(
    session: aiohttp.ClientSession,
    station_id: str,
    station_name: str,
    parameter: str,
    start_date: str,
    end_date: str,
    lat: float,
    lon: float
) -> List[Dict]:
    """
    Fetch historical data from Air4Thai API for a specific station and parameter.

    Args:
        session: aiohttp session for making requests
        station_id: Station ID
        station_name: Station name
        parameter: Air quality parameter (PM25, PM10, etc.)
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        lat: Latitude of station
        lon: Longitude of station

    Returns:
        List of measurement dictionaries
    """
    params = {
        'stationID': station_id,
        'param': parameter,
        'type': 'hr',
        'sdate': start_date,
        'edate': end_date,
        'stime': '00',
        'etime': '23'
    }

    try:
        async with session.get(AIR4THAI_API_URL, params=params, timeout=30) as response:
            if response.status == 200:
                data = await response.json()

                # Parse the response
                if isinstance(data, dict) and data.get('result') == 'OK':
                    stations = data.get('stations', [])
                    if stations:
                        measurements = []
                        station_data = stations[0].get('data', [])

                        for record in station_data:
                            # Parse datetime
                            datetime_str = record.get('datetime')
                            if datetime_str:
                                try:
                                    timestamp = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M:%S')
                                    value = record.get('value')

                                    # Only add if value is not None and not empty string
                                    if value is not None and value != '':
                                        measurements.append({
                                            'station_id': station_id,
                                            'station_name': station_name,
                                            'parameter': parameter,
                                            'value': float(value),
                                            'unit': get_parameter_unit(parameter),
                                            'timestamp': timestamp,
                                            'latitude': lat,
                                            'longitude': lon
                                        })
                                except (ValueError, TypeError) as e:
                                    logger.warning(f"Error parsing record: {e}")
                                    continue

                        return measurements
                    else:
                        logger.warning(f"No data for station {station_id}, parameter {parameter}")
                        return []
                elif isinstance(data, dict) and data.get('result') == 'Error':
                    logger.error(f"API error for {station_id}/{parameter}: {data.get('error')}")
                    return []
                else:
                    logger.warning(f"Unexpected response format for {station_id}/{parameter}")
                    return []
            else:
                logger.error(f"HTTP error {response.status} for {station_id}/{parameter}")
                return []
    except asyncio.TimeoutError:
        logger.error(f"Timeout fetching data for {station_id}/{parameter}")
        return []
    except Exception as e:
        logger.error(f"Error fetching data for {station_id}/{parameter}: {e}")
        return []


def get_parameter_unit(parameter: str) -> str:
    """Get the unit for a given parameter."""
    units = {
        'PM25': 'μg/m³',
        'PM10': 'μg/m³',
        'O3': 'ppb',
        'CO': 'ppm',
        'NO2': 'ppb',
        'SO2': 'ppb'
    }
    return units.get(parameter, '')


async def insert_measurements_batch(measurements: List[Dict], batch_size: int = 100):
    """
    Insert measurements into the database in batches.

    Args:
        measurements: List of measurement dictionaries
        batch_size: Number of records to insert per batch
    """
    if not measurements:
        return 0

    async with AsyncSessionLocal() as session:
        try:
            inserted_count = 0

            # Process in batches
            for i in range(0, len(measurements), batch_size):
                batch = measurements[i:i + batch_size]

                # Check for existing records to avoid duplicates
                new_records = []
                for measurement in batch:
                    # Check if record already exists
                    stmt = select(AirQualityMeasurement).where(
                        and_(
                            AirQualityMeasurement.station_id == measurement['station_id'],
                            AirQualityMeasurement.parameter == measurement['parameter'],
                            AirQualityMeasurement.timestamp == measurement['timestamp']
                        )
                    )
                    result = await session.execute(stmt)
                    existing = result.scalar_one_or_none()

                    if not existing:
                        new_records.append(AirQualityMeasurement(**measurement))

                if new_records:
                    session.add_all(new_records)
                    await session.commit()
                    inserted_count += len(new_records)
                    logger.info(f"Inserted batch of {len(new_records)} records (total: {inserted_count})")

            return inserted_count
        except Exception as e:
            await session.rollback()
            logger.error(f"Error inserting measurements: {e}")
            raise


async def fetch_and_store_data(
    stations: List[Dict],
    parameters: List[str],
    days: int,
    batch_size: int
):
    """
    Main function to fetch and store historical data.

    Args:
        stations: List of station dictionaries
        parameters: List of parameters to fetch
        days: Number of days of historical data
        batch_size: Batch size for database inserts
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    start_date_str = start_date.strftime('%Y-%m-%d')
    end_date_str = end_date.strftime('%Y-%m-%d')

    logger.info(f"Fetching data from {start_date_str} to {end_date_str}")
    logger.info(f"Stations: {len(stations)}, Parameters: {len(parameters)}")

    total_measurements = 0
    total_inserted = 0

    async with aiohttp.ClientSession() as session:
        for station in stations:
            station_id = station['id']
            station_name = station['name']
            lat = station['lat']
            lon = station['lon']

            logger.info(f"\nProcessing station: {station_name} ({station_id})")

            for parameter in parameters:
                logger.info(f"  Fetching {parameter}...")

                measurements = await fetch_station_data(
                    session,
                    station_id,
                    station_name,
                    parameter,
                    start_date_str,
                    end_date_str,
                    lat,
                    lon
                )

                if measurements:
                    logger.info(f"  Retrieved {len(measurements)} measurements for {parameter}")
                    total_measurements += len(measurements)

                    # Insert into database
                    inserted = await insert_measurements_batch(measurements, batch_size)
                    total_inserted += inserted
                    logger.info(f"  Inserted {inserted} new records for {parameter}")
                else:
                    logger.warning(f"  No data retrieved for {parameter}")

                # Small delay to avoid overwhelming the API
                await asyncio.sleep(1)

    logger.info(f"\n{'='*60}")
    logger.info(f"Data fetch completed!")
    logger.info(f"Total measurements retrieved: {total_measurements}")
    logger.info(f"Total new records inserted: {total_inserted}")
    logger.info(f"Duplicates skipped: {total_measurements - total_inserted}")
    logger.info(f"{'='*60}")


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Fetch historical air quality data from Air4Thai API'
    )
    parser.add_argument(
        '--days',
        type=int,
        default=90,
        help='Number of days of historical data to fetch (default: 90)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=100,
        help='Number of records to insert per batch (default: 100)'
    )
    parser.add_argument(
        '--stations',
        type=str,
        help='Comma-separated list of station IDs (default: all stations)'
    )
    parser.add_argument(
        '--parameters',
        type=str,
        help='Comma-separated list of parameters (default: all parameters)'
    )

    return parser.parse_args()


async def main():
    """Main entry point."""
    args = parse_arguments()

    # Determine which stations to fetch
    if args.stations:
        station_ids = [s.strip() for s in args.stations.split(',')]
        stations = [s for s in DEFAULT_STATIONS if s['id'] in station_ids]
        if not stations:
            logger.error(f"No valid stations found in: {args.stations}")
            return
    else:
        stations = DEFAULT_STATIONS

    # Determine which parameters to fetch
    if args.parameters:
        parameters = [p.strip() for p in args.parameters.split(',')]
    else:
        parameters = DEFAULT_PARAMETERS

    # Fetch and store data
    await fetch_and_store_data(
        stations=stations,
        parameters=parameters,
        days=args.days,
        batch_size=args.batch_size
    )


if __name__ == '__main__':
    asyncio.run(main())
