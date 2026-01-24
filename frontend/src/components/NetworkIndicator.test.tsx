import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NetworkIndicator } from './NetworkIndicator';
import { config } from '@/config';

describe('NetworkIndicator', () => {
  it('should not render when not connected', () => {
    const { container } = render(
      <NetworkIndicator
        chainId={null}
        connected={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should display Sepolia network name', () => {
    render(
      <NetworkIndicator
        chainId={config.chains.sepolia.chainId}
        connected={true}
      />
    );

    expect(screen.getByTestId('network-name')).toHaveTextContent('Sepolia');
  });

  it('should display Amoy network name', () => {
    render(
      <NetworkIndicator
        chainId={config.chains.amoy.chainId}
        connected={true}
      />
    );

    expect(screen.getByTestId('network-name')).toHaveTextContent('Amoy');
  });

  it('should display unsupported network warning for unknown chain', () => {
    render(
      <NetworkIndicator
        chainId={1}
        connected={true}
      />
    );

    expect(screen.getByTestId('network-warning')).toBeInTheDocument();
    expect(screen.getByTestId('network-warning')).toHaveTextContent('⚠ Unsupported Network');
  });

  it('should display network switch buttons for unsupported network', () => {
    const onSwitchNetwork = vi.fn();

    render(
      <NetworkIndicator
        chainId={1}
        connected={true}
        onSwitchNetwork={onSwitchNetwork}
      />
    );

    expect(screen.getByTestId('network-switch-buttons')).toBeInTheDocument();
    expect(screen.getByTestId('switch-to-sepolia')).toBeInTheDocument();
    expect(screen.getByTestId('switch-to-amoy')).toBeInTheDocument();
  });

  it('should not display switch buttons for supported network', () => {
    const onSwitchNetwork = vi.fn();

    render(
      <NetworkIndicator
        chainId={config.chains.sepolia.chainId}
        connected={true}
        onSwitchNetwork={onSwitchNetwork}
      />
    );

    expect(screen.queryByTestId('network-switch-buttons')).not.toBeInTheDocument();
  });

  it('should call onSwitchNetwork with Sepolia chain ID when Sepolia button clicked', async () => {
    const onSwitchNetwork = vi.fn().mockResolvedValue(undefined);

    render(
      <NetworkIndicator
        chainId={1}
        connected={true}
        onSwitchNetwork={onSwitchNetwork}
      />
    );

    const sepoliaButton = screen.getByTestId('switch-to-sepolia');
    fireEvent.click(sepoliaButton);

    await waitFor(() => {
      expect(onSwitchNetwork).toHaveBeenCalledWith(config.chains.sepolia.chainId);
    });
  });

  it('should call onSwitchNetwork with Amoy chain ID when Amoy button clicked', async () => {
    const onSwitchNetwork = vi.fn().mockResolvedValue(undefined);

    render(
      <NetworkIndicator
        chainId={1}
        connected={true}
        onSwitchNetwork={onSwitchNetwork}
      />
    );

    const amoyButton = screen.getByTestId('switch-to-amoy');
    fireEvent.click(amoyButton);

    await waitFor(() => {
      expect(onSwitchNetwork).toHaveBeenCalledWith(config.chains.amoy.chainId);
    });
  });

  it('should disable buttons when loading', () => {
    const onSwitchNetwork = vi.fn();

    render(
      <NetworkIndicator
        chainId={1}
        connected={true}
        onSwitchNetwork={onSwitchNetwork}
        loading={true}
      />
    );

    const sepoliaButton = screen.getByTestId('switch-to-sepolia');
    const amoyButton = screen.getByTestId('switch-to-amoy');

    expect(sepoliaButton).toBeDisabled();
    expect(amoyButton).toBeDisabled();
  });

  it('should display loading text when loading', () => {
    const onSwitchNetwork = vi.fn();

    render(
      <NetworkIndicator
        chainId={1}
        connected={true}
        onSwitchNetwork={onSwitchNetwork}
        loading={true}
      />
    );

    const sepoliaButton = screen.getByTestId('switch-to-sepolia');
    expect(sepoliaButton).toHaveTextContent('Switching...');
  });
});
