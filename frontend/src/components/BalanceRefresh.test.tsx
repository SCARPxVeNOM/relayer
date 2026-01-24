import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BalanceRefresh } from './BalanceRefresh';
import { useWalletStore } from '@/stores/wallet.store';

// Mock the wallet store
vi.mock('@/stores/wallet.store', () => ({
  useWalletStore: vi.fn(),
}));

describe('BalanceRefresh', () => {
  let mockRefreshBalances: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRefreshBalances = vi.fn().mockResolvedValue(undefined);
    
    // Mock the store selector to return the refresh function
    (useWalletStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      const mockState = {
        refreshBalances: mockRefreshBalances,
      };
      return selector(mockState);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render refresh button', () => {
    render(<BalanceRefresh />);
    
    const button = screen.getByTestId('balance-refresh-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Refresh Balances');
  });

  it('should call refreshBalances when button is clicked', async () => {
    render(<BalanceRefresh />);
    
    const button = screen.getByTestId('balance-refresh-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockRefreshBalances).toHaveBeenCalled();
    });
  });

  it('should disable button while refreshing', async () => {
    // Make refresh take some time
    let resolveRefresh: () => void;
    mockRefreshBalances.mockImplementation(() => new Promise<void>(resolve => {
      resolveRefresh = resolve;
    }));
    
    render(<BalanceRefresh />);
    
    const button = screen.getByTestId('balance-refresh-button');
    expect(button).not.toBeDisabled();
    
    fireEvent.click(button);
    
    // Button should be disabled immediately
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
    expect(button).toHaveTextContent('Refreshing...');
    
    // Resolve the refresh
    resolveRefresh!();
    
    // Wait for refresh to complete
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
    expect(button).toHaveTextContent('Refresh Balances');
  });

  it('should auto-refresh balances every 10 seconds by default', () => {
    vi.useFakeTimers();
    
    render(<BalanceRefresh />);
    
    // Initially not called
    expect(mockRefreshBalances).toHaveBeenCalledTimes(0);
    
    // Fast-forward 10 seconds
    vi.advanceTimersByTime(10000);
    expect(mockRefreshBalances).toHaveBeenCalledTimes(1);
    
    // Fast-forward another 10 seconds
    vi.advanceTimersByTime(10000);
    expect(mockRefreshBalances).toHaveBeenCalledTimes(2);
    
    // Fast-forward another 10 seconds
    vi.advanceTimersByTime(10000);
    expect(mockRefreshBalances).toHaveBeenCalledTimes(3);
    
    vi.useRealTimers();
  });

  it('should use custom auto-refresh interval', () => {
    vi.useFakeTimers();
    
    render(<BalanceRefresh autoRefreshInterval={5000} />);
    
    expect(mockRefreshBalances).toHaveBeenCalledTimes(0);
    
    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);
    expect(mockRefreshBalances).toHaveBeenCalledTimes(1);
    
    // Fast-forward another 5 seconds
    vi.advanceTimersByTime(5000);
    expect(mockRefreshBalances).toHaveBeenCalledTimes(2);
    
    vi.useRealTimers();
  });

  it('should cleanup interval on unmount', () => {
    vi.useFakeTimers();
    
    const { unmount } = render(<BalanceRefresh />);
    
    // Fast-forward 10 seconds
    vi.advanceTimersByTime(10000);
    expect(mockRefreshBalances).toHaveBeenCalledTimes(1);
    
    // Unmount component
    unmount();
    
    // Fast-forward another 10 seconds - should not call refresh
    vi.advanceTimersByTime(10000);
    expect(mockRefreshBalances).toHaveBeenCalledTimes(1);
    
    vi.useRealTimers();
  });
});
