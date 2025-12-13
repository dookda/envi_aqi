import PropTypes from 'prop-types';

const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles = 'rounded-lg transition-all duration-base';

  const variants = {
    default: 'bg-white shadow-md border border-gray-200',
    elevated: 'bg-white shadow-lg border border-gray-200',
    glass: 'bg-white/90 backdrop-blur-md shadow-lg border border-white/30',
    outlined: 'bg-transparent border-2 border-gray-300',
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const interactiveStyles = onClick ? 'cursor-pointer hover:shadow-xl' : '';

  return (
    <div
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'elevated', 'glass', 'outlined']),
  padding: PropTypes.oneOf(['none', 'sm', 'md', 'lg']),
  className: PropTypes.string,
  onClick: PropTypes.func,
};

export default Card;
