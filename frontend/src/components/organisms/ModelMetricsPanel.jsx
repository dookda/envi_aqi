import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, Button, Badge, Spinner } from '../atoms';

const ModelMetricsPanel = ({
  modelName = 'enhanced_lstm_pm25',
  onClose,
  className = '',
  position = 'top-left',
}) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchModelMetrics();
  }, [modelName]);

  const fetchModelMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/model-metrics?model_name=${modelName}`);
      const data = await response.json();

      if (data.success && data.model_exists) {
        setMetrics(data);
      } else if (data.success && !data.model_exists) {
        setError('Model not trained yet. Run training script first.');
      } else {
        setError('Failed to load model metrics');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const positions = {
    'top-right': 'absolute top-24 right-6 z-dropdown',
    'top-left': 'absolute top-24 left-6 z-dropdown',
    'bottom-right': 'absolute bottom-6 right-6 z-dropdown',
    'bottom-left': 'absolute bottom-6 left-6 z-dropdown',
  };

  const getAccuracyBadge = (mae) => {
    if (!mae) return 'secondary';
    if (mae < 5) return 'success';
    if (mae < 10) return 'warning';
    return 'error';
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return 'N/A';
    return typeof num === 'number' ? num.toFixed(4) : num;
  };

  const formatLargeNumber = (num) => {
    if (num === undefined || num === null) return 'N/A';
    return typeof num === 'number' ? num.toLocaleString() : num;
  };

  return (
    <div className={`${positions[position]} ${className}`}>
      <Card variant="glass" padding="md" className="max-w-md">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-800">Model Performance</h3>
            <p className="text-xs text-gray-500 mt-1">Enhanced LSTM Model</p>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 -mt-1 -mr-1"
            >
              ✕
            </Button>
          )}
        </div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <Spinner size="md" />
          </div>
        )}

        {error && (
          <div className="bg-warning bg-opacity-10 border border-warning text-gray-800 px-4 py-3 rounded-md text-sm">
            <p className="font-semibold mb-1">Model Not Available</p>
            <p className="text-xs">{error}</p>
            <p className="text-xs mt-2">
              Run <code className="bg-gray-200 px-1 rounded">python backend/train_model.py</code> to train the model.
            </p>
          </div>
        )}

        {!loading && !error && metrics && (
          <div className="space-y-4">
            {/* Model Status */}
            <div className="flex items-center justify-between bg-success bg-opacity-10 border border-success rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-gray-800">Model Ready</span>
              </div>
              <Badge variant="success" size="sm">Active</Badge>
            </div>

            {/* Architecture Info */}
            {metrics.metadata && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Architecture</h4>
                <div className="bg-white bg-opacity-50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Type</span>
                    <span className="font-mono text-gray-800">
                      {metrics.metadata.architecture || 'Enhanced LSTM'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Parameters</span>
                    <span className="font-mono text-gray-800">
                      {formatLargeNumber(metrics.metadata.parameters)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Features</span>
                    <span className="font-mono text-gray-800">
                      {metrics.metadata.n_features || 17}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Sequence Length</span>
                    <span className="font-mono text-gray-800">
                      {metrics.metadata.sequence_length || 24}h
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Training Metrics */}
            {metrics.metadata && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Training Performance</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white bg-opacity-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Train Loss</p>
                    <p className="font-mono text-sm font-bold text-gray-800">
                      {formatNumber(metrics.metadata.final_train_loss)}
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Val Loss</p>
                    <p className="font-mono text-sm font-bold text-gray-800">
                      {formatNumber(metrics.metadata.final_val_loss)}
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Train MAE</p>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm font-bold text-gray-800">
                        {formatNumber(metrics.metadata.final_train_mae)}
                      </p>
                      <Badge
                        variant={getAccuracyBadge(metrics.metadata.final_train_mae)}
                        size="xs"
                      >
                        {metrics.metadata.final_train_mae < 5 ? '✓' : '!'}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Val MAE</p>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm font-bold text-gray-800">
                        {formatNumber(metrics.metadata.final_val_mae)}
                      </p>
                      <Badge
                        variant={getAccuracyBadge(metrics.metadata.final_val_mae)}
                        size="xs"
                      >
                        {metrics.metadata.final_val_mae < 5 ? '✓' : '!'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Accuracy Target */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-800">Accuracy Target</h4>
                <Badge variant="info" size="sm">95%+</Badge>
              </div>
              <p className="text-xs text-gray-600">
                Predictions within ±5% of actual values. Target: ≥95% accuracy for data imputation.
              </p>
            </div>

            {/* Training Info */}
            {metrics.metadata && (
              <div className="space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Epochs Trained</span>
                  <span className="font-mono">{metrics.metadata.training_epochs || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Model Name</span>
                  <span className="font-mono">{metrics.model_name}</span>
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <div className="pt-2 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchModelMetrics}
                className="w-full"
              >
                Refresh Metrics
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

ModelMetricsPanel.propTypes = {
  modelName: PropTypes.string,
  onClose: PropTypes.func,
  className: PropTypes.string,
  position: PropTypes.oneOf(['top-right', 'top-left', 'bottom-right', 'bottom-left']),
};

export default ModelMetricsPanel;
