"use client";

import React from 'react';
import { useSessionStore } from '@/stores/session.store';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, ArrowRight, ExternalLink } from 'lucide-react';

/**
 * Transfer Form - Command Core Intent Creation
 * 
 * This component creates execution intents directly via Leo Wallet.
 * User signs the transaction themselves - more secure than backend signing.
 * 
 * Form → Aleo Intent Mapping:
 * - Payload Volume → amount (private)
 * - Mission Gateway → chainId (private)
 * - Endpoint Identity → recipient (stored as note)
 * 
 * On submit: Leo Wallet signs and broadcasts directly to Aleo
 */

const ALEO_PROGRAM_ID = 'advance_privacy.aleo';
const FEE_MICROCREDITS = 100_000; // 0.1 credits fee

export const TransferForm: React.FC = () => {
  const { publicKey, connected, requestTransaction } = useWallet();
  const { controlSessionActive } = useSessionStore();
  const aleoConnected = connected && !!publicKey;

  const [form, setForm] = React.useState({
    amount: '',
    destinationChain: 'sepolia' as 'sepolia' | 'amoy',
    recipientAddress: '',
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [txId, setTxId] = React.useState<string | null>(null);

  // Form is disabled unless: Aleo connected AND session active
  const isFormDisabled = !aleoConnected || !controlSessionActive;

  const isSubmitEnabled = React.useMemo(() => {
    if (isFormDisabled || isSubmitting) return false;
    if (!form.amount || !form.recipientAddress) return false;
    if (!requestTransaction) return false;
    // Basic validation
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) return false;
    if (!form.recipientAddress.startsWith('0x') || form.recipientAddress.length !== 42) return false;
    return true;
  }, [isFormDisabled, isSubmitting, form, requestTransaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitEnabled || !publicKey || !requestTransaction) return;

    setIsSubmitting(true);
    setError(null);
    setTxId(null);

    try {
      // Convert amount to microcredits representation (for intent tracking)
      // Using 16 decimal places like Aleo credits: 0.01 ETH = 10000000000000000
      const amountFloat = parseFloat(form.amount);
      const amountInUnits = BigInt(Math.floor(amountFloat * 1e18));

      // Map chain selection to chainId: 1 = ETH (Sepolia), 2 = Polygon (Amoy)
      const chainId = form.destinationChain === 'sepolia' ? 1 : 2;

      // Build inputs for advance_privacy.aleo::create_intent
      // Function: create_intent(amount: u64, chain_id: u8, recipient: address)
      const inputs = [
        `${amountInUnits}u64`,        // amount in wei-like units
        `${chainId}u8`,               // 1=ETH, 2=Polygon
        publicKey.toString()          // Aleo address (the program stores EVM recipient differently)
      ];

      console.log('[TransferForm] Building transaction:', {
        program: ALEO_PROGRAM_ID,
        function: 'create_intent',
        inputs,
        fee: FEE_MICROCREDITS
      });

      // Create the Aleo transaction using the wallet adapter
      // feePrivate=false uses public credits for fee (no private record needed)
      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        ALEO_PROGRAM_ID,
        'create_intent',
        inputs,
        FEE_MICROCREDITS,
        false  // feePrivate = false to use PUBLIC credits for fee
      );

      console.log('[TransferForm] Requesting transaction signature from Leo Wallet...');

      // Request the transaction - Leo Wallet will prompt user to sign
      const transactionId = await requestTransaction(aleoTransaction);

      console.log('[TransferForm] Transaction submitted!', { transactionId });

      // HYBRID FLOW: Notify backend to trigger EVM execution
      // This sends the EVM recipient address so backend can send ETH
      console.log('[TransferForm] Registering intent with backend for EVM execution...');

      const registerResponse = await fetch(`${process.env.NEXT_PUBLIC_RELAYER_API_URL}/api/intent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txId: transactionId,
          chainId: chainId, // 1 or 2
          amount: form.amount,
          recipient: form.recipientAddress, // EVM address!
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}));
        console.warn('[TransferForm] Backend registration failed:', errorData);
        // Don't throw - Aleo tx succeeded, just log warning
      } else {
        const registerData = await registerResponse.json();
        console.log('[TransferForm] Backend registered intent:', registerData);
      }

      setTxId(transactionId);

      // Reset form after successful submission
      setForm({
        amount: '',
        destinationChain: 'sepolia',
        recipientAddress: '',
      });
    } catch (err) {
      console.error('[TransferForm] Transaction failed:', err);

      if (err instanceof Error) {
        if (err.message.includes('rejected') || err.message.includes('User rejected')) {
          setError('Transaction rejected by user');
        } else if (err.message.includes('Insufficient')) {
          setError('Insufficient Aleo credits for fee');
        } else {
          setError(err.message);
        }
      } else {
        setError('Transaction failed');
      }
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
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing via Leo Wallet...
            </div>
          ) : (
            <div className="flex items-center gap-3">
              Initialize Secure Tunnel
              <ArrowRight className="w-4 h-4" />
            </div>
          )}
        </Button>
      </div>

      {txId && (
        <div className="p-4 border border-primary/20 bg-primary/5 text-[9px] font-black text-primary uppercase tracking-[0.2em] text-center">
          🔐 Transaction Signed via Leo Wallet<br />
          <a
            href={`https://testnet.explorer.provable.com/transaction/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[8px] font-mono text-white/60 mt-1 flex items-center justify-center gap-1 hover:text-primary transition-colors"
          >
            TX: {txId.slice(0, 20)}...{txId.slice(-8)}
            <ExternalLink className="w-3 h-3" />
          </a>
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
