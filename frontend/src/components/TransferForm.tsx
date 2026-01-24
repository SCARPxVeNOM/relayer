"use client";

import React from 'react';
import { useSessionStore } from '@/stores/session.store';
import { config } from '@/config';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, ArrowRight } from 'lucide-react';
import { apiClient } from '@/services/api.client';

/**
 * Transfer Form - Command Core Intent Creation
 * 
 * This is the ONLY component that creates execution intents.
 * 
 * Form → Aleo Intent Mapping:
 * - Payload Volume → amount (private)
 * - Mission Gateway → chainId (private)
 * - Endpoint Identity → recipient (private)
 * 
 * On submit: POST /api/intent
 * Backend handles all EVM transactions.
 */
export const TransferForm: React.FC = () => {
  const { aleoConnected, controlSessionActive } = useSessionStore();
  
  const [form, setForm] = React.useState({
    amount: '',
    destinationChain: 'sepolia' as 'sepolia' | 'amoy',
    recipientAddress: '',
  });
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [requestId, setRequestId] = React.useState<string | null>(null);

  // Form is disabled unless: Aleo connected AND session active
  const isFormDisabled = !aleoConnected || !controlSessionActive;

  const isSubmitEnabled = React.useMemo(() => {
    if (isFormDisabled || isSubmitting) return false;
    if (!form.amount || !form.recipientAddress) return false;
    // Basic validation
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) return false;
    if (!form.recipientAddress.startsWith('0x') || form.recipientAddress.length !== 42) return false;
    return true;
  }, [isFormDisabled, isSubmitting, form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitEnabled) return;
    
    setIsSubmitting(true);
    setError(null);
    setRequestId(null);

    try {
      // Map form to intent
      const chainId = form.destinationChain === 'sepolia' 
        ? config.chains.sepolia.chainId 
        : config.chains.amoy.chainId;

      // POST /api/intent - Backend handles Aleo transaction
      const response = await apiClient.createIntent({
        chainId,
        amount: form.amount,
        recipient: form.recipientAddress,
      });

      setRequestId(response.requestId);
      
      // Reset form after successful submission
      setForm({
        amount: '',
        destinationChain: 'sepolia',
        recipientAddress: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Intent creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {isFormDisabled && (
        <div className="p-4 border border-white/5 bg-white/5 text-[9px] font-black uppercase tracking-[0.3em] text-white/40 text-center">
          {!aleoConnected ? 'Connect Aleo Wallet' : !controlSessionActive ? 'Initialize Session on Landing Page' : 'Awaiting Secure Uplink Handshake'}
        </div>
      )}

      <div className="space-y-10">
        <div className="space-y-4">
          <Label>Payload Volume (ETH)</Label>
          <div className="relative group p-0.5 border border-white/10 bg-black focus-within:border-primary/40 transition-colors">
            <Input
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              disabled={isFormDisabled}
              placeholder="0.00"
              className="h-14 border-0 bg-transparent text-3xl font-black italic tracking-tighter"
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label>Mission Gateway</Label>
          <div className="p-0.5 border border-white/10 bg-black">
            <select
              value={form.destinationChain}
              onChange={(e) => setForm({ ...form, destinationChain: e.target.value as 'sepolia' | 'amoy' })}
              disabled={isFormDisabled}
              className="w-full h-11 bg-transparent border-0 px-4 text-[10px] font-black uppercase tracking-[0.3em] focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer text-white/80"
            >
              <option value="sepolia">Ethereal Sepolia</option>
              <option value="amoy">Polygon Amoy</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Endpoint Identity</Label>
          <div className="p-0.5 border border-white/10 bg-black focus-within:border-secondary/40 transition-colors">
            <Input
              value={form.recipientAddress}
              onChange={(e) => setForm({ ...form, recipientAddress: e.target.value })}
              disabled={isFormDisabled}
              placeholder="0x..."
              className="h-11 border-0 bg-transparent text-[11px] font-mono tracking-widest"
            />
          </div>
        </div>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          disabled={!isSubmitEnabled}
          variant="default"
          className="w-full h-14"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4" />
              Executing Bridge...
            </div>
          ) : (
            <div className="flex items-center gap-3">
              Initialize Secure Tunnel
              <ArrowRight className="w-4 h-4" />
            </div>
          )}
        </Button>
      </div>

      {requestId && (
        <div className="p-4 border border-primary/20 bg-primary/5 text-[9px] font-black text-primary uppercase tracking-[0.2em] text-center">
          SECURE HANDSHAKE INITIATED<br />
          <span className="text-[8px] font-mono text-white/60 mt-1 block">Request ID: {requestId}</span>
        </div>
      )}

      {error && (
        <div className="p-4 border border-red-600/20 bg-red-600/5 text-[9px] font-black text-red-500 uppercase tracking-[0.2em] text-center">
          {error}
        </div>
      )}
    </form>
  );
};
