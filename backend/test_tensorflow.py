"""
Minimal test to verify TensorFlow and model architecture
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from enhanced_lstm_model import EnhancedLSTMModel

print("Testing Enhanced LSTM Model Setup...")
print("=" * 60)

# Create minimal test data
dates = pd.date_range(start=datetime.now() - timedelta(days=5), periods=120, freq='H')
test_data = pd.DataFrame({
    'PM25': np.random.uniform(10, 50, 120)
}, index=dates)

print(f"✓ Created test data: {len(test_data)} points")

# Initialize model
model = EnhancedLSTMModel(sequence_length=24, model_path='models')
print(f"✓ Model initialized")

# Build architecture
model.build_enhanced_model(n_features=17)
print(f"✓ Model architecture built successfully")
print(f"  Parameters: {model.metadata['parameters']:,}")
print(f"  Architecture: {model.metadata['architecture']}")

# Prepare minimal training data
X, y, gaps, df_prep = model.prepare_training_data(test_data, value_column='PM25')
print(f"✓ Data preparation successful")
print(f"  Training samples: {len(X)}")
print(f"  Features per sample: {X.shape[2]}")

# Quick training test (1 epoch)
print(f"\nRunning 1-epoch training test...")
non_gap_mask = ~gaps
X_train = X[non_gap_mask][:50]  # Just 50 samples
y_train = y[non_gap_mask][:50]
X_val = X[non_gap_mask][50:60]  # 10 validation samples
y_val = y[non_gap_mask][50:60]

history = model.train(X_train, y_train, X_val, y_val, epochs=1, batch_size=8, verbose=0)
print(f"✓ Training test completed")
print(f"  Train loss: {history.history['loss'][0]:.4f}")
print(f"  Val loss: {history.history['val_loss'][0]:.4f}")

# Test prediction
predictions = model.predict(X_val)
print(f"✓ Prediction test successful")
print(f"  Generated {len(predictions)} predictions")

# Test model saving
model.save_model('test_model')
print(f"✓ Model save test successful")

print("\n" + "=" * 60)
print("All tests passed! TensorFlow and Enhanced LSTM are working correctly.")
print("\nThe system is ready for full training.")
print("Run: python train_model.py (for 90 days + 100 epochs)")
print("Or:  python quick_train.py (for 30 days + 20 epochs)")
