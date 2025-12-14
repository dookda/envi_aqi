"""
Quick Training Script - Test Enhanced LSTM Model
Uses fewer epochs and less data for faster validation
"""

import sys
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from enhanced_lstm_model import EnhancedLSTMModel
from sklearn.metrics import mean_absolute_error, r2_score

def fetch_air4thai_data(station_id='36t', param='PM25', days_back=30):
    """Fetch training data from Air4Thai API"""
    base_url = "http://air4thai.com/forweb/getHistoryData.php"

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)

    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')

    url = f"{base_url}?stationID={station_id}&param={param}&type=hr&sdate={start_str}&edate={end_str}&stime=00&etime=23"

    print(f"\n🔍 Fetching {days_back} days of data from Air4Thai...", flush=True)
    print(f"   Station: {station_id}, Parameter: {param}", flush=True)
    print(f"   Date range: {start_str} to {end_str}", flush=True)

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()

        if 'stations' in data and len(data['stations']) > 0:
            measurements = data['stations'][0].get('data', [])
            df = pd.DataFrame(measurements)

            if len(df) > 0:
                df['DATETIMEDATA'] = pd.to_datetime(df['DATETIMEDATA'])
                df.set_index('DATETIMEDATA', inplace=True)
                df[param] = pd.to_numeric(df[param], errors='coerce')

                print(f"✓ Retrieved {len(df)} data points", flush=True)
                print(f"  Missing values: {df[param].isna().sum()} ({df[param].isna().sum()/len(df)*100:.1f}%)", flush=True)

                return df

    except Exception as e:
        print(f"Error fetching data: {e}", flush=True)
        return None

def quick_train():
    """Quick training with fewer epochs"""
    print("\n" + "="*80, flush=True)
    print("QUICK ENHANCED LSTM TRAINING - VALIDATION RUN", flush=True)
    print("="*80 + "\n", flush=True)

    # Fetch data
    df = fetch_air4thai_data(station_id='36t', param='PM25', days_back=30)

    if df is None or len(df) < 100:
        print("❌ Insufficient data for training", flush=True)
        return None, None, None

    # Prepare training data
    print(f"\n📊 Preparing Training Data:", flush=True)
    print(f"  Total points: {len(df)}", flush=True)

    # Create artificial gaps (20%) for evaluation
    np.random.seed(42)
    n_gaps = int(len(df) * 0.20)
    gap_indices = np.random.choice(df.index[24:], n_gaps, replace=False)

    df_train = df.copy()
    original_values = df_train.loc[gap_indices, 'PM25'].copy()
    df_train.loc[gap_indices, 'PM25'] = np.nan

    print(f"  Artificial gaps created: {n_gaps} (20%)", flush=True)
    print(f"  Points for training: {len(df) - n_gaps} (80%)", flush=True)

    # Initialize and train model
    print(f"\n🤖 Building Enhanced LSTM Model...", flush=True)
    model = EnhancedLSTMModel(sequence_length=24, model_path='models')

    # Prepare data
    X, y, gaps, df_prep = model.prepare_training_data(df_train, value_column='PM25')

    # Split data
    non_gap_mask = ~gaps
    X_nongap = X[non_gap_mask]
    y_nongap = y[non_gap_mask]

    split_idx = int(len(X_nongap) * 0.9)
    X_train = X_nongap[:split_idx]
    y_train = y_nongap[:split_idx]
    X_val = X_nongap[split_idx:]
    y_val = y_nongap[split_idx:]

    print(f"  Training samples: {len(X_train)}", flush=True)
    print(f"  Validation samples: {len(X_val)}", flush=True)

    # Train (only 20 epochs for quick test)
    print(f"\n🚀 Training Model (20 epochs)...", flush=True)
    print("  This may take 2-5 minutes...", flush=True)
    sys.stdout.flush()

    history = model.train(X_train, y_train, X_val, y_val, epochs=20, batch_size=16, verbose=1)

    print(f"\n✓ Training Complete!", flush=True)
    print(f"  Epochs trained: {len(history.history['loss'])}", flush=True)
    print(f"  Final train loss: {history.history['loss'][-1]:.4f}", flush=True)
    print(f"  Final val loss: {history.history['val_loss'][-1]:.4f}", flush=True)

    # Evaluate on gap points
    print(f"\n📈 Evaluating on Artificial Gaps:", flush=True)

    # Get predictions for gap points
    gap_mask = gaps.copy()
    X_gaps = X[gap_mask]

    if len(X_gaps) > 0:
        predictions = model.predict(X_gaps)

        # Get true values
        aligned_index = df.index[model.sequence_length:]
        gap_indices_aligned = aligned_index[gap_mask]
        true_values = original_values.loc[gap_indices_aligned].values
        pred_values = predictions[:len(true_values)]

        # Calculate metrics
        mae = mean_absolute_error(true_values, pred_values)
        rmse = np.sqrt(np.mean((true_values - pred_values)**2))
        r2 = r2_score(true_values, pred_values)
        mape = np.mean(np.abs((true_values - pred_values) / (true_values + 1e-8))) * 100

        # Calculate 95% accuracy (±5% threshold)
        accuracy_95 = np.mean(np.abs((true_values - pred_values) / (true_values + 1e-8)) < 0.05) * 100

        print(f"  MAE: {mae:.2f} μg/m³", flush=True)
        print(f"  RMSE: {rmse:.2f} μg/m³", flush=True)
        print(f"  R² Score: {r2:.4f}", flush=True)
        print(f"  MAPE: {mape:.2f}%", flush=True)
        print(f"  Accuracy (±5%): {accuracy_95:.1f}%", flush=True)

        if accuracy_95 >= 95:
            print(f"\n✅ TARGET ACHIEVED: {accuracy_95:.1f}% accuracy (>=95%)", flush=True)
        else:
            print(f"\n⚠️  Target not met: {accuracy_95:.1f}% < 95% (expected with quick training)", flush=True)
            print(f"   Run full training with 90 days + 100 epochs for best results", flush=True)

        metrics = {
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'mape': mape,
            'accuracy_95': accuracy_95,
            'gaps_evaluated': len(X_gaps)
        }
    else:
        metrics = {}

    # Save model
    print(f"\n💾 Saving Model...", flush=True)
    model.save_model('enhanced_lstm_pm25')

    print(f"\n" + "="*80, flush=True)
    print("QUICK TRAINING COMPLETE!", flush=True)
    print("="*80, flush=True)

    return model, history, metrics

if __name__ == "__main__":
    try:
        model, history, metrics = quick_train()

        if model and metrics:
            print(f"\n📊 Quick Training Summary:", flush=True)
            print(f"   MAE: {metrics.get('mae', 0):.2f} μg/m³", flush=True)
            print(f"   R²: {metrics.get('r2', 0):.4f}", flush=True)
            print(f"   Accuracy (±5%): {metrics.get('accuracy_95', 0):.1f}%", flush=True)
            print(f"\n✓ Model saved to models/enhanced_lstm_pm25.keras", flush=True)
            print(f"\n💡 For production: Run train_model.py with 90 days + 100 epochs", flush=True)

    except Exception as e:
        print(f"\n❌ Training failed: {e}", flush=True)
        import traceback
        traceback.print_exc()
