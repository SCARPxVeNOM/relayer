"use client";

import React from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { config, SUPPORTED_CHAIN_IDS } from '@/config';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';

export interface WalletButtonProps {
  walletType: 'metamask' | 'leo';
  connected: boolean;
  address: string | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export const WalletButton: React.FC<WalletButtonProps> = ({
  walletType,
  connected,
  address,
  onConnect,
  onDisconnect,
  loading = false,
  error = null,
}) => {
  const walletName = walletType === 'metamask' ? 'Metamask' : 'Leo Vault';

  const handleClick = async () => {
    if (connected) {
      await onDisconnect();
    } else {
      await onConnect();
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="relative w-full">
      <Button
        onClick={handleClick}
        disabled={loading}
        variant="ghost"
        size="sm"
        className={cn(
          "w-full justify-between h-10 px-4 transition-all duration-300",
          connected ? "text-primary border-primary/20 bg-primary/5" : "text-white/40 hover:text-white hover:bg-white/5 border-transparent border",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5" />
          ) : (
            <div className={cn("w-1.5 h-3", connected ? "bg-primary shadow-[0_0_8px_rgba(255,77,0,0.6)]" : "bg-white/10")} />
          )}
          <span className="hud-text text-[9px]">{loading ? 'Routing...' : connected ? 'Port Online' : `Link ${walletName}`}</span>
        </span>
        {connected && address && (
          <span className="font-mono text-[9px] font-bold text-white/40 border-l border-white/10 pl-3">{formatAddress(address)}</span>
        )}
      </Button>
      {error && (
        <div className="absolute top-full left-0 mt-2 w-full p-3 border border-red-600/20 bg-red-600/5 text-red-500 text-[8px] font-black text-center uppercase tracking-[0.2em] leading-tight">
          {error}
        </div>
      )}
    </div>
  );
};

/* NetworkIndicator implementation */

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

  if (!connected) return null;

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-2 px-2.5 py-1 border transition-all
        ${isSupported ? 'bg-secondary/10 border-secondary/30 text-secondary' : 'bg-red-600/10 border-red-600/20 text-red-500'}`}>
        <div className={`w-1 h-2 ${isSupported ? 'bg-secondary' : 'bg-red-600'}`} />
        <span className="hud-text text-[8px]">{getNetworkName(chainId)}</span>
      </div>
    </div>
  );
};
