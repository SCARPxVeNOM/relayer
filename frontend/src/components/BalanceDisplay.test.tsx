import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import { WalletDisplay } from './WalletDisplay';

/**
 * Feature: wallet-integration-frontend, Property 26: Balance display
 * For any connected wallet, the system should display the current balance
 * Validates: Requirements 8.1
 */
describe('Property 26: Balance display', () => {
  it('should display balance for any connected wallet', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary wallet addresses and balances
        fc.record({
          metamaskConnected: fc.boolean(),
          metamaskAddress: fc.option(fc.string({ minLength: 40, maxLength: 42 }), { nil: null }),
          metamaskBalance: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true }), { nil: null }),
          leoWalletConnected: fc.boolean(),
          leoWalletAddress: fc.option(fc.string({ minLength: 50, maxLength: 63 }), { nil: null }),
          leoWalletBalance: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true }), { nil: null }),
        }),
        (walletState) => {
          // Ensure consistency: if connected, must have address
          const metamaskConnected = walletState.metamaskConnected && walletState.metamaskAddress !== null;
          const leoWalletConnected = walletState.leoWalletConnected && walletState.leoWalletAddress !== null;
          
          const metamaskAddress = metamaskConnected ? walletState.metamaskAddress : null;
          const leoWalletAddress = leoWalletConnected ? walletState.leoWalletAddress : null;
          const metamaskBalance = walletState.metamaskBalance !== null ? walletState.metamaskBalance.toString() : null;
          const leoWalletBalance = walletState.leoWalletBalance !== null ? walletState.leoWalletBalance.toString() : null;

          const { container } = render(
            <WalletDisplay
              metamaskAddress={metamaskAddress}
              metamaskBalance={metamaskBalance}
              leoWalletAddress={leoWalletAddress}
              leoWalletBalance={leoWalletBalance}
              metamaskConnected={metamaskConnected}
              leoWalletConnected={leoWalletConnected}
            />
          );

          // Property: For any connected wallet, balance should be displayed
          if (metamaskConnected) {
            const balanceElement = screen.getByTestId('metamask-balance');
            expect(balanceElement).toBeInTheDocument();
            expect(balanceElement.textContent).toContain('Balance:');
            expect(balanceElement.textContent).toContain('ETH');
          }

          if (leoWalletConnected) {
            const balanceElement = screen.getByTestId('leo-wallet-balance');
            expect(balanceElement).toBeInTheDocument();
            expect(balanceElement.textContent).toContain('Balance:');
            expect(balanceElement.textContent).toContain('ALEO');
          }

          // Cleanup
          container.remove();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: wallet-integration-frontend, Property 27: Balance update timeliness
 * For any wallet balance change, the system should update the displayed balance within 10 seconds
 * Validates: Requirements 8.2
 */
describe('Property 27: Balance update timeliness', () => {
  it('should update balance display when balance prop changes', () => {
    fc.assert(
      fc.property(
        // Generate two different balance values that will be visually different when formatted
        fc.tuple(
          fc.double({ min: 0, max: 1000000, noNaN: true }),
          fc.double({ min: 0, max: 1000000, noNaN: true })
        ).filter(([b1, b2]) => {
          // Ensure balances are different when formatted to 4 decimal places
          const formatted1 = b1.toFixed(4);
          const formatted2 = b2.toFixed(4);
          return formatted1 !== formatted2;
        }),
        fc.string({ minLength: 40, maxLength: 42 }),
        ([initialBalance, updatedBalance], address) => {
          const container = document.createElement('div');
          document.body.appendChild(container);
          
          const { rerender, unmount } = render(
            <WalletDisplay
              metamaskAddress={address}
              metamaskBalance={initialBalance.toString()}
              leoWalletAddress={null}
              leoWalletBalance={null}
              metamaskConnected={true}
              leoWalletConnected={false}
            />,
            { container }
          );

          // Get initial balance display
          const balanceElement = container.querySelector('[data-testid="metamask-balance"]');
          expect(balanceElement).toBeTruthy();
          const initialText = balanceElement!.textContent;

          // Update balance
          rerender(
            <WalletDisplay
              metamaskAddress={address}
              metamaskBalance={updatedBalance.toString()}
              leoWalletAddress={null}
              leoWalletBalance={null}
              metamaskConnected={true}
              leoWalletConnected={false}
            />
          );

          // Property: Balance display should update when balance changes
          const updatedText = balanceElement!.textContent;
          expect(updatedText).not.toBe(initialText);
          expect(updatedText).toContain(updatedBalance.toFixed(4));
          
          // Cleanup
          unmount();
          document.body.removeChild(container);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: wallet-integration-frontend, Property 28: Amount formatting
 * For any displayed amount, the system should format it with appropriate decimal places (18 for ETH, 18 for MATIC)
 * Validates: Requirements 8.3
 */
describe('Property 28: Amount formatting', () => {
  it('should format all amounts with 4 decimal places', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary balance values
        fc.double({ min: 0, max: 1000000, noNaN: true }),
        fc.string({ minLength: 40, maxLength: 42 }),
        (balance, address) => {
          const container = document.createElement('div');
          document.body.appendChild(container);
          
          const { unmount } = render(
            <WalletDisplay
              metamaskAddress={address}
              metamaskBalance={balance.toString()}
              leoWalletAddress={null}
              leoWalletBalance={null}
              metamaskConnected={true}
              leoWalletConnected={false}
            />,
            { container }
          );

          // Property: All displayed amounts should be formatted with 4 decimal places
          const balanceElement = container.querySelector('[data-testid="metamask-balance"]');
          expect(balanceElement).toBeTruthy();
          const balanceText = balanceElement!.textContent || '';
          
          // Extract the numeric part from "Balance: X.XXXX ETH"
          const match = balanceText.match(/Balance:\s*([\d.]+)\s*ETH/);
          expect(match).toBeTruthy();
          
          const formattedBalance = match![1];
          const expectedFormat = balance.toFixed(4);
          
          // Verify the formatted balance matches expected format
          expect(formattedBalance).toBe(expectedFormat);
          
          // Cleanup
          unmount();
          document.body.removeChild(container);
        }
      ),
      { numRuns: 100 }
    );
  });
});
