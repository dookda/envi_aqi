"""
Simple script to test database insertion
"""
import asyncio
from datetime import datetime
from database import AsyncSessionLocal, AirQualityMeasurement

async def test_insert():
    """Test inserting data into the database"""

    # Create a test measurement
    measurement = AirQualityMeasurement(
        station_id='01t',
        station_name='Bang Khen, Bangkok',
        parameter='PM25',
        value=45.5,
        unit='μg/m³',
        timestamp=datetime.now(),
        latitude=13.8267,
        longitude=100.6105
    )

    # Insert into database
    async with AsyncSessionLocal() as session:
        try:
            session.add(measurement)
            await session.commit()
            print(f"✓ Successfully inserted measurement!")
            print(f"  Station: {measurement.station_name}")
            print(f"  Parameter: {measurement.parameter}")
            print(f"  Value: {measurement.value} {measurement.unit}")
            print(f"  Timestamp: {measurement.timestamp}")

            # Query to verify
            await session.refresh(measurement)
            print(f"  Database ID: {measurement.id}")

        except Exception as e:
            await session.rollback()
            print(f"✗ Error inserting measurement: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_insert())
