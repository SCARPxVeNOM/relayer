import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage } from './ErrorMessage';

describe('ErrorMessage', () => {
  it('should not render when error is null', () => {
    const { container } = render(
      <ErrorMessage error={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should display error message', () => {
    const error = 'MetaMask is not installed';

    render(<ErrorMessage error={error} />);

    expect(screen.getByTestId('error-title')).toBeInTheDocument();
  });

  it('should display actionable guidance for "not installed" error', () => {
    const error = 'MetaMask is not installed';

    render(<ErrorMessage error={error} />);

    const guidance = screen.getByTestId('error-guidance');
    expect(guidance).toHaveTextContent('install');
    expect(guidance).toHaveTextContent('MetaMask');
  });

  it('should display actionable guidance for "rejected" error', () => {
    const error = 'Connection rejected by user';

    render(<ErrorMessage error={error} />);

    const guidance = screen.getByTestId('error-guidance');
    expect(guidance).toHaveTextContent('retry');
  });

  it('should display actionable guidance for "timeout" error', () => {
    const error = 'Request timeout';

    render(<ErrorMessage error={error} />);

    const guidance = screen.getByTestId('error-guidance');
    expect(guidance).toHaveTextContent('try again');
  });

  it('should display actionable guidance for "network" error', () => {
    const error = 'Unsupported network';

    render(<ErrorMessage error={error} />);

    const guidance = screen.getByTestId('error-guidance');
    expect(guidance).toHaveTextContent('switch');
    expect(guidance).toHaveTextContent('Sepolia');
  });

  it('should display generic guidance for unknown error', () => {
    const error = 'Something went wrong';

    render(<ErrorMessage error={error} />);

    const guidance = screen.getByTestId('error-guidance');
    expect(guidance).toHaveTextContent('try again');
  });

  it('should display retry button when onRetry is provided and error is retryable', () => {
    const onRetry = vi.fn();
    const error = 'Connection rejected';

    render(<ErrorMessage error={error} onRetry={onRetry} />);

    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });

  it('should NOT display retry button for non-retryable errors', () => {
    const onRetry = vi.fn();
    const error = 'MetaMask is not installed';

    render(<ErrorMessage error={error} onRetry={onRetry} />);

    expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    const error = 'Connection rejected';

    render(<ErrorMessage error={error} onRetry={onRetry} />);

    const retryButton = screen.getByTestId('retry-button');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should display dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    const error = 'Connection failed';

    render(<ErrorMessage error={error} onDismiss={onDismiss} />);

    expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    const error = 'Connection failed';

    render(<ErrorMessage error={error} onDismiss={onDismiss} />);

    const dismissButton = screen.getByTestId('dismiss-button');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should display both retry and dismiss buttons when both callbacks are provided and error is retryable', () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    const error = 'Connection rejected';

    render(<ErrorMessage error={error} onRetry={onRetry} onDismiss={onDismiss} />);

    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
  });

  it('should handle Error objects', () => {
    const error = new Error('Request timeout');

    render(<ErrorMessage error={error} />);

    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByTestId('error-guidance')).toBeInTheDocument();
  });

  it('should map user-friendly messages', () => {
    const error = 'ethereum not found';

    render(<ErrorMessage error={error} />);

    const title = screen.getByTestId('error-title');
    expect(title.textContent).toContain('MetaMask');
  });
});

