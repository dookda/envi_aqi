import PropTypes from 'prop-types';

const LegendItem = ({ color, label, range, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <div
        className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 text-gray-700">{label}</span>
      <span className="text-gray-500">{range}</span>
    </div>
  );
};

LegendItem.propTypes = {
  color: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  range: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default LegendItem;
