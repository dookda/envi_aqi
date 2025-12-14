import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, Button, Badge, Spinner } from '../atoms';

const AnomalyPanel = ({
  stationID,
  param = 'PM25',
  startDate,
  endDate,
  onClose,
  className = '',
  position = 'top-right',
}) => {
  const [anomalyData, setAnomalyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (stationID && startDate && endDate) {
      fetchAnomalyData();
    }
  }, [stationID, param, startDate, endDate]);

  const fetchAnomalyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/anomaly-summary?stationID=${stationID}&param=${param}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();

      if (data.success) {
        setAnomalyData(data.summary);
      } else {
        setError('Failed to load anomaly data');
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

  const getHealthLevelColor = (level) => {
    const colors = {
      good: 'bg-aqi-good text-white',
      moderate: 'bg-aqi-moderate text-white',
      unhealthy_sensitive: 'bg-aqi-unhealthy-sensitive text-white',
      unhealthy: 'bg-aqi-unhealthy text-white',
      very_unhealthy: 'bg-aqi-very-unhealthy text-white',
      hazardous: 'bg-aqi-hazardous text-white',
    };
    return colors[level] || 'bg-gray-500 text-white';
  };

  const getAnomalyBadgeVariant = (count) => {
    if (count === 0) return 'success';
    if (count < 5) return 'warning';
    return 'error';
  };

  if (!stationID) return null;

  return (
    <div className={`${positions[position]} ${className}`}>
      <Card variant="glass" padding="md" className="max-w-md">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-800">Anomaly Detection</h3>
            <p className="text-xs text-gray-500 mt-1">
              Station: {stationID} | Parameter: {param}
            </p>
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
          <div className="bg-error bg-opacity-10 border border-error text-error px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {!loading && !error && anomalyData && (
          <div className="space-y-4">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white bg-opacity-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Total Points</p>
                <p className="text-2xl font-bold text-gray-800">
                  {anomalyData.total_points || 0}
                </p>
              </div>
              <div className="bg-white bg-opacity-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Hazardous Points</p>
                <p className="text-2xl font-bold text-error">
                  {anomalyData.anomaly_counts?.hazardous_points || 0}
                </p>
              </div>
            </div>

            {/* Anomaly Counts */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Anomaly Counts</h4>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between items-center bg-white bg-opacity-50 rounded-md p-2">
                  <span className="text-xs text-gray-600">Statistical (Z-score)</span>
                  <Badge
                    variant={getAnomalyBadgeVariant(anomalyData.anomaly_counts?.z_score_anomalies || 0)}
                    size="sm"
                  >
                    {anomalyData.anomaly_counts?.z_score_anomalies || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center bg-white bg-opacity-50 rounded-md p-2">
                  <span className="text-xs text-gray-600">Statistical (IQR)</span>
                  <Badge
                    variant={getAnomalyBadgeVariant(anomalyData.anomaly_counts?.iqr_anomalies || 0)}
                    size="sm"
                  >
                    {anomalyData.anomaly_counts?.iqr_anomalies || 0}
                  </Badge>
                </div>
                {anomalyData.anomaly_counts?.ml_anomalies !== undefined && (
                  <div className="flex justify-between items-center bg-white bg-opacity-50 rounded-md p-2">
                    <span className="text-xs text-gray-600">ML Detection</span>
                    <Badge
                      variant={getAnomalyBadgeVariant(anomalyData.anomaly_counts?.ml_anomalies || 0)}
                      size="sm"
                    >
                      {anomalyData.anomaly_counts?.ml_anomalies || 0}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Thresholds */}
            {anomalyData.thresholds && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">WHO Thresholds ({param})</h4>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Good</span>
                    <span className="font-mono text-aqi-good">
                      0-{anomalyData.thresholds.safe} μg/m³
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Moderate</span>
                    <span className="font-mono text-aqi-moderate">
                      {anomalyData.thresholds.safe + 1}-{anomalyData.thresholds.moderate} μg/m³
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Unhealthy</span>
                    <span className="font-mono text-aqi-unhealthy">
                      {anomalyData.thresholds.moderate + 1}-{anomalyData.thresholds.unhealthy} μg/m³
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Hazardous</span>
                    <span className="font-mono text-aqi-hazardous">
                      {anomalyData.thresholds.unhealthy + 1}+ μg/m³
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics */}
            {anomalyData.statistics && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Statistics</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white bg-opacity-50 rounded-md p-2">
                    <p className="text-gray-500">Mean</p>
                    <p className="font-mono font-semibold text-gray-800">
                      {anomalyData.statistics.mean?.toFixed(1)} μg/m³
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded-md p-2">
                    <p className="text-gray-500">Std Dev</p>
                    <p className="font-mono font-semibold text-gray-800">
                      {anomalyData.statistics.std?.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded-md p-2">
                    <p className="text-gray-500">Q1</p>
                    <p className="font-mono font-semibold text-gray-800">
                      {anomalyData.statistics.Q1?.toFixed(1)} μg/m³
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-50 rounded-md p-2">
                    <p className="text-gray-500">Q3</p>
                    <p className="font-mono font-semibold text-gray-800">
                      {anomalyData.statistics.Q3?.toFixed(1)} μg/m³
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Period */}
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
              Period: {startDate} to {endDate}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

AnomalyPanel.propTypes = {
  stationID: PropTypes.string,
  param: PropTypes.string,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  onClose: PropTypes.func,
  className: PropTypes.string,
  position: PropTypes.oneOf(['top-right', 'top-left', 'bottom-right', 'bottom-left']),
};

export default AnomalyPanel;
