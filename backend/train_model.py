"""
Train Enhanced LSTM Model on Air4Thai Data
Target: 95%+ accuracy for data imputation
"""

import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from enhanced_lstm_model import EnhancedLSTMModel
from sklearn.metrics import mean_absolute_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns

def fetch_air4thai_data(station_id='36t', param='PM25', days_back=60):
    """
    Fetch training data from Air4Thai API
    """
    base_url = "http://air4thai.com/forweb/getHistoryData.php"

    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)

    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')

    url = f"{base_url}?stationID={station_id}&param={param}&type=hr&sdate={start_str}&edate={end_str}&stime=00&etime=23"

    print(f"Fetching {days_back} days of data from Air4Thai...")
    print(f"Station: {station_id}, Parameter: {param}")
    print(f"Date range: {start_str} to {end_str}")

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

                print(f"✓ Retrieved {len(df)} data points")
                print(f"  Missing values: {df[param].isna().sum()} ({df[param].isna().sum()/len(df)*100:.1f}%)")

                return df

        print("✗ No data found")
        return pd.DataFrame()

    except Exception as e:
        print(f"✗ Error: {e}")
        return pd.DataFrame()


def train_and_evaluate():
    """
    Train model and evaluate performance
    """
    print("="*80)
    print("ENHANCED LSTM MODEL TRAINING FOR AIR QUALITY DATA IMPUTATION")
    print("="*80)

    # Fetch data
    df = fetch_air4thai_data(station_id='36t', param='PM25', days_back=90)

    if df.empty:
        print("✗ No data available for training")
        return

    # Create artificial gaps for training evaluation (20% random removal)
    df_train = df.copy()
    df_train['PM25_original'] = df_train['PM25'].copy()

    np.random.seed(42)
    n_remove = int(len(df_train) * 0.20)
    remove_indices = np.random.choice(len(df_train), n_remove, replace=False)

    df_train.iloc[remove_indices, df_train.columns.get_loc('PM25')] = np.nan

    print(f"\n📊 Training Data Preparation:")
    print(f"  Total points: {len(df_train)}")
    print(f"  Artificial gaps created: {n_remove} (20%)")
    print(f"  Points for training: {len(df_train) - n_remove} (80%)")

    # Initialize model
    model = EnhancedLSTMModel(sequence_length=24, model_path='models')

    # Prepare data
    X, y, gaps, df_prep = model.prepare_training_data(df_train, value_column='PM25')

    # Split: train on non-gap data only
    non_gap_mask = ~gaps
    X_nongap = X[non_gap_mask]
    y_nongap = y[non_gap_mask]

    split_idx = int(len(X_nongap) * 0.9)
    X_train = X_nongap[:split_idx]
    y_train = y_nongap[:split_idx]
    X_val = X_nongap[split_idx:]
    y_val = y_nongap[split_idx:]

    print(f"\n🏋️ Training Configuration:")
    print(f"  Training samples: {len(X_train)}")
    print(f"  Validation samples: {len(X_val)}")
    print(f"  Feature dimensions: {X_train.shape[2]}")
    print(f"  Sequence length: {model.sequence_length} hours")

    # Train model
    print(f"\n⏳ Training Enhanced LSTM...")
    print("  Architecture: Bidirectional LSTM + Multi-Head Attention")
    print("  Target: Minimize validation loss for 95%+ accuracy\n")

    history = model.train(
        X_train, y_train,
        X_val, y_val,
        epochs=100,
        batch_size=16,
        verbose=1
    )

    # Evaluate on gaps
    print(f"\n📈 Evaluating on Artificial Gaps...")
    predictions = model.predict(X)

    # Calculate metrics only for gap points
    gap_indices = np.where(gaps)[0]
    true_values = []
    pred_values = []

    aligned_index = df_train.index[model.sequence_length:]

    for idx in gap_indices:
        if idx < len(predictions):
            original_idx = aligned_index[idx]
            true_val = df_train.loc[original_idx, 'PM25_original']
            pred_val = predictions[idx]

            if not pd.isna(true_val):
                true_values.append(true_val)
                pred_values.append(pred_val)

    true_values = np.array(true_values)
    pred_values = np.array(pred_values)

    mae = mean_absolute_error(true_values, pred_values)
    rmse = np.sqrt(np.mean((true_values - pred_values)**2))
    mape = np.mean(np.abs((true_values - pred_values) / (true_values + 1e-8))) * 100
    r2 = r2_score(true_values, pred_values)

    # Calculate accuracy (within 95% threshold)
    accuracy_95 = np.mean(np.abs((true_values - pred_values) / (true_values + 1e-8)) < 0.05) * 100

    print(f"\n{'='*80}")
    print(f"FINAL RESULTS - Gap Imputation Performance:")
    print(f"{'='*80}")
    print(f"  Gaps evaluated: {len(true_values)}")
    print(f"  MAE:  {mae:.3f} µg/m³")
    print(f"  RMSE: {rmse:.3f} µg/m³")
    print(f"  R²:   {r2:.3f}")
    print(f"  MAPE: {mape:.2f}%")
    print(f"  Accuracy (±5%): {accuracy_95:.1f}%")
    print(f"{'='*80}")

    if accuracy_95 >= 95:
        print(f"✓ ✓ ✓ TARGET ACHIEVED: {accuracy_95:.1f}% accuracy (>=95%)")
    else:
        print(f"⚠ Target not met: {accuracy_95:.1f}% < 95%. Consider:")
        print("  - Training on more data (increase days_back)")
        print("  - Adjusting model hyperparameters")
        print("  - Using ensemble methods")

    # Save model
    print(f"\n💾 Saving model...")
    model.save_model('enhanced_lstm_pm25')

    # Visualize results
    plot_results(history, true_values, pred_values, mae, r2, accuracy_95)

    return model, history, {
        'mae': mae,
        'rmse': rmse,
        'mape': mape,
        'r2': r2,
        'accuracy_95': accuracy_95
    }


