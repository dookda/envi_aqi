"""
Train LSTM model with fresh data from Air4Thai API
Fetches recent data and trains gap filling model
"""

import httpx
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from lstm_gap_filler import LSTMGapFiller
import warnings
warnings.filterwarnings('ignore')

# Configuration
STATIONS = ["01t", "02t", "03t", "04t", "05t"]  # Bangkok stations
PARAM = "PM25"
DAYS_BACK = 90  # Fetch last 90 days

AIR4THAI_BASE_URL = "http://air4thai.com/forweb/getHistoryData.php"

def fetch_station_data(station_id, days=90):
    """Fetch historical data for a station"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    params = {
        "stationID": station_id,
        "param": PARAM,
        "type": "hr",
        "sdate": start_date.strftime("%Y-%m-%d"),
        "edate": end_date.strftime("%Y-%m-%d"),
        "stime": "00",
        "etime": "23"
    }

    print(f"📡 Fetching {days} days of data for station {station_id}...")

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(AIR4THAI_BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

        if data.get('result') == 'OK' and data.get('stations'):
            station_data = data['stations'][0]['data']
            df = pd.DataFrame(station_data)

            # Convert datetime
            df['DATETIMEDATA'] = pd.to_datetime(df['DATETIMEDATA'])
            df.set_index('DATETIMEDATA', inplace=True)

            # Extract PM25 values
            df['PM25'] = pd.to_numeric(df[PARAM], errors='coerce')

            print(f"✅ Fetched {len(df)} records")
            print(f"   Missing: {df['PM25'].isna().sum()} ({df['PM25'].isna().sum()/len(df)*100:.1f}%)")

            return df[['PM25']]
        else:
            print(f"❌ No data for station {station_id}")
            return None

    except Exception as e:
        print(f"❌ Error fetching station {station_id}: {e}")
        return None

def create_artificial_gaps(data, gap_percentage=0.25):
    """Create artificial gaps for training"""
    data_clean = data.copy()
    data_with_gaps = data.copy()

    # Remove existing NaNs first
    data_clean = data_clean.dropna()
    data_with_gaps = data_with_gaps.dropna()

    # Randomly remove gap_percentage of data
    n_gaps = int(len(data_clean) * gap_percentage)
    gap_indices = np.random.choice(len(data_clean), size=n_gaps, replace=False)

    data_with_gaps.iloc[gap_indices] = np.nan

    print(f"📊 Created {n_gaps} artificial gaps ({gap_percentage*100}% of data)")

    return data_clean, data_with_gaps

def train_model():
    """Main training function"""
    print("=" * 60)
    print("🚀 LSTM Gap Filler Training with Fresh Data")
    print("=" * 60)

    # Fetch data from multiple stations
    all_data = []

    for station_id in STATIONS:
        df = fetch_station_data(station_id, days=DAYS_BACK)
        if df is not None and len(df) > 0:
            all_data.append(df)

    if not all_data:
        print("❌ No data fetched. Exiting.")
        return

    # Combine all station data
    print(f"\n📚 Combining data from {len(all_data)} stations...")
    combined_data = pd.concat(all_data)
    combined_data = combined_data.sort_index()

    print(f"✅ Total records: {len(combined_data)}")
    print(f"   Date range: {combined_data.index.min()} to {combined_data.index.max()}")

    # Create training data with artificial gaps
    print("\n🎲 Creating artificial gaps...")
    original_data, gapped_data = create_artificial_gaps(combined_data, gap_percentage=0.25)

    # Split into train/test
    split_idx = int(len(original_data) * 0.8)
    train_original = original_data.iloc[:split_idx]
    train_gapped = gapped_data.iloc[:split_idx]
    test_original = original_data.iloc[split_idx:]
    test_gapped = gapped_data.iloc[split_idx:]

    print(f"\n📊 Data split:")
    print(f"   Training: {len(train_original)} records")
    print(f"   Testing: {len(test_original)} records")

    # Train model
    print("\n🤖 Training LSTM model...")
    print("-" * 60)

    filler = LSTMGapFiller(sequence_length=24)

    history = filler.train(
        train_gapped,
        train_original,
        epochs=50,
        batch_size=32
    )

    # Evaluate
    print("\n📈 Evaluating model...")
    results = filler.evaluate(test_gapped, test_original)

    print("\n" + "=" * 60)
    print("🎯 RESULTS")
    print("=" * 60)
    print(f"MAE:  {results['mae']:.2f} μg/m³")
    print(f"RMSE: {results['rmse']:.2f} μg/m³")
    print(f"R²:   {results['r2']:.4f}")
    print("=" * 60)

    # Save model
    model_path = 'models/lstm_gap_filler.h5'
    print(f"\n💾 Saving model to {model_path}...")
    filler.save_model(model_path)

    print("\n✅ Training complete!")
    print(f"\n📝 To use this model:")
    print(f"   1. Restart backend server")
    print(f"   2. Test with: http://localhost:5173/historical")
    print(f"   3. Enable 'AI Gap Filling' checkbox")

if __name__ == "__main__":
    train_model()
