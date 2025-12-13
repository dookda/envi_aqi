import PropTypes from 'prop-types';
import { Spinner } from '../atoms';

const LoadingState = ({ message = 'Loading...', size = 'lg', className = '' }) => {
  return (
    <div className={`flex justify-center items-center h-screen bg-gray-50 ${className}`}>
      <div className="flex flex-col items-center">
        <Spinner size={size} color="primary" />
        <p className="mt-4 text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
};

LoadingState.propTypes = {
  message: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
};

export default LoadingState;
