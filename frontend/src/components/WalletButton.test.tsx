import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletButton } from './WalletButton';

describe('WalletButton', () => {
  it('should display connect button when not connected', () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();

    render(
      <WalletButton
        walletType="metamask"
        connected={false}
        address={null}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    );

    const button = screen.getByTestId('metamask-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Connect MetaMask');
  });

  it('should display formatted address when connected', () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    const address = '0x1234567890abcdef1234567890abcdef12345678';

    render(
      <WalletButton
        walletType="metamask"
        connected={true}
        address={address}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    );

    const button = screen.getByTestId('metamask-button');
    expect(button).toHaveTextContent('0x1234...5678');
  });

  it('should call onConnect when clicked while disconnected', async () => {
    const onConnect = vi.fn().mockResolvedValue(undefined);
    const onDisconnect = vi.fn();

    render(
      <WalletButton
        walletType="metamask"
        connected={false}
        address={null}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    );

    const button = screen.getByTestId('metamask-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(onConnect).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onDisconnect when clicked while connected', async () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn().mockResolvedValue(undefined);
    const address = '0x1234567890abcdef1234567890abcdef12345678';

    render(
      <WalletButton
        walletType="metamask"
        connected={true}
        address={address}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    );

    const button = screen.getByTestId('metamask-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(onDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  it('should display loading state', () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();

    render(
      <WalletButton
        walletType="metamask"
        connected={false}
        address={null}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        loading={true}
      />
    );

    const button = screen.getByTestId('metamask-button');
    expect(button).toHaveTextContent('Connecting...');
    expect(button).toBeDisabled();
  });

  it('should display error message when error is provided', () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    const error = 'MetaMask is not installed';

    render(
      <WalletButton
        walletType="metamask"
        connected={false}
        address={null}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        error={error}
      />
    );

    const errorElement = screen.getByTestId('metamask-error');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveTextContent(error);
  });

  it('should work with Leo Wallet type', () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();

    render(
      <WalletButton
        walletType="leo"
        connected={false}
        address={null}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    );

    const button = screen.getByTestId('leo-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Connect Leo Wallet');
  });

  describe('Button disabling during operations', () => {
    it('should disable button when loading is true', () => {
      const onConnect = vi.fn();
      const onDisconnect = vi.fn();

      render(
        <WalletButton
          walletType="metamask"
          connected={false}
          address={null}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          loading={true}
        />
      );

      const button = screen.getByTestId('metamask-button');
      expect(button).toBeDisabled();
    });

    it('should enable button when loading is false', () => {
      const onConnect = vi.fn();
      const onDisconnect = vi.fn();

      render(
        <WalletButton
          walletType="metamask"
          connected={false}
          address={null}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          loading={false}
        />
      );

      const button = screen.getByTestId('metamask-button');
      expect(button).not.toBeDisabled();
    });

    it('should not call onClick handler when button is disabled', async () => {
      const onConnect = vi.fn();
      const onDisconnect = vi.fn();

      render(
        <WalletButton
          walletType="metamask"
          connected={false}
          address={null}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          loading={true}
        />
      );

      const button = screen.getByTestId('metamask-button');
      fireEvent.click(button);

      // Handler should not be called when button is disabled
      expect(onConnect).not.toHaveBeenCalled();
    });

    it('should show loading class when loading', () => {
      const onConnect = vi.fn();
      const onDisconnect = vi.fn();

      render(
        <WalletButton
          walletType="metamask"
          connected={false}
          address={null}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          loading={true}
        />
      );

      const button = screen.getByTestId('metamask-button');
      expect(button).toHaveClass('loading');
    });
  });
});
