"""
Model Manager - Handles loading, saving, and training of LSTM models
Provides pre-trained models with fallback to on-demand training
"""

import os
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import pandas as pd
from enhanced_lstm_model import EnhancedLSTMModel, TENSORFLOW_AVAILABLE

class ModelManager:
    """
    Manages LSTM models for air quality gap filling:
    - Loads pre-trained models if available
    - Falls back to training new models if needed
    - Stores models persistently
    - Tracks model metadata and performance
    """

    def __init__(self, models_dir: str = "models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)

        # Model registry - maps parameters to model names
        self.model_registry = {
            'PM25': 'enhanced_lstm_pm25',
            'PM10': 'enhanced_lstm_pm10',
            'O3': 'enhanced_lstm_o3',
            'CO': 'enhanced_lstm_co',
            'NO2': 'enhanced_lstm_no2',
            'SO2': 'enhanced_lstm_so2',
        }

        # Cache for loaded models
        self._loaded_models = {}

    def get_model_path(self, parameter: str) -> tuple:
        """Get file paths for a model"""
        model_name = self.model_registry.get(parameter, f'enhanced_lstm_{parameter.lower()}')

        return (
            self.models_dir / f'{model_name}.keras',
            self.models_dir / f'{model_name}_scaler.npy',
            self.models_dir / f'{model_name}_metadata.json'
        )

    def model_exists(self, parameter: str) -> bool:
        """Check if pre-trained model exists for parameter"""
        model_file, scaler_file, metadata_file = self.get_model_path(parameter)
        return (
            model_file.exists() and
            scaler_file.exists() and
            metadata_file.exists()
        )

    def get_model_metadata(self, parameter: str) -> Optional[Dict[str, Any]]:
        """Get metadata for a trained model"""
        if not self.model_exists(parameter):
            return None

        _, _, metadata_file = self.get_model_path(parameter)

        try:
            with open(metadata_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading metadata: {e}")
            return None

    def load_model(self, parameter: str, sequence_length: int = 24) -> Optional[EnhancedLSTMModel]:
        """
        Load pre-trained model for parameter

        Args:
            parameter: Air quality parameter (PM25, PM10, etc.)
            sequence_length: Sequence length for LSTM

        Returns:
            EnhancedLSTMModel instance or None if model doesn't exist
        """
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is required for model operations")

        # Check cache
        cache_key = f"{parameter}_{sequence_length}"
        if cache_key in self._loaded_models:
            print(f"✓ Using cached model for {parameter}")
            return self._loaded_models[cache_key]

        if not self.model_exists(parameter):
            print(f"⚠ No pre-trained model found for {parameter}")
            return None

        try:
            model_name = self.model_registry.get(parameter, f'enhanced_lstm_{parameter.lower()}')

            # Create model instance
            model = EnhancedLSTMModel(
                sequence_length=sequence_length,
                model_path=str(self.models_dir)
            )

            # Load pre-trained model
            model.load_model(model_name)

            # Cache the model
            self._loaded_models[cache_key] = model

            # Load metadata
            metadata = self.get_model_metadata(parameter)
            if metadata:
                print(f"✓ Loaded pre-trained model for {parameter}")
                print(f"  - Trained on: {metadata.get('trained_date', 'Unknown')}")
                print(f"  - Accuracy: {metadata.get('accuracy', 'N/A')}")
                print(f"  - MAE: {metadata.get('mae', 'N/A')}")

            return model

        except Exception as e:
            print(f"✗ Error loading model for {parameter}: {e}")
            return None

    def train_and_save_model(
        self,
        data: pd.DataFrame,
        parameter: str,
        value_column: str = 'PM25',
        sequence_length: int = 24,
        epochs: int = 50,
        batch_size: int = 32
    ) -> EnhancedLSTMModel:
        """
        Train a new model and save it for future use

        Args:
            data: Training data DataFrame
            parameter: Air quality parameter
            value_column: Column name in data
            sequence_length: LSTM sequence length
            epochs: Training epochs
            batch_size: Training batch size

        Returns:
            Trained EnhancedLSTMModel instance
        """
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is required for model training")

        print(f"\n🔧 Training new model for {parameter}...")
        print(f"   Data points: {len(data)}")
        print(f"   Sequence length: {sequence_length}")
        print(f"   Epochs: {epochs}")

        # Create model instance
        model = EnhancedLSTMModel(
            sequence_length=sequence_length,
            model_path=str(self.models_dir)
        )

        # Train model
        history = model.train(
            data,
            value_column=value_column,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2
        )

        # Add training metadata
        model.metadata.update({
            'parameter': parameter,
            'trained_date': datetime.now().isoformat(),
            'training_samples': len(data),
            'sequence_length': sequence_length,
            'epochs': epochs,
            'batch_size': batch_size,
        })

        # Save model
        model_name = self.model_registry.get(parameter, f'enhanced_lstm_{parameter.lower()}')
        model.save_model(model_name)

        # Cache the model
        cache_key = f"{parameter}_{sequence_length}"
        self._loaded_models[cache_key] = model

        print(f"✓ Model trained and saved for {parameter}")

        return model

    def get_or_train_model(
        self,
        parameter: str,
        training_data: Optional[pd.DataFrame] = None,
        sequence_length: int = 24,
        force_retrain: bool = False
    ) -> EnhancedLSTMModel:
        """
        Get pre-trained model or train new one if not available

        Args:
            parameter: Air quality parameter
            training_data: Data for training (if model doesn't exist)
            sequence_length: LSTM sequence length
            force_retrain: Force retraining even if model exists

        Returns:
            EnhancedLSTMModel instance
        """
        # Load existing model if available and not forcing retrain
        if not force_retrain:
            model = self.load_model(parameter, sequence_length)
            if model is not None:
                return model

        # Train new model
        if training_data is None:
            raise ValueError(
                f"No pre-trained model found for {parameter} and no training data provided. "
                f"Please provide training_data to train a new model."
            )

        return self.train_and_save_model(
            training_data,
            parameter,
            value_column=parameter,
            sequence_length=sequence_length
        )

    def list_available_models(self) -> Dict[str, Dict[str, Any]]:
        """List all available pre-trained models with metadata"""
        available_models = {}

        for parameter in self.model_registry.keys():
            if self.model_exists(parameter):
                metadata = self.get_model_metadata(parameter)
                available_models[parameter] = metadata or {}

        return available_models

    def delete_model(self, parameter: str) -> bool:
        """Delete a trained model"""
        if not self.model_exists(parameter):
            return False

        try:
            model_file, scaler_file, metadata_file = self.get_model_path(parameter)
            model_file.unlink(missing_ok=True)
            scaler_file.unlink(missing_ok=True)
            metadata_file.unlink(missing_ok=True)

            # Remove from cache
            cache_keys = [k for k in self._loaded_models.keys() if k.startswith(parameter)]
            for key in cache_keys:
                del self._loaded_models[key]

            print(f"✓ Deleted model for {parameter}")
            return True

        except Exception as e:
            print(f"✗ Error deleting model: {e}")
            return False


# Global model manager instance
_model_manager = None

def get_model_manager() -> ModelManager:
    """Get singleton model manager instance"""
    global _model_manager
    if _model_manager is None:
        _model_manager = ModelManager()
    return _model_manager
