"""
Script to fetch all monitoring stations from Air4Thai API
and save them to the database.

Usage:
    python fetch_all_stations.py
"""
import asyncio
import aiohttp
import logging
from sqlalchemy import select
from database import AsyncSessionLocal, MonitoringStation

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Air4Thai station list API
STATIONS_API_URL = "http://air4thai.pcd.go.th/forappV2/getAQI_JSON.php"


async def fetch_all_stations():
    """
    Fetch all monitoring stations from Air4Thai API.

    Returns:
        List of station dictionaries
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(STATIONS_API_URL, timeout=30) as response:
                if response.status == 200:
                    data = await response.json()

                    if isinstance(data, dict) and data.get('stations'):
                        stations = data['stations']
                        logger.info(f"Retrieved {len(stations)} stations from Air4Thai API")

                        # Parse stations
                        parsed_stations = []
                        for station in stations:
                            try:
                                station_id = station.get('stationID')
                                name_en = station.get('nameEN')
                                name_th = station.get('nameTH')
                                area_en = station.get('areaEN')
                                lat = station.get('lat')
                                lon = station.get('long')

                                if station_id and lat and lon:
                                    # Determine city and province from area name
                                    city = area_en.split(',')[0].strip() if area_en else ''
                                    province = area_en.split(',')[-1].strip() if area_en else ''

                                    parsed_stations.append({
                                        'id': station_id,
                                        'name': name_en or name_th or station_id,
                                        'latitude': float(lat),
                                        'longitude': float(lon),
                                        'address': area_en,
                                        'city': city,
                                        'province': province,
                                        'is_active': True
                                    })
                            except (ValueError, TypeError, AttributeError) as e:
                                logger.warning(f"Error parsing station {station.get('stationID')}: {e}")
                                continue

                        return parsed_stations
                    else:
                        logger.error("Invalid response format from API")
                        return []
                else:
                    logger.error(f"HTTP error {response.status}")
                    return []
    except Exception as e:
        logger.error(f"Error fetching stations: {e}")
        return []


async def save_stations_to_db(stations: list):
    """
    Save stations to the database.

    Args:
        stations: List of station dictionaries
    """
    async with AsyncSessionLocal() as session:
        try:
            new_count = 0
            updated_count = 0

            for station_data in stations:
                # Check if station already exists
                stmt = select(MonitoringStation).where(
                    MonitoringStation.id == station_data['id']
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    # Update existing station
                    existing.name = station_data['name']
                    existing.latitude = station_data['latitude']
                    existing.longitude = station_data['longitude']
                    existing.address = station_data['address']
                    existing.city = station_data['city']
                    existing.province = station_data['province']
                    existing.is_active = station_data['is_active']
                    updated_count += 1
                else:
                    # Add new station
                    station = MonitoringStation(**station_data)
                    session.add(station)
                    new_count += 1

            await session.commit()

            logger.info(f"Stations saved to database:")
            logger.info(f"  New stations: {new_count}")
            logger.info(f"  Updated stations: {updated_count}")
            logger.info(f"  Total stations: {new_count + updated_count}")

        except Exception as e:
            await session.rollback()
            logger.error(f"Error saving stations to database: {e}")
            raise


async def export_stations_to_file(stations: list, filename: str = "stations.txt"):
    """
    Export stations to a text file for reference.

    Args:
        stations: List of station dictionaries
        filename: Output filename
    """
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"{'='*80}\n")
            f.write(f"Air4Thai Monitoring Stations\n")
            f.write(f"Total: {len(stations)} stations\n")
            f.write(f"{'='*80}\n\n")

            # Group by province
            by_province = {}
            for station in stations:
                province = station['province'] or 'Unknown'
                if province not in by_province:
                    by_province[province] = []
                by_province[province].append(station)

            for province in sorted(by_province.keys()):
                f.write(f"\n{province}\n")
                f.write(f"{'-'*80}\n")

                for station in sorted(by_province[province], key=lambda x: x['name']):
                    f.write(f"  ID: {station['id']:<10} ")
                    f.write(f"Name: {station['name']:<50} ")
                    f.write(f"({station['latitude']:.4f}, {station['longitude']:.4f})\n")

        logger.info(f"Stations exported to {filename}")

    except Exception as e:
        logger.error(f"Error exporting stations: {e}")


async def main():
    """Main entry point."""
    logger.info("Fetching all monitoring stations from Air4Thai...")

    # Fetch stations
    stations = await fetch_all_stations()

    if not stations:
        logger.error("No stations retrieved. Exiting.")
        return

    # Save to database
    logger.info("Saving stations to database...")
    await save_stations_to_db(stations)

    # Export to file for reference
    logger.info("Exporting stations to file...")
    await export_stations_to_file(stations, "backend/all_stations.txt")

    logger.info("Done!")


if __name__ == '__main__':
    asyncio.run(main())
