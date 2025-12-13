import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button } from '../atoms';

const PageHeader = ({
  title,
  subtitle,
  actionButton,
  variant = 'default',
  className = '',
}) => {
  const variants = {
    default: 'bg-white/90 backdrop-blur-md shadow-lg',
    glass: 'bg-white/60 backdrop-blur-md shadow-lg border-b border-white/20',
  };

  return (
    <header className={`${variants[variant]} ${className}`}>
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 text-sm mt-1">{subtitle}</p>
          )}
        </div>
        {actionButton && (
          <div>
            {actionButton.to ? (
              <Link to={actionButton.to}>
                <Button
                  variant={actionButton.variant || 'primary'}
                  size={actionButton.size || 'md'}
                  icon={actionButton.icon}
                >
                  {actionButton.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant={actionButton.variant || 'primary'}
                size={actionButton.size || 'md'}
                onClick={actionButton.onClick}
                icon={actionButton.icon}
              >
                {actionButton.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  actionButton: PropTypes.shape({
    label: PropTypes.string.isRequired,
    to: PropTypes.string,
    onClick: PropTypes.func,
    variant: PropTypes.string,
    size: PropTypes.string,
    icon: PropTypes.node,
  }),
  variant: PropTypes.oneOf(['default', 'glass']),
  className: PropTypes.string,
};

export default PageHeader;
