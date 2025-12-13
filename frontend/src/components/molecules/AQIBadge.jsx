import PropTypes from 'prop-types';
import { getAQIColor, getAQILabel } from '../../utils/helpers/aqi';

const AQIBadge = ({
  colorId,
  aqiValue,
  param,
  size = 'md',
  showLabel = true,
  showParam = false,
  className = '',
}) => {
  const backgroundColor = getAQIColor(colorId);
  const label = getAQILabel(colorId);

  const sizes = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  const textSizes = {
    sm: { aqi: 'text-base', label: 'text-xs', param: 'text-xs' },
    md: { aqi: 'text-xl', label: 'text-sm', param: 'text-xs' },
    lg: { aqi: 'text-2xl', label: 'text-base', param: 'text-sm' },
  };

  return (
    <div
      className={`rounded-lg ${sizes[size]} ${className}`}
      style={{ backgroundColor }}
    >
      <p className={`${textSizes[size].aqi} font-bold text-gray-900 m-0`}>
        AQI: {aqiValue}
      </p>
      {showLabel && (
        <p className={`${textSizes[size].label} font-medium text-gray-900 m-0 mt-0.5`}>
          {label}
        </p>
      )}
      {showParam && param && (
        <p className={`${textSizes[size].param} text-gray-900 m-0 mt-0.5`}>
          Primary: {param}
        </p>
      )}
    </div>
  );
};

AQIBadge.propTypes = {
  colorId: PropTypes.string.isRequired,
  aqiValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  param: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showLabel: PropTypes.bool,
  showParam: PropTypes.bool,
  className: PropTypes.string,
};

export default AQIBadge;
