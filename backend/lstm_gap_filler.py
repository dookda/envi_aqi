"""
LSTM-based Data Gap Filler for Air Quality Data
Extracted from Complete_AirQuality_DeepLearning.ipynb Example 1
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import warnings
warnings.filterwarnings('ignore')

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras import callbacks
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("Warning: TensorFlow not available. Gap filling will not work.")


class LSTMGapFiller:
    """
    LSTM model for filling gaps in air quality time series data
    Based on Example 1: Random 25% removal pattern
    """
    
    def __init__(self, sequence_length=24):
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is required for gap filling. Install with: pip install tensorflow")
        
        self.sequence_length = sequence_length
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.model = None
        
        # Set random seeds for reproducibility
        np.random.seed(42)
        tf.random.set_seed(42)
    
    def add_temporal_features(self, df):
        """Add temporal features for LSTM"""
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
    
    def prepare_data(self, df, value_column='value'):
        """
        Prepare data for LSTM training/prediction
        
        Args:
            df: DataFrame with datetime index and value column
            value_column: Name of the column containing values
            
        Returns:
            X, y, masks, df_prepared
        """
        df = df.copy()
        
        # Rename column if needed
        if value_column != 'PM25':
            df['PM25'] = df[value_column]
        
        # Add temporal features
        df = self.add_temporal_features(df)
        
        # Fill gaps temporarily for sequence creation
        df['PM25_filled_temp'] = df['PM25'].ffill().bfill()
        df['has_gap'] = df['PM25'].isna()
        
        # Feature columns
        feature_cols = ['PM25_filled_temp', 'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 'is_weekend']
        
        feature_data = df[feature_cols].values
        scaled_data = self.scaler.fit_transform(feature_data)
        
        X, y, masks = [], [], []
        
        for i in range(len(scaled_data) - self.sequence_length):
            X.append(scaled_data[i:i + self.sequence_length])
            y.append(scaled_data[i + self.sequence_length, 0])
            masks.append(df.iloc[i + self.sequence_length]['has_gap'])
        
        return np.array(X), np.array(y), np.array(masks), df
    
    def build_model(self, n_features=6):
        """
        Build 3-layer LSTM model for gap filling
        """
        model = Sequential([
            LSTM(128, activation='relu', return_sequences=True, 
                 input_shape=(self.sequence_length, n_features)),
            Dropout(0.2),
            
            LSTM(64, activation='relu', return_sequences=True),
            Dropout(0.2),
            
            LSTM(32, activation='relu'),
            Dropout(0.2),
            
            Dense(16, activation='relu'),
            Dense(1)
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        
        self.model = model
        return model
    
    def train(self, X_train, y_train, X_val, y_val, epochs=50, batch_size=32, verbose=0):
        """
        Train model with early stopping
        """
        if self.model is None:
            self.build_model(n_features=X_train.shape[2])
        
        early_stopping = callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=0
        )
        
        reduce_lr = callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=0.00001,
            verbose=0
        )
        
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stopping, reduce_lr],
            verbose=verbose
        )
        
        return history
    
    def predict(self, X):
        """Generate predictions"""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        predictions_scaled = self.model.predict(X, verbose=0)
        
        # Inverse transform
        dummy = np.zeros((len(predictions_scaled), self.scaler.n_features_in_))
        dummy[:, 0] = predictions_scaled.flatten()
        predictions = self.scaler.inverse_transform(dummy)[:, 0]
        
        return predictions
    
    def fill_gaps(self, df, value_column='value', train_ratio=0.8):
        """
        Main method to fill gaps in data
        
        Args:
            df: DataFrame with datetime index and values
            value_column: Name of column containing values
            train_ratio: Ratio of non-missing data to use for training
            
        Returns:
            DataFrame with filled values
        """
        # Prepare data
        X, y, gaps, df_prep = self.prepare_data(df, value_column)
        
        # Split training data (only use non-gap data for training)
        non_gap_indices = ~gaps
        X_nongap = X[non_gap_indices]
        y_nongap = y[non_gap_indices]
        
        split_idx = int(len(X_nongap) * train_ratio)
        X_train = X_nongap[:split_idx]
        y_train = y_nongap[:split_idx]
        X_val = X_nongap[split_idx:]
        y_val = y_nongap[split_idx:]
        
        # Train model
        print(f"Training LSTM on {len(X_train)} samples...")
        self.train(X_train, y_train, X_val, y_val, epochs=50, verbose=0)
        
        # Predict all values
        predictions = self.predict(X)
        
        # Create result DataFrame
        result_df = df.copy()
        aligned_index = df.index[self.sequence_length:]
        
        # Fill gaps with predictions
        result_df['filled_value'] = result_df[value_column].copy()
        result_df.loc[aligned_index, 'predicted_value'] = predictions
        
        # Replace gaps with predictions
        gap_indices = aligned_index[gaps]
        result_df.loc[gap_indices, 'filled_value'] = result_df.loc[gap_indices, 'predicted_value']
        
        # Add metadata
        result_df['was_gap'] = False
        result_df.loc[gap_indices, 'was_gap'] = True
        result_df['gap_filled'] = result_df['was_gap']
        
        return result_df


def fill_air_quality_gaps(data, value_column='value', sequence_length=24):
    """
    Convenience function to fill gaps in air quality data
    
    Args:
        data: List of dicts with 'DATETIMEDATA' and value column
        value_column: Name of column containing air quality values
        sequence_length: LSTM sequence length (default 24 hours)
        
    Returns:
        List of dicts with filled values
    """
    if not TENSORFLOW_AVAILABLE:
        raise ImportError("TensorFlow is required for gap filling")
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    df['DATETIMEDATA'] = pd.to_datetime(df['DATETIMEDATA'])
    df.set_index('DATETIMEDATA', inplace=True)
    
    # Ensure value column is numeric
    df[value_column] = pd.to_numeric(df[value_column], errors='coerce')
    
    # Check if there are gaps
    n_gaps = df[value_column].isna().sum()
    print(f"Found {n_gaps} gaps in data ({n_gaps/len(df)*100:.1f}%)")
    
    if n_gaps == 0:
        print("No gaps found. Returning original data.")
        df_reset = df.reset_index()
        df_reset['DATETIMEDATA'] = df_reset.index if 'DATETIMEDATA' not in df_reset.columns else df_reset['DATETIMEDATA']

        # Replace NaN and Inf values with None to ensure JSON compliance
        df_reset = df_reset.replace([np.inf, -np.inf], np.nan)
        result = df_reset.to_dict('records')

        # Convert NaN to None for JSON serialization
        for record in result:
            for key, value in record.items():
                if isinstance(value, (float, np.floating)) and (np.isnan(value) or np.isinf(value)):
                    record[key] = None

        return result
    
    # Fill gaps using LSTM
    filler = LSTMGapFiller(sequence_length=sequence_length)
    result_df = filler.fill_gaps(df, value_column=value_column)
    
    # Convert back to list of dicts
    result_df = result_df.reset_index()
    result_df['DATETIMEDATA'] = result_df['DATETIMEDATA'].dt.strftime('%Y-%m-%d %H:%M:%S')

    # Replace NaN and Inf values with None to ensure JSON compliance
    result_df = result_df.replace([np.inf, -np.inf], np.nan)

    result = result_df.to_dict('records')

    # Convert NaN to None for JSON serialization
    for record in result:
        for key, value in record.items():
            if isinstance(value, (float, np.floating)) and (np.isnan(value) or np.isinf(value)):
                record[key] = None

    print(f"Gap filling complete. Filled {n_gaps} gaps.")

    return result
