import React from 'react';
import { mapError, isRetryable } from '../utils/error-mapping';

export interface ErrorMessageProps {
  error: string | Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  if (!error) return null;

  const errorInfo = mapError(error);
  const showRetry = errorInfo.retryable && onRetry;

  return (
    <div className="error-message-container" data-testid="error-message">
      <div className="error-content">
        <div className="error-icon">⚠</div>
        <div className="error-text">
          <div className="error-title" data-testid="error-title">
            {errorInfo.userMessage}
          </div>
          <div className="error-guidance" data-testid="error-guidance">
            {errorInfo.guidance}
          </div>
        </div>
      </div>
      <div className="error-actions">
        {showRetry && (
          <button
            onClick={onRetry}
            className="retry-button"
            data-testid="retry-button"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="dismiss-button"
            data-testid="dismiss-button"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};
