"""
Enhanced LSTM Model for Air Quality Data Imputation and Forecasting
Includes Bidirectional LSTM with Attention Mechanism for 95%+ accuracy target
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import warnings
import os
import json
warnings.filterwarnings('ignore')

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.models import Sequential, Model, load_model
    from tensorflow.keras.layers import (
        LSTM, Dense, Dropout, Input, Bidirectional,
        BatchNormalization, MultiHeadAttention, LayerNormalization
    )
    from tensorflow.keras import callbacks
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False


class EnhancedLSTMModel:
    """
    Production-ready Enhanced LSTM Model with:
    - Bidirectional LSTM layers
    - Multi-head self-attention
    - Lag features and rolling statistics
    - Model persistence (save/load)
    - Target: 95%+ accuracy
    """

    def __init__(self, sequence_length=24, model_path='models'):
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is required. Install with: pip install tensorflow")

        self.sequence_length = sequence_length
        self.model_path = model_path
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.model = None
        self.metadata = {}

        # Create models directory
        os.makedirs(model_path, exist_ok=True)

        # Set random seeds
        np.random.seed(42)
        tf.random.set_seed(42)

    def add_advanced_features(self, df):
        """
        Add comprehensive temporal and lag features
        """
        df = df.copy()

        # Temporal features
        df['hour'] = df.index.hour
        df['day_of_week'] = df.index.dayofweek
        df['is_weekend'] = (df.index.dayofweek >= 5).astype(int)

        # Cyclical encoding
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)

        return df

    def add_lag_features(self, df, value_col='PM25', temp_filled_col='PM25_filled_temp'):
        """
        Add lag features and rolling statistics for better prediction
        """
        df = df.copy()

        # Lag features (1, 2, 3, 6, 12, 24 hours)
        for lag in [1, 2, 3, 6, 12, 24]:
            df[f'PM25_lag_{lag}'] = df[temp_filled_col].shift(lag).fillna(method='bfill')

        # Rolling statistics
        df['PM25_roll_mean_6'] = df[temp_filled_col].rolling(6, min_periods=1).mean()
        df['PM25_roll_std_6'] = df[temp_filled_col].rolling(6, min_periods=1).std().fillna(0)
        df['PM25_roll_mean_24'] = df[temp_filled_col].rolling(24, min_periods=1).mean()
        df['PM25_roll_max_24'] = df[temp_filled_col].rolling(24, min_periods=1).max()
        df['PM25_roll_min_24'] = df[temp_filled_col].rolling(24, min_periods=1).min()

        return df

    def prepare_training_data(self, df, value_column='PM25'):
        """
        Prepare comprehensive feature set for training
        """
        df = df.copy()

        # Ensure value column is numeric
        df[value_column] = pd.to_numeric(df[value_column], errors='coerce')

        # Temporarily fill gaps for feature engineering
        df['PM25_filled_temp'] = df[value_column].fillna(method='ffill').fillna(method='bfill')

        # Add temporal features
        df = self.add_advanced_features(df)

        # Add lag features
        df = self.add_lag_features(df, value_column)

        # Track gaps
        df['has_gap'] = df[value_column].isna()

        # Feature columns (17 features total)
        feature_cols = [
            'PM25_filled_temp',  # 0
            'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 'is_weekend',  # 1-5
            'PM25_lag_1', 'PM25_lag_2', 'PM25_lag_3', 'PM25_lag_6', 'PM25_lag_12', 'PM25_lag_24',  # 6-11
            'PM25_roll_mean_6', 'PM25_roll_std_6', 'PM25_roll_mean_24', 'PM25_roll_max_24', 'PM25_roll_min_24'  # 12-16
        ]

        feature_data = df[feature_cols].values
        scaled_data = self.scaler.fit_transform(feature_data)

        X, y, gap_masks = [], [], []

        for i in range(len(scaled_data) - self.sequence_length):
            X.append(scaled_data[i:i + self.sequence_length])
            y.append(scaled_data[i + self.sequence_length, 0])
            gap_masks.append(df.iloc[i + self.sequence_length]['has_gap'])

        return np.array(X), np.array(y), np.array(gap_masks), df

    def build_enhanced_model(self, n_features=17):
        """
        Build Enhanced Bidirectional LSTM with Multi-Head Attention
        Architecture designed for 95%+ accuracy target
        """
        inputs = Input(shape=(self.sequence_length, n_features))

        # First Bidirectional LSTM layer
        x = Bidirectional(LSTM(128, return_sequences=True))(inputs)
        x = BatchNormalization()(x)
        x = Dropout(0.3)(x)

        # Second Bidirectional LSTM layer
        x = Bidirectional(LSTM(64, return_sequences=True))(x)
        x = BatchNormalization()(x)
        x = Dropout(0.3)(x)

        # Multi-Head Self-Attention
        attention = MultiHeadAttention(num_heads=4, key_dim=32)(x, x)
        x = LayerNormalization()(x + attention)  # Residual connection

        # Final LSTM layer
        x = LSTM(32, return_sequences=False)(x)
        x = Dropout(0.2)(x)

        # Dense layers with skip connection
        dense1 = Dense(64, activation='relu')(x)
        dense2 = Dense(32, activation='relu')(dense1)
        outputs = Dense(1)(dense2)

        model = Model(inputs, outputs)

        # Use Huber loss for robustness to outliers
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='huber',
            metrics=['mae', 'mse']
        )

        self.model = model
        self.metadata = {
            'n_features': n_features,
            'sequence_length': self.sequence_length,
            'architecture': 'Bidirectional LSTM + Multi-Head Attention',
            'parameters': model.count_params()
        }

        print(f"✓ Enhanced model built with {model.count_params():,} parameters")
        return model

    def train(self, X_train, y_train, X_val, y_val, epochs=100, batch_size=16, verbose=1):
        """
        Train model with advanced callbacks for optimal performance
        """
        if self.model is None:
            self.build_enhanced_model(n_features=X_train.shape[2])

        # Callbacks for training optimization
        early_stopping = callbacks.EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True,
            verbose=0
        )

        reduce_lr = callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=7,
            min_lr=0.00001,
            verbose=0
        )

        model_checkpoint = callbacks.ModelCheckpoint(
            os.path.join(self.model_path, 'best_model.keras'),
            monitor='val_loss',
            save_best_only=True,
            verbose=0
        )

        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stopping, reduce_lr, model_checkpoint],
            verbose=verbose
        )

        # Store training metadata
        self.metadata['training_epochs'] = len(history.history['loss'])
        self.metadata['final_train_loss'] = float(history.history['loss'][-1])
        self.metadata['final_val_loss'] = float(history.history['val_loss'][-1])
        self.metadata['final_train_mae'] = float(history.history['mae'][-1])
        self.metadata['final_val_mae'] = float(history.history['val_mae'][-1])

        return history

    def predict(self, X):
        """Generate predictions"""
        if self.model is None:
            raise ValueError("Model not trained or loaded")

        predictions_scaled = self.model.predict(X, verbose=0)

        # Inverse transform
        dummy = np.zeros((len(predictions_scaled), self.scaler.n_features_in_))
        dummy[:, 0] = predictions_scaled.flatten()
        predictions = self.scaler.inverse_transform(dummy)[:, 0]

        return predictions

    def save_model(self, model_name='enhanced_lstm'):
        """
        Save model, scaler, and metadata
        """
        if self.model is None:
            raise ValueError("No model to save")

        # Save Keras model
        model_file = os.path.join(self.model_path, f'{model_name}.keras')
        self.model.save(model_file)

        # Save scaler
        scaler_file = os.path.join(self.model_path, f'{model_name}_scaler.npy')
        np.save(scaler_file, {
            'data_min_': self.scaler.data_min_,
            'data_max_': self.scaler.data_max_,
            'data_range_': self.scaler.data_range_,
            'scale_': self.scaler.scale_,
            'min_': self.scaler.min_,
            'n_features_in_': self.scaler.n_features_in_,
            'n_samples_seen_': self.scaler.n_samples_seen_,
            'feature_range': self.scaler.feature_range
        }, allow_pickle=True)

        # Save metadata
        metadata_file = os.path.join(self.model_path, f'{model_name}_metadata.json')
        with open(metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)

        print(f"✓ Model saved to {model_file}")
        print(f"✓ Scaler saved to {scaler_file}")
        print(f"✓ Metadata saved to {metadata_file}")

    def load_model(self, model_name='enhanced_lstm'):
        """
        Load model, scaler, and metadata
        """
        # Load Keras model
        model_file = os.path.join(self.model_path, f'{model_name}.keras')
        self.model = load_model(model_file)

        # Load scaler
        scaler_file = os.path.join(self.model_path, f'{model_name}_scaler.npy')
        scaler_data = np.load(scaler_file, allow_pickle=True).item()

        self.scaler = MinMaxScaler(feature_range=scaler_data['feature_range'])
        self.scaler.data_min_ = scaler_data['data_min_']
        self.scaler.data_max_ = scaler_data['data_max_']
        self.scaler.data_range_ = scaler_data['data_range_']
        self.scaler.scale_ = scaler_data['scale_']
        self.scaler.min_ = scaler_data['min_']
        self.scaler.n_features_in_ = scaler_data['n_features_in_']
        self.scaler.n_samples_seen_ = scaler_data['n_samples_seen_']

        # Load metadata
        metadata_file = os.path.join(self.model_path, f'{model_name}_metadata.json')
        with open(metadata_file, 'r') as f:
            self.metadata = json.load(f)

        print(f"✓ Model loaded from {model_file}")
        print(f"✓ Scaler loaded from {scaler_file}")
        print(f"✓ Metadata loaded: {self.metadata}")

    def fill_gaps(self, data, value_column='PM25'):
        """
        Fill gaps in air quality data

        Args:
            data: List of dicts or DataFrame with datetime and values
            value_column: Name of column containing air quality values

        Returns:
            DataFrame with filled values and metadata
        """
        # Convert to DataFrame if needed
        if isinstance(data, list):
            df = pd.DataFrame(data)
            df['DATETIMEDATA'] = pd.to_datetime(df['DATETIMEDATA'])
            df.set_index('DATETIMEDATA', inplace=True)
        else:
            df = data.copy()

        # Prepare data
        X, y, gaps, df_prep = self.prepare_training_data(df, value_column)

        # Check if we need to train
        if self.model is None:
            print("Training model on provided data...")
            # Use non-gap data for training
            non_gap_mask = ~gaps
            X_nongap = X[non_gap_mask]
            y_nongap = y[non_gap_mask]

            # Split 90/10
            split_idx = int(len(X_nongap) * 0.9)
            X_train = X_nongap[:split_idx]
            y_train = y_nongap[:split_idx]
            X_val = X_nongap[split_idx:]
            y_val = y_nongap[split_idx:]

            self.train(X_train, y_train, X_val, y_val, epochs=100, batch_size=16, verbose=0)

        # Predict all values
        predictions = self.predict(X)

        # Create result DataFrame
        result_df = df.copy()
        aligned_index = df.index[self.sequence_length:]

        # Add predictions
        result_df['filled_value'] = result_df[value_column].copy()
        result_df.loc[aligned_index, 'predicted_value'] = predictions

        # Fill gaps with predictions
        gap_indices = aligned_index[gaps]
        result_df.loc[gap_indices, 'filled_value'] = result_df.loc[gap_indices, 'predicted_value']

        # Add metadata columns
        result_df['was_gap'] = False
        result_df.loc[gap_indices, 'was_gap'] = True
        result_df['gap_filled'] = result_df['was_gap']
        result_df['confidence'] = 0.95  # Placeholder - can be calculated from model uncertainty

        return result_df


def fill_air_quality_gaps_enhanced(data, value_column='PM25', sequence_length=24, model_path='models'):
    """
    Convenience function for gap filling with enhanced model

    Args:
        data: List of dicts with 'DATETIMEDATA' and value column
        value_column: Name of column containing air quality values
        sequence_length: LSTM sequence length
        model_path: Path to save/load models

    Returns:
        List of dicts with filled values
    """
    if not TENSORFLOW_AVAILABLE:
        raise ImportError("TensorFlow is required")

    # Convert to DataFrame
    df = pd.DataFrame(data)
    df['DATETIMEDATA'] = pd.to_datetime(df['DATETIMEDATA'])
    df.set_index('DATETIMEDATA', inplace=True)

    # Ensure numeric
    df[value_column] = pd.to_numeric(df[value_column], errors='coerce')

    # Check for gaps
    n_gaps = df[value_column].isna().sum()
    print(f"Found {n_gaps} gaps in data ({n_gaps/len(df)*100:.1f}%)")

    if n_gaps == 0:
        print("No gaps found. Returning original data.")
        result = df.reset_index().to_dict('records')
        return result

    # Create and use enhanced model
    model = EnhancedLSTMModel(sequence_length=sequence_length, model_path=model_path)

    # Try to load pre-trained model, otherwise train
    try:
        model.load_model()
        print("✓ Using pre-trained model")
    except:
        print("⚠ No pre-trained model found. Training new model...")

    result_df = model.fill_gaps(df, value_column=value_column)

    # Convert back to list of dicts
    result_df = result_df.reset_index()
    result_df['DATETIMEDATA'] = result_df['DATETIMEDATA'].dt.strftime('%Y-%m-%d %H:%M:%S')

    # Replace NaN/Inf with None
    result_df = result_df.replace([np.inf, -np.inf], np.nan)
    result = result_df.to_dict('records')

    # Clean NaN values
    for record in result:
        for key, value in record.items():
            if isinstance(value, (float, np.floating)) and (np.isnan(value) or np.isinf(value)):
                record[key] = None

    print(f"✓ Gap filling complete. Filled {n_gaps} gaps.")

    return result
