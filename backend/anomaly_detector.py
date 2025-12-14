"""
Anomaly Detection for Air Quality Data
Combines multiple methods: Statistical + Machine Learning
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
import warnings
warnings.filterwarnings('ignore')

try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


class AnomalyDetector:
    """
    Multi-method anomaly detection for air quality data
    Methods:
    1. Statistical (Z-score, IQR)
    2. Machine Learning (Isolation Forest)
    3. Domain-specific (WHO thresholds)
    """

    def __init__(self):
        self.scaler = StandardScaler() if SKLEARN_AVAILABLE else None
        self.isolation_forest = None

        # WHO Air Quality Guidelines for PM2.5
        self.thresholds = {
            'PM25': {
                'safe': 15,  # μg/m³
                'moderate': 35,
                'unhealthy_sensitive': 55,
                'unhealthy': 150,
                'very_unhealthy': 250,
                'hazardous': 500
            },
            'PM10': {
                'safe': 50,
                'moderate': 150,
                'unhealthy_sensitive': 250,
                'unhealthy': 350,
                'very_unhealthy': 420,
                'hazardous': 600
            },
            'O3': {
                'safe': 100,
                'moderate': 160,
                'unhealthy_sensitive': 200,
                'unhealthy': 300,
                'very_unhealthy': 400,
                'hazardous': 600
            }
        }

    def detect_statistical_anomalies(self, df, value_column='PM25', z_threshold=3.0, iqr_multiplier=1.5):
        """
        Detect anomalies using statistical methods

        Args:
            df: DataFrame with values
            value_column: Column to analyze
            z_threshold: Z-score threshold (default: 3.0)
            iqr_multiplier: IQR multiplier (default: 1.5)

        Returns:
            Dict with anomaly flags and scores
        """
        values = df[value_column].dropna()

        # Z-score method
        mean = values.mean()
        std = values.std()
        z_scores = np.abs((values - mean) / std)
        z_anomalies = z_scores > z_threshold

        # IQR method
        Q1 = values.quantile(0.25)
        Q3 = values.quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - iqr_multiplier * IQR
        upper_bound = Q3 + iqr_multiplier * IQR
        iqr_anomalies = (values < lower_bound) | (values > upper_bound)

        return {
            'z_scores': z_scores,
            'z_anomalies': z_anomalies,
            'iqr_anomalies': iqr_anomalies,
            'z_threshold': z_threshold,
            'iqr_bounds': (lower_bound, upper_bound),
            'stats': {
                'mean': mean,
                'std': std,
                'Q1': Q1,
                'Q3': Q3,
                'IQR': IQR
            }
        }

    def detect_ml_anomalies(self, df, value_column='PM25', contamination=0.1):
        """
        Detect anomalies using Isolation Forest

        Args:
            df: DataFrame with values
            value_column: Column to analyze
            contamination: Expected proportion of outliers (default: 0.1)

        Returns:
            Dict with anomaly predictions and scores
        """
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn required for ML anomaly detection")

        # Prepare features
        df_features = df.copy()

        # Add temporal features
        df_features['hour'] = df_features.index.hour
        df_features['day_of_week'] = df_features.index.dayofweek
        df_features['is_weekend'] = (df_features.index.dayofweek >= 5).astype(int)

        # Add lag features if enough data
        if len(df_features) > 24:
            df_features['lag_1h'] = df_features[value_column].shift(1)
            df_features['lag_24h'] = df_features[value_column].shift(24)
            df_features['rolling_mean_24h'] = df_features[value_column].rolling(24, min_periods=1).mean()

        # Fill NaN
        feature_cols = [col for col in df_features.columns if col != value_column and col != 'DATETIMEDATA']
        df_features[feature_cols] = df_features[feature_cols].fillna(method='bfill').fillna(method='ffill')

        # Select features for model
        X = df_features[[value_column] + [col for col in feature_cols if col in df_features.columns]].values

        # Train Isolation Forest
        iso_forest = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )

        predictions = iso_forest.fit_predict(X)
        anomaly_scores = iso_forest.score_samples(X)

        # -1 means anomaly, 1 means normal
        is_anomaly = predictions == -1

        return {
            'predictions': predictions,
            'is_anomaly': is_anomaly,
            'anomaly_scores': anomaly_scores,
            'contamination': contamination
        }

    def detect_domain_anomalies(self, df, value_column='PM25', param_type='PM25'):
        """
        Detect anomalies based on domain knowledge (WHO thresholds)

        Args:
            df: DataFrame with values
            value_column: Column to analyze
            param_type: Parameter type (PM25, PM10, O3, etc.)

        Returns:
            Dict with health level classifications
        """
        values = df[value_column].dropna()
        thresholds = self.thresholds.get(param_type, self.thresholds['PM25'])

        health_levels = []
        is_hazardous = []

        for val in values:
            if pd.isna(val):
                health_levels.append('unknown')
                is_hazardous.append(False)
            elif val >= thresholds['hazardous']:
                health_levels.append('hazardous')
                is_hazardous.append(True)
            elif val >= thresholds['very_unhealthy']:
                health_levels.append('very_unhealthy')
                is_hazardous.append(True)
            elif val >= thresholds['unhealthy']:
                health_levels.append('unhealthy')
                is_hazardous.append(True)
            elif val >= thresholds['unhealthy_sensitive']:
                health_levels.append('unhealthy_sensitive')
                is_hazardous.append(False)
            elif val >= thresholds['moderate']:
                health_levels.append('moderate')
                is_hazardous.append(False)
            else:
                health_levels.append('safe')
                is_hazardous.append(False)

        return {
            'health_levels': health_levels,
            'is_hazardous': is_hazardous,
            'thresholds': thresholds,
            'hazardous_count': sum(is_hazardous),
            'hazardous_percentage': sum(is_hazardous) / len(is_hazardous) * 100 if len(is_hazardous) > 0 else 0
        }

    def detect_all(self, data, value_column='PM25', param_type='PM25'):
        """
        Run all anomaly detection methods and combine results

        Args:
            data: List of dicts or DataFrame
            value_column: Column to analyze
            param_type: Parameter type

        Returns:
            Dict with combined anomaly results
        """
        # Convert to DataFrame if needed
        if isinstance(data, list):
            df = pd.DataFrame(data)
            if 'DATETIMEDATA' in df.columns:
                df['DATETIMEDATA'] = pd.to_datetime(df['DATETIMEDATA'])
                df.set_index('DATETIMEDATA', inplace=True)
        else:
            df = data.copy()

        # Ensure numeric
        df[value_column] = pd.to_numeric(df[value_column], errors='coerce')

        # Remove rows with NaN values for analysis
        df_clean = df[df[value_column].notna()].copy()

        if len(df_clean) == 0:
            return {
                'error': 'No valid data points found',
                'total_points': len(df),
                'valid_points': 0
            }

        # Run all detection methods
        statistical = self.detect_statistical_anomalies(df_clean, value_column)
        domain = self.detect_domain_anomalies(df_clean, value_column, param_type)

        results = {
            'statistical': statistical,
            'domain': domain,
            'total_points': len(df_clean),
            'summary': {
                'z_score_anomalies': int(statistical['z_anomalies'].sum()),
                'iqr_anomalies': int(statistical['iqr_anomalies'].sum()),
                'hazardous_points': domain['hazardous_count'],
                'hazardous_percentage': domain['hazardous_percentage']
            }
        }

        # Add ML detection if available
        if SKLEARN_AVAILABLE and len(df_clean) > 50:  # Need enough data for ML
            try:
                ml = self.detect_ml_anomalies(df_clean, value_column)
                results['ml'] = ml
                results['summary']['ml_anomalies'] = int(ml['is_anomaly'].sum())
            except Exception as e:
                results['ml_error'] = str(e)

        # Combined anomaly score (0-1, higher = more likely anomaly)
        combined_scores = np.zeros(len(df_clean))

        # Add statistical scores (normalized)
        combined_scores += (statistical['z_scores'].values > statistical['z_threshold']).astype(float) * 0.3
        combined_scores += statistical['iqr_anomalies'].values.astype(float) * 0.3

        # Add domain scores
        combined_scores += np.array(domain['is_hazardous']).astype(float) * 0.2

        # Add ML scores if available
        if 'ml' in results:
            ml_scores_normalized = (results['ml']['is_anomaly']).astype(float)
            combined_scores += ml_scores_normalized * 0.2

        results['combined_anomaly_scores'] = combined_scores
        results['is_anomaly_combined'] = combined_scores > 0.5

        # Create detailed results per point
        detailed = []
        for idx, (index, row) in enumerate(df_clean.iterrows()):
            detailed.append({
                'datetime': index.strftime('%Y-%m-%d %H:%M:%S') if hasattr(index, 'strftime') else str(index),
                'value': float(row[value_column]),
                'z_score': float(statistical['z_scores'].iloc[idx]),
                'is_z_anomaly': bool(statistical['z_anomalies'].iloc[idx]),
                'is_iqr_anomaly': bool(statistical['iqr_anomalies'].iloc[idx]),
                'health_level': domain['health_levels'][idx],
                'is_hazardous': bool(domain['is_hazardous'][idx]),
                'combined_score': float(combined_scores[idx]),
                'is_anomaly': bool(combined_scores[idx] > 0.5)
            })

            if 'ml' in results:
                detailed[-1]['ml_score'] = float(results['ml']['anomaly_scores'][idx])
                detailed[-1]['is_ml_anomaly'] = bool(results['ml']['is_anomaly'][idx])

        results['detailed'] = detailed

        return results


def detect_anomalies(data, value_column='PM25', param_type='PM25'):
    """
    Convenience function for anomaly detection

    Args:
        data: List of dicts with datetime and values
        value_column: Column to analyze
        param_type: Parameter type (PM25, PM10, O3, etc.)

    Returns:
        Dict with anomaly detection results
    """
    detector = AnomalyDetector()
    return detector.detect_all(data, value_column, param_type)
