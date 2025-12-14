import PropTypes from 'prop-types';
import { Card, Badge, Button } from '../atoms';

/**
 * Feature Info Panel - Displays detailed information about selected map features
 * Typically shown when user clicks on a map feature
 */
const FeatureInfoPanel = ({
  feature,
  onClose,
  className = '',
  position = 'bottom-right',
}) => {
  if (!feature) return null;

  const positions = {
    'top-right': 'absolute top-4 right-4 z-dropdown',
    'top-left': 'absolute top-4 left-4 z-dropdown',
    'bottom-right': 'absolute bottom-4 right-4 z-dropdown',
    'bottom-left': 'absolute bottom-4 left-4 z-dropdown',
  };

  const properties = feature.properties || {};
  const geometry = feature.geometry || {};

  // Format property value based on type
  const formatValue = (key, value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      // Format numbers with appropriate decimals
      return key.toLowerCase().includes('lat') || key.toLowerCase().includes('lon')
        ? value.toFixed(6)
        : value.toFixed(2);
    }
    return String(value);
  };

  // Get AQI category badge
  const getAQIBadge = (value) => {
    if (value <= 50) return { variant: 'success', text: 'Good' };
    if (value <= 100) return { variant: 'warning', text: 'Moderate' };
    if (value <= 150) return { variant: 'error', text: 'Unhealthy for Sensitive' };
    if (value <= 200) return { variant: 'error', text: 'Unhealthy' };
    return { variant: 'error', text: 'Very Unhealthy' };
  };

  const aqiValue = properties.aqi || properties.PM25 || properties.value;
  const aqiBadge = aqiValue ? getAQIBadge(aqiValue) : null;

  return (
    <div className={`${positions[position]} ${className}`}>
      <Card variant="glass" padding="md" className="max-w-sm backdrop-blur-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-800">
              {properties.name || properties.stationID || properties.id || 'Feature Details'}
            </h3>
            {properties.type && (
              <p className="text-xs text-gray-500 mt-1">{properties.type}</p>
            )}
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

        {/* Main Value Display */}
        {aqiValue && (
          <div className="mb-4 p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Value</p>
                <div className="flex items-baseline mt-1">
                  <span className="text-4xl font-bold text-gray-900">{aqiValue}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {properties.unit || 'μg/m³'}
                  </span>
                </div>
              </div>
              {aqiBadge && (
                <Badge variant={aqiBadge.variant} size="md">
                  {aqiBadge.text}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Properties Grid */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Properties</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(properties)
              .filter(([key]) => !['name', 'id', 'stationID', 'type', 'aqi', 'PM25', 'value', 'unit'].includes(key))
              .map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500 capitalize">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm font-semibold text-gray-800 mt-1">
                    {formatValue(key, value)}
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* Geometry Info */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Type: {geometry.type || 'Unknown'}</span>
            {geometry.coordinates && geometry.type === 'Point' && (
              <span className="font-mono">
                {geometry.coordinates[1].toFixed(4)}, {geometry.coordinates[0].toFixed(4)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1">
            View Details
          </Button>
          <Button variant="primary" size="sm" className="flex-1">
            View Trends
          </Button>
        </div>
      </Card>
    </div>
  );
};

FeatureInfoPanel.propTypes = {
  feature: PropTypes.shape({
    type: PropTypes.string,
    geometry: PropTypes.object,
    properties: PropTypes.object,
  }),
  onClose: PropTypes.func,
  className: PropTypes.string,
  position: PropTypes.oneOf(['top-right', 'top-left', 'bottom-right', 'bottom-left']),
};

export default FeatureInfoPanel;
