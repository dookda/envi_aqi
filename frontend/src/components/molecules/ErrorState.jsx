import PropTypes from 'prop-types';
import { Card } from '../atoms';

const ErrorState = ({ title = 'Error', message, className = '' }) => {
  return (
    <div className={`flex justify-center items-center h-screen bg-gray-50 ${className}`}>
      <Card variant="default" padding="lg" className="max-w-md bg-red-50 border-red-200">
        <h2 className="text-red-800 font-bold text-xl mb-2">{title}</h2>
        <p className="text-red-600">{message}</p>
      </Card>
    </div>
  );
};

ErrorState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default ErrorState;
