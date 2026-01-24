/**
 * Property-Based Tests for Button Disabling During Operations
 * 
 * Feature: wallet-integration-frontend, Property 33: Operation button disabling
 * Validates: Requirements 9.2
 * 
 * Property: For any in-progress wallet operation, the system should disable relevant buttons 
 * to prevent duplicate submissions
 */

import { describe, it, expect, vi } from 'vitest';
import { render, within } from '@testing-library/react';
import * as fc from 'fast-check';
import { WalletButton } from './WalletButton';

describe('WalletButton - Property-Based Tests for Button Disabling', () => {
  describe('Property 33: Operation button disabling', () => {
    it('should always disable button when loading is true, regardless of other props', () => {
      fc.assert(
        fc.property(
          fc.record({
            walletType: fc.constantFrom('metamask', 'leo'),
            connected: fc.boolean(),
            address: fc.option(
              fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 40, maxLength: 40 }).map(arr => '0x' + arr.join('')),
              { nil: null }
            ),
            error: fc.option(fc.string(), { nil: null }),
          }),
          (props) => {
            const onConnect = vi.fn().mockResolvedValue(undefined);
            const onDisconnect = vi.fn().mockResolvedValue(undefined);

            const { container, unmount } = render(
              <WalletButton
                walletType={props.walletType as 'metamask' | 'leo'}
                connected={props.connected}
                address={props.address}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
                loading={true}
                error={props.error}
              />
            );

            // Button should always be disabled when loading is true
            const button = within(container).getByTestId(`${props.walletType}-button`);
            expect(button).toBeDisabled();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enable button when loading is false and no operation is in progress', () => {
      fc.assert(
        fc.property(
          fc.record({
            walletType: fc.constantFrom('metamask', 'leo'),
            connected: fc.boolean(),
            address: fc.option(
              fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 40, maxLength: 40 }).map(arr => '0x' + arr.join('')),
              { nil: null }
            ),
          }),
          (props) => {
            const onConnect = vi.fn().mockResolvedValue(undefined);
            const onDisconnect = vi.fn().mockResolvedValue(undefined);

            const { container, unmount } = render(
              <WalletButton
                walletType={props.walletType as 'metamask' | 'leo'}
                connected={props.connected}
                address={props.address}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
                loading={false}
              />
            );

            // Button should be enabled when loading is false
            const button = within(container).getByTestId(`${props.walletType}-button`);
            expect(button).not.toBeDisabled();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show loading indicator when button is in loading state', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('metamask', 'leo'),
          (walletType) => {
            const onConnect = vi.fn().mockResolvedValue(undefined);
            const onDisconnect = vi.fn().mockResolvedValue(undefined);

            const { container, unmount } = render(
              <WalletButton
                walletType={walletType as 'metamask' | 'leo'}
                connected={false}
                address={null}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
                loading={true}
              />
            );

            // Button should have loading class
            const button = within(container).getByTestId(`${walletType}-button`);
            expect(button).toHaveClass('loading');

            // Button should show loading text
            expect(button).toHaveTextContent('Connecting...');

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
