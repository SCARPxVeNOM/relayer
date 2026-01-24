"use client";

import React from 'react';
import { useTransactionHistoryStore, type Transaction } from '@/stores/transaction-history.store';
import { config } from '@/config';
import { ExternalLink, Clock, Shield, Hash, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

export const TransactionHistory: React.FC = () => {
  const { transactions } = useTransactionHistoryStore();
  const [selectedTx, setSelectedTx] = React.useState<Transaction | null>(null);

  const getChainName = (chainId: number): string => {
    if (chainId === config.chains.sepolia.chainId) return "Sepolia";
    if (chainId === config.chains.amoy.chainId) return "Amoy";
    return `Chain ${chainId}`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (transactions.length === 0) {
    return (
      <div className="p-16 text-center border border-white/5 bg-black">
        <div className="inline-flex items-center justify-center w-16 h-16 border border-white/10 bg-white/5 mb-6">
          <Hash className="w-8 h-8 text-white/20" />
        </div>
        <h4 className="hud-text text-white mb-2">No Trace Logic Found</h4>
        <p className="text-[10px] text-white/40 uppercase tracking-widest">Encryption telemetry logs will synchronize once verified.</p>
      </div>
    );
  }

  return (
    <div className="border border-white/5 bg-black shadow-3xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#050505] border-b border-white/10">
              <th className="px-6 py-4 hud-text text-white/40">Identifier</th>
              <th className="px-6 py-4 hud-text text-white/40">Gateway</th>
              <th className="px-6 py-4 hud-text text-white/40">Payload</th>
              <th className="px-6 py-4 hud-text text-white/40">Status</th>
              <th className="px-6 py-4 hud-text text-white/40 text-right">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                onClick={() => setSelectedTx(tx)}
              >
                <td className="px-6 py-5">
                  <span className="font-mono text-[11px] text-white/50 font-bold tracking-widest">{formatAddress(tx.recipientAddress)}</span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-primary/40" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{getChainName(tx.destinationChain)}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="text-xs font-mono font-bold text-white">{tx.amount} <span className="text-[9px] text-white/30 uppercase font-black tracking-widest ml-1">ETH</span></span>
                </td>
                <td className="px-6 py-5">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 border ${tx.status === 'confirmed' ? 'bg-green-500/10 border-green-500/20 text-green-500' : tx.status === 'failed' ? 'bg-red-600/10 border-red-600/20 text-red-500' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                    <div className={`w-1 h-2 ${tx.status === 'confirmed' ? 'bg-green-500' : tx.status === 'failed' ? 'bg-red-600' : 'bg-primary'}`} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{tx.status}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right font-mono text-[10px] text-white/40 tracking-widest">
                  {formatTimestamp(tx.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedTx(null)}
          />
          <div
            className="relative w-full max-w-md border border-white/10 bg-[#050505] p-10 shadow-3xl"
          >
            <div className="mb-10 border-b border-white/5 pb-6">
              <span className="hud-text text-primary mb-2 block">Telemetry Data Point</span>
              <h4 className="text-2xl font-black uppercase tracking-tighter italic text-white leading-none">Transaction Log</h4>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center py-4 border-b border-white/5">
                <span className="hud-text text-white/30">Target Gateway</span>
                <span className="text-[11px] font-black uppercase tracking-widest text-white">{getChainName(selectedTx.destinationChain)}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-white/5">
                <span className="hud-text text-white/30">Protocol Staking</span>
                <span className="text-xs font-mono font-black italic text-secondary">{selectedTx.amount} ETH</span>
              </div>

              <div className="pt-8">
                <Button
                  onClick={() => window.open(`${config.aleo.explorer}/transaction/${selectedTx.aleoTxId}`, '_blank')}
                  variant="mission"
                  className="w-full h-12"
                >
                  Circuit Observer <ExternalLink className="w-4 h-4 ml-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
