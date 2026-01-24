import React from 'react';
import { config, SUPPORTED_CHAIN_IDS } from '@/config';

export interface NetworkIndicatorProps {
  chainId: number | null;
  connected: boolean;
  onSwitchNetwork?: (chainId: number) => Promise<void>;
  loading?: boolean;
}

export const NetworkIndicator: React.FC<NetworkIndicatorProps> = ({
  chainId,
  connected,
  onSwitchNetwork,
  loading = false,
}) => {
  const getNetworkName = (id: number | null): string => {
    if (!id) return 'Unknown';
    if (id === config.chains.sepolia.chainId) return 'Sepolia';
    if (id === config.chains.amoy.chainId) return 'Amoy';
    return `Chain ${id}`;
  };

  const isSupported = chainId !== null && SUPPORTED_CHAIN_IDS.includes(chainId as typeof SUPPORTED_CHAIN_IDS[number]);

  if (!connected) {
    return null;
  }

  return (
    <div className="flex items-center gap-2" data-testid="network-indicator">
      <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-black border transition-all uppercase tracking-[0.1em]
        ${isSupported
          ? 'bg-primary/5 border-primary/20 text-primary shadow-[0_0_15px_rgba(0,170,255,0.1)]'
          : 'bg-destructive/5 border-destructive/20 text-destructive'
        }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isSupported ? 'bg-primary shadow-[0_0_5px_rgba(0,170,255,1)]' : 'bg-destructive animate-pulse'}`} />
        <span data-testid="network-name">
          {getNetworkName(chainId)}
        </span>
        {!isSupported && (
          <span className="ml-1 text-[10px]" data-testid="network-warning">
            ⚠
          </span>
        )}
      </div>

      {!isSupported && onSwitchNetwork && (
        <div className="flex flex-col gap-1 absolute top-full left-0 mt-2 w-full z-50 p-2 bg-black/90 border border-white/10 rounded-xl backdrop-blur-md shadow-xl" data-testid="network-switch-buttons">
          <p className="text-xs text-gray-400 px-1 mb-1">Switch to:</p>
          <button
            onClick={() => onSwitchNetwork(config.chains.sepolia.chainId)}
            disabled={loading}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            data-testid="switch-to-sepolia"
          >
            {loading ? 'Switching...' : 'Sepolia'}
          </button>
          <button
            onClick={() => onSwitchNetwork(config.chains.amoy.chainId)}
            disabled={loading}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            data-testid="switch-to-amoy"
          >
            {loading ? 'Switching...' : 'Amoy'}
          </button>
        </div>
      )}
    </div>
  );
};
