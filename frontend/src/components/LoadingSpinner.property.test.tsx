/**
 * Property-Based Tests for LoadingSpinner Component
 * 
 * Feature: wallet-integration-frontend, Property 32: Loading state display
 * Validates: Requirements 9.1
 * 
 * Property: For any application initialization, the system should display a loading state 
 * while initializing wallet connections
 */

import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import * as fc from 'fast-check';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner - Property-Based Tests', () => {
  describe('Property 32: Loading state display', () => {
    it('should always render a loading spinner when component is mounted', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.option(fc.string(), { nil: undefined }),
            size: fc.constantFrom('small', 'medium', 'large'),
          }),
          (props) => {
            const { container, unmount } = render(
              <LoadingSpinner 
                message={props.message} 
                size={props.size}
              />
            );

            // The loading spinner should always be present
            const spinner = within(container).getByTestId('loading-spinner');
            expect(spinner).toBeInTheDocument();

            // The spinner icon should always be present
            const spinnerIcon = within(container).getByTestId('spinner-icon');
            expect(spinnerIcon).toBeInTheDocument();

            // If a message is provided, it should be displayed
            if (props.message) {
              const message = within(container).getByTestId('spinner-message');
              expect(message).toBeInTheDocument();
              // Check that the message contains the text (allowing for whitespace)
              expect(message.textContent).toBe(props.message);
            }

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display loading state with any valid message string', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (message) => {
            const { container, unmount } = render(
              <LoadingSpinner message={message} />
            );

            // Loading spinner should be visible
            expect(within(container).getByTestId('loading-spinner')).toBeInTheDocument();
            
            // Message should be displayed
            const messageElement = within(container).getByTestId('spinner-message');
            expect(messageElement).toBeInTheDocument();
            // Check that the message text matches exactly (including whitespace)
            expect(messageElement.textContent).toBe(message);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should render with any valid size option', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('small', 'medium', 'large'),
          (size) => {
            const { container, unmount } = render(
              <LoadingSpinner size={size} />
            );

            // Loading spinner should be visible with the correct size class
            const spinner = within(container).getByTestId('loading-spinner');
            expect(spinner).toBeInTheDocument();
            expect(spinner).toHaveClass(size);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
