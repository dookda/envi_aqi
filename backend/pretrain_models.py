"""
Pre-train LSTM models for all air quality parameters
Run this script to create initial models before deployment
"""

import asyncio
import pandas as pd
from datetime import datetime, timedelta
from model_manager import get_model_manager
from database import get_db, AirQualityMeasurement
from sqlalchemy import select
import httpx

async def fetch_historical_data_from_api(station_id: str, parameter: str, days: int = 90):
    """
    Fetch historical data from Air4Thai API for training
    """
    print(f"\n📡 Fetching {days} days of {parameter} data for station {station_id}...")

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    url = "http://air4thai.com/forweb/getHistoryData.php"
    params = {
        "stationID": station_id,
        "param": parameter,
        "type": "hr",
        "sdate": start_date.strftime("%Y-%m-%d"),
        "edate": end_date.strftime("%Y-%m-%d"),
        "stime": "00",
        "etime": "23"
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if 'stations' in data and len(data['stations']) > 0:
                records = data['stations'][0]['data']
                df = pd.DataFrame(records)

                # Convert to proper format
                df['DATETIMEDATA'] = pd.to_datetime(df['DATETIMEDATA'])
                df = df.set_index('DATETIMEDATA')
                df[parameter] = pd.to_numeric(df.get(parameter, df.get('PM25', 0)), errors='coerce')

                print(f"✓ Fetched {len(df)} records")
                return df

    except Exception as e:
        print(f"✗ Error fetching data: {e}")

    return None


async def fetch_historical_data_from_db(parameter: str, days: int = 90):
    """
    Fetch historical data from database for training
    """
    print(f"\n💾 Fetching {days} days of {parameter} data from database...")

    try:
        async for db in get_db():
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)

            stmt = select(AirQualityMeasurement).where(
                AirQualityMeasurement.parameter == parameter,
                AirQualityMeasurement.timestamp >= start_date,
                AirQualityMeasurement.timestamp <= end_date
            ).order_by(AirQualityMeasurement.timestamp)

            result = await db.execute(stmt)
            measurements = result.scalars().all()

            if measurements:
                df = pd.DataFrame([
                    {
                        'DATETIMEDATA': m.timestamp,
                        parameter: m.value
                    }
                    for m in measurements
                ])
                df = df.set_index('DATETIMEDATA')
                print(f"✓ Fetched {len(df)} records from database")
                return df

    except Exception as e:
        print(f"⚠ Database not available or no data: {e}")

    return None


async def pretrain_all_models(use_database: bool = False, force_retrain: bool = False):
    """
    Pre-train models for all parameters

    Args:
        use_database: Use database instead of API
        force_retrain: Retrain even if models exist
    """
    manager = get_model_manager()

    # Parameters to train
    parameters = ['PM25', 'PM10', 'O3', 'CO', 'NO2', 'SO2']

    # Default stations for different parameters
    training_stations = {
        'PM25': '01t',  # Bang Khen, Bangkok
        'PM10': '01t',
        'O3': '50t',    # Chiang Mai
        'CO': '01t',
        'NO2': '01t',
        'SO2': '01t'
    }

    print("=" * 70)
    print("🚀 Pre-training LSTM Models for Air Quality Gap Filling")
    print("=" * 70)

    # Check existing models
    existing_models = manager.list_available_models()
    if existing_models and not force_retrain:
        print(f"\n✓ Found {len(existing_models)} existing models:")
        for param, metadata in existing_models.items():
            print(f"  - {param}: Trained on {metadata.get('trained_date', 'Unknown')}")

    results = {}

    for parameter in parameters:
        print(f"\n{'='*70}")
        print(f"Parameter: {parameter}")
        print(f"{'='*70}")

        # Check if model exists
        if manager.model_exists(parameter) and not force_retrain:
            print(f"✓ Model already exists for {parameter}. Skipping...")
            results[parameter] = "existing"
            continue

        # Fetch training data
        if use_database:
            training_data = await fetch_historical_data_from_db(parameter, days=90)
        else:
            station = training_stations.get(parameter, '01t')
            training_data = await fetch_historical_data_from_api(station, parameter, days=90)

        if training_data is None or len(training_data) < 100:
            print(f"✗ Insufficient training data for {parameter}")
            results[parameter] = "failed"
            continue

        # Train model
        try:
            model = manager.train_and_save_model(
                data=training_data,
                parameter=parameter,
                value_column=parameter,
                sequence_length=24,
                epochs=30,  # Reduced for faster training, increase for production
                batch_size=32
            )
            results[parameter] = "success"
            print(f"✅ Successfully trained model for {parameter}")

        except Exception as e:
            print(f"✗ Error training model for {parameter}: {e}")
            results[parameter] = "error"

    # Summary
    print(f"\n{'='*70}")
    print("📊 Training Summary")
    print(f"{'='*70}")

    for parameter, status in results.items():
        emoji = {
            "success": "✅",
            "existing": "✓",
            "failed": "✗",
            "error": "⚠"
        }.get(status, "?")
        print(f"{emoji} {parameter}: {status}")

    print(f"\n✨ Pre-training complete!")
    print(f"📁 Models saved to: {manager.models_dir}")

    # List all available models
    final_models = manager.list_available_models()
    if final_models:
        print(f"\n🎯 Available models ({len(final_models)}):")
        for param, metadata in final_models.items():
            mae = metadata.get('mae', 'N/A')
            accuracy = metadata.get('accuracy', 'N/A')
            print(f"  • {param}: MAE={mae}, Accuracy={accuracy}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Pre-train LSTM models for air quality gap filling')
    parser.add_argument('--database', action='store_true', help='Use database instead of API')
    parser.add_argument('--force', action='store_true', help='Force retrain even if models exist')
    parser.add_argument('--parameter', type=str, help='Train specific parameter only')

    args = parser.parse_args()

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║          Air Quality LSTM Model Pre-training                 ║
║                                                              ║
║  This script will fetch historical data and train LSTM      ║
║  models for predicting air quality gaps.                    ║
╚══════════════════════════════════════════════════════════════╝

Configuration:
  • Data source: {'Database' if args.database else 'Air4Thai API'}
  • Force retrain: {'Yes' if args.force else 'No'}
  • Target: {'All parameters' if not args.parameter else args.parameter}

""")

    # Run pre-training
    asyncio.run(pretrain_all_models(
        use_database=args.database,
        force_retrain=args.force
    ))