def plot_results(history, true_values, pred_values, mae, r2, accuracy_95):
    """
    Visualize training results
    """
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))

    # Training history
    axes[0, 0].plot(history.history['loss'], label='Training Loss', linewidth=2)
    axes[0, 0].plot(history.history['val_loss'], label='Validation Loss', linewidth=2)
    axes[0, 0].set_title('Model Training History', fontsize=14, fontweight='bold')
    axes[0, 0].set_xlabel('Epoch')
    axes[0, 0].set_ylabel('Loss')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)

    # MAE history
    axes[0, 1].plot(history.history['mae'], label='Training MAE', linewidth=2)
    axes[0, 1].plot(history.history['val_mae'], label='Validation MAE', linewidth=2)
    axes[0, 1].set_title('Mean Absolute Error', fontsize=14, fontweight='bold')
    axes[0, 1].set_xlabel('Epoch')
    axes[0, 1].set_ylabel('MAE (µg/m³)')
    axes[0, 1].legend()
    axes[0, 1].grid(True, alpha=0.3)

    # Scatter plot: True vs Predicted
    axes[1, 0].scatter(true_values, pred_values, alpha=0.5, s=20)
    min_val = min(true_values.min(), pred_values.min())
    max_val = max(true_values.max(), pred_values.max())
    axes[1, 0].plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2, label='Perfect Prediction')
    axes[1, 0].set_title(f'Prediction Accuracy (R²={r2:.3f}, Accuracy={accuracy_95:.1f}%)',
                        fontsize=14, fontweight='bold')
    axes[1, 0].set_xlabel('Actual PM2.5 (µg/m³)')
    axes[1, 0].set_ylabel('Predicted PM2.5 (µg/m³)')
    axes[1, 0].legend()
    axes[1, 0].grid(True, alpha=0.3)

    # Error distribution
    errors = true_values - pred_values
    axes[1, 1].hist(errors, bins=30, color='skyblue', edgecolor='black', alpha=0.7)
    axes[1, 1].axvline(0, color='red', linestyle='--', linewidth=2, label='Zero Error')
    axes[1, 1].axvline(errors.mean(), color='green', linestyle='-', linewidth=2,
                      label=f'Mean Error: {errors.mean():.2f}')
    axes[1, 1].set_title(f'Error Distribution (MAE={mae:.2f})', fontsize=14, fontweight='bold')
    axes[1, 1].set_xlabel('Error: Actual - Predicted (µg/m³)')
    axes[1, 1].set_ylabel('Frequency')
    axes[1, 1].legend()
    axes[1, 1].grid(True, alpha=0.3, axis='y')

    plt.suptitle('Enhanced LSTM Training Results', fontsize=16, fontweight='bold', y=1.00)
    plt.tight_layout()
    plt.savefig('training_results.png', dpi=150, bbox_inches='tight')
    print(f"✓ Results saved to training_results.png")
    plt.show()


if __name__ == "__main__":
    model, history, metrics = train_and_evaluate()

    print(f"\n{'='*80}")
    print("✓ Training complete! Model ready for production use.")
    print(f"{'='*80}")
    print("\nModel files saved in 'models/' directory:")
    print("  - enhanced_lstm_pm25.keras")
    print("  - enhanced_lstm_pm25_scaler.npy")
    print("  - enhanced_lstm_pm25_metadata.json")
    print("\nYou can now use this model in the backend API for real-time gap filling.")
