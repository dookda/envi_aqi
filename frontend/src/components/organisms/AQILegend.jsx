import PropTypes from 'prop-types';
import { Card } from '../atoms';
import { LegendItem } from '../molecules';
import { getAllAQILevels } from '../../utils/helpers/aqi';

const AQILegend = ({ className = '', position = 'bottom-left' }) => {
  const aqiLevels = getAllAQILevels();

  const positions = {
    'bottom-left': 'absolute bottom-6 left-6 z-dropdown',
    'bottom-right': 'absolute bottom-6 right-6 z-dropdown',
    'top-left': 'absolute top-24 left-6 z-dropdown',
    'top-right': 'absolute top-24 right-6 z-dropdown',
  };

  return (
    <div className={`${positions[position]} ${className}`}>
      <Card variant="glass" padding="md" className="max-w-xs">
        <h3 className="font-bold text-sm mb-3 text-gray-800">AQI Scale</h3>
        <div className="space-y-2">
          {aqiLevels.map(({ colorId, label, range, color }) => (
            <LegendItem
              key={colorId}
              color={color}
              label={label}
              range={range}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

AQILegend.propTypes = {
  className: PropTypes.string,
  position: PropTypes.oneOf(['bottom-left', 'bottom-right', 'top-left', 'top-right']),
};

export default AQILegend;
