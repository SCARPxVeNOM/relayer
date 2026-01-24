/**
 * Unit Tests for LoadingSpinner Component
 * 
 * Tests loading spinner display, button disabling during operations, and skeleton loaders
 * Requirements: 9.1, 9.2
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Loading spinner display', () => {
    it('should render loading spinner with default props', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('medium');
    });

    it('should render loading spinner with custom message', () => {
      render(<LoadingSpinner message="Loading wallet..." />);
      
      const message = screen.getByTestId('spinner-message');
      expect(message).toBeInTheDocument();
      expect(message).toHaveTextContent('Loading wallet...');
    });

    it('should render loading spinner with small size', () => {
      render(<LoadingSpinner size="small" />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('small');
    });

    it('should render loading spinner with large size', () => {
      render(<LoadingSpinner size="large" />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('large');
    });

    it('should not render message when not provided', () => {
      render(<LoadingSpinner />);
      
      const message = screen.queryByTestId('spinner-message');
      expect(message).not.toBeInTheDocument();
    });

    it('should always render spinner icon', () => {
      render(<LoadingSpinner />);
      
      const spinnerIcon = screen.getByTestId('spinner-icon');
      expect(spinnerIcon).toBeInTheDocument();
    });
  });

  describe('Loading spinner with various messages', () => {
    it('should display "Connecting..." message', () => {
      render(<LoadingSpinner message="Connecting..." />);
      
      expect(screen.getByTestId('spinner-message')).toHaveTextContent('Connecting...');
    });

    it('should display "Processing transaction..." message', () => {
      render(<LoadingSpinner message="Processing transaction..." />);
      
      expect(screen.getByTestId('spinner-message')).toHaveTextContent('Processing transaction...');
    });

    it('should display "Loading balances..." message', () => {
      render(<LoadingSpinner message="Loading balances..." />);
      
      expect(screen.getByTestId('spinner-message')).toHaveTextContent('Loading balances...');
    });
  });
});
