import PropTypes from 'prop-types';
import { Card, Button } from '../atoms';
import { AQIBadge } from '../molecules';

const StationDetailsPanel = ({
  station,
  onClose,
  className = '',
  position = 'top-right',
}) => {
  if (!station) return null;

  const positions = {
    'top-right': 'absolute top-24 right-6 z-dropdown',
    'top-left': 'absolute top-24 left-6 z-dropdown',
  };

  return (
    <div className={`${positions[position]} ${className}`}>
      <Card variant="glass" padding="md" className="max-w-sm">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-lg text-gray-800">{station.nameEN}</h3>
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

        <p className="text-sm text-gray-600 mb-1">{station.nameTH}</p>
        <p className="text-xs text-gray-500 mb-4">{station.areaEN}</p>

        <AQIBadge
          colorId={station.colorId}
          aqiValue={station.aqi}
          param={station.param}
          size="md"
          showLabel={true}
          showParam={true}
          className="mb-3"
        />

        <div className="space-y-1">
          <p className="text-xs text-gray-500">
            Last updated: {station.date} {station.time}
          </p>
          <p className="text-xs text-gray-500">
            Station ID: {station.stationID}
          </p>
        </div>
      </Card>
    </div>
  );
};

StationDetailsPanel.propTypes = {
  station: PropTypes.shape({
    stationID: PropTypes.string.isRequired,
    nameEN: PropTypes.string.isRequired,
    nameTH: PropTypes.string,
    areaEN: PropTypes.string,
    aqi: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    colorId: PropTypes.string.isRequired,
    param: PropTypes.string,
    date: PropTypes.string,
    time: PropTypes.string,
  }),
  onClose: PropTypes.func,
  className: PropTypes.string,
  position: PropTypes.oneOf(['top-right', 'top-left']),
};

export default StationDetailsPanel;
