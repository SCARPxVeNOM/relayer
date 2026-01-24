import React from 'react';

export interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'medium',
}) => {
  return (
    <div className={`loading-spinner ${size}`} data-testid="loading-spinner">
      <div className="spinner-icon" data-testid="spinner-icon"></div>
      {message && (
        <div className="spinner-message" data-testid="spinner-message">
          {message}
        </div>
      )}
    </div>
  );
};
