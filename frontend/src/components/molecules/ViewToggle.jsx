import PropTypes from 'prop-types';

/**
 * ViewToggle - Toggle between different view modes
 * Follows Atomic Design: Molecule
 */
const ViewToggle = ({ options, activeValue, onChange, className = '' }) => {
    return (
        <div className={`inline-flex bg-gray-100 rounded-lg p-1 ${className}`}>
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`
            flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium
            transition-all duration-200
            ${activeValue === option.value
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }
          `}
                >
                    {option.icon && <span className="w-4 h-4">{option.icon}</span>}
                    {option.label}
                </button>
            ))}
        </div>
    );
};

ViewToggle.propTypes = {
    options: PropTypes.arrayOf(
        PropTypes.shape({
            value: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            icon: PropTypes.node,
        })
    ).isRequired,
    activeValue: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    className: PropTypes.string,
};

export default ViewToggle;
