import PropTypes from 'prop-types';

/**
 * StatCard - Displays a single statistic with label and optional icon
 * Follows Atomic Design: Molecule (composed of atoms)
 */
const StatCard = ({
    label,
    value,
    unit = '',
    icon,
    trend,
    variant = 'default',
    size = 'md',
    className = '',
}) => {
    const sizes = {
        sm: { value: 'text-xl', label: 'text-[10px]', icon: 'w-4 h-4' },
        md: { value: 'text-2xl', label: 'text-xs', icon: 'w-5 h-5' },
        lg: { value: 'text-3xl', label: 'text-sm', icon: 'w-6 h-6' },
    };

    const variants = {
        default: 'text-gray-800',
        primary: 'text-blue-600',
        success: 'text-green-600',
        warning: 'text-amber-500',
        error: 'text-red-500',
        purple: 'text-purple-600',
    };

    return (
        <div className={`${className}`}>
            <p className={`${sizes[size].label} text-gray-500 uppercase tracking-wide mb-1`}>
                {label}
            </p>
            <div className="flex items-baseline gap-1">
                {icon && <span className={`${sizes[size].icon} ${variants[variant]}`}>{icon}</span>}
                <span className={`${sizes[size].value} font-bold ${variants[variant]}`}>
                    {value}
                </span>
                {unit && <span className="text-sm text-gray-500">{unit}</span>}
                {trend && (
                    <span className={`ml-2 text-xs ${trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
        </div>
    );
};

StatCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    unit: PropTypes.string,
    icon: PropTypes.node,
    trend: PropTypes.number,
    variant: PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'error', 'purple']),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    className: PropTypes.string,
};

export default StatCard;
