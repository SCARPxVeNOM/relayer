"use client";

import React, { useRef, useEffect } from 'react';
import { useSessionStore } from '@/stores/session.store';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, ArrowRight, ExternalLink, Zap, Shield, Send } from 'lucide-react';
import gsap from 'gsap';

/**
 * Transfer Form - Command Core Intent Creation
 * Enhanced with GSAP animations for premium UX
 */

const ALEO_PROGRAM_ID = 'advance_privacy.aleo';
const FEE_MICROCREDITS = 100_000;

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

  // Refs for GSAP animations
  const formRef = useRef<HTMLFormElement>(null);
  const inputRefs = useRef<HTMLDivElement[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Form entrance animation
  useEffect(() => {
    if (!formRef.current) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(formRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6 }
    )
      .fromTo(inputRefs.current,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.1 },
        '-=0.3'
      )
      .fromTo(buttonRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.4 },
        '-=0.2'
      );
  }, []);

  // Success animation
  useEffect(() => {
    if (txId && successRef.current) {
      gsap.fromTo(successRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: 'back.out(1.7)'
        }
      );

      // Glow pulse
      gsap.to(successRef.current, {
        boxShadow: '0 0 30px rgba(255, 77, 0, 0.3)',
        duration: 0.8,
        repeat: 2,
        yoyo: true,
        ease: 'power1.inOut'
      });
    }
  }, [txId]);

  // Error shake animation
  useEffect(() => {
    if (error && errorRef.current) {
      gsap.fromTo(errorRef.current,
        { x: -10 },
        { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }
      );
    }
  }, [error]);

  // Form is disabled only if Aleo wallet not connected
  // Session init is optional - form can be filled, but submission requires session
  const isFormDisabled = !aleoConnected;

  const isSubmitEnabled = React.useMemo(() => {
    if (isFormDisabled || isSubmitting) return false;
    if (!form.amount || !form.recipientAddress) return false;
    if (!requestTransaction) return false;
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) return false;
    if (!form.recipientAddress.startsWith('0x') || form.recipientAddress.length !== 42) return false;
    return true;
  }, [isFormDisabled, isSubmitting, form, requestTransaction]);

  // Input focus animation
  const handleInputFocus = (element: HTMLDivElement | null) => {
    if (!element) return;
    gsap.to(element, {
      borderColor: 'rgba(255, 77, 0, 0.5)',
      boxShadow: '0 0 20px rgba(255, 77, 0, 0.1)',
      duration: 0.3
    });
  };

  const handleInputBlur = (element: HTMLDivElement | null) => {
    if (!element) return;
    gsap.to(element, {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      boxShadow: 'none',
      duration: 0.3
    });
  };

  // Button hover animation
  const handleButtonHover = (isEnter: boolean) => {
    if (!buttonRef.current || !isSubmitEnabled) return;
    gsap.to(buttonRef.current, {
      scale: isEnter ? 1.02 : 1,
      boxShadow: isEnter
        ? '0 10px 40px rgba(255, 77, 0, 0.3)'
        : '0 4px 20px rgba(255, 77, 0, 0.1)',
      duration: 0.3,
      ease: 'power2.out'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitEnabled || !publicKey || !requestTransaction) return;

    setIsSubmitting(true);
    setError(null);
    setTxId(null);

    // Button loading animation
    gsap.to(buttonRef.current, {
      scale: 0.98,
      duration: 0.2
    });

    try {
      const amountInUnits = Math.floor(parseFloat(form.amount) * 1e18);
      const chainId = form.destinationChain === 'sepolia' ? 1 : 2;

      const inputs = [
        `${amountInUnits}u64`,
        `${chainId}u8`,
        publicKey.toString()
      ];

      console.log('[TransferForm] Building transaction:', {
        program: ALEO_PROGRAM_ID,
        function: 'create_intent',
        inputs,
        fee: FEE_MICROCREDITS
      });

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta,
        ALEO_PROGRAM_ID,
        'create_intent',
        inputs,
        FEE_MICROCREDITS,
        false
      );

      console.log('[TransferForm] Requesting signature from Leo Wallet...');
      const transactionId = await requestTransaction(aleoTransaction);
      console.log('[TransferForm] Transaction submitted!', { transactionId });

      // Notify backend
      console.log('[TransferForm] Registering intent with backend...');
      const registerResponse = await fetch(`${process.env.NEXT_PUBLIC_RELAYER_API_URL}/api/intent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txId: transactionId,
          chainId: chainId,
          amount: form.amount,
          recipient: form.recipientAddress,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}));
        console.warn('[TransferForm] Backend registration failed:', errorData);
      } else {
        const registerData = await registerResponse.json();
        console.log('[TransferForm] Backend registered intent:', registerData);
      }

      setTxId(transactionId);

      // Success animation
      gsap.to(buttonRef.current, {
        scale: 1,
        backgroundColor: 'rgba(0, 255, 136, 0.2)',
        duration: 0.3,
        onComplete: () => {
          gsap.to(buttonRef.current, {
            backgroundColor: '',
            duration: 0.5,
            delay: 1
          });
        }
      });

      setForm({
        amount: '',
        destinationChain: 'sepolia',
        recipientAddress: '',
      });

    } catch (err) {
      console.error('[TransferForm] Transaction failed:', err);

      // Error shake
      gsap.to(buttonRef.current, { scale: 1, duration: 0.2 });
      gsap.fromTo(formRef.current,
        { x: -5 },
        { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }
      );

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

  const addInputRef = (el: HTMLDivElement | null, index: number) => {
    if (el) inputRefs.current[index] = el;
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-10">
      {isFormDisabled && (
        <div className="p-4 border border-white/5 bg-white/5 text-[9px] font-black uppercase tracking-[0.3em] text-white/40 text-center flex items-center justify-center gap-2">
          <Shield className="w-3 h-3" />
          Connect Aleo Wallet to Continue
        </div>
      )}

      <div className="space-y-8">
        {/* Amount Input */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-primary" />
            Payload Volume (ETH)
          </Label>
          <div
            ref={(el) => addInputRef(el, 0)}
            className="relative group p-0.5 border border-white/10 bg-black transition-all duration-300"
            onFocus={(e) => handleInputFocus(e.currentTarget)}
            onBlur={(e) => handleInputBlur(e.currentTarget)}
          >
            <Input
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              disabled={isFormDisabled}
              placeholder="0.00"
              className="h-14 border-0 bg-transparent text-3xl font-black italic tracking-tighter focus:ring-0"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 text-sm font-mono">ETH</div>
          </div>
        </div>

        {/* Chain Select */}
        <div className="space-y-3">
          <Label>Mission Gateway</Label>
          <div
            ref={(el) => addInputRef(el, 1)}
            className="p-0.5 border border-white/10 bg-black transition-all duration-300 hover:border-white/20"
          >
            <select
              value={form.destinationChain}
              onChange={(e) => setForm({ ...form, destinationChain: e.target.value as 'sepolia' | 'amoy' })}
              disabled={isFormDisabled}
              className="w-full h-11 bg-transparent border-0 px-4 text-[10px] font-black uppercase tracking-[0.3em] focus:outline-none focus:ring-0 appearance-none cursor-pointer text-white/80"
            >
              <option value="sepolia">⟠ Ethereal Sepolia</option>
              <option value="amoy">⬡ Polygon Amoy</option>
            </select>
          </div>
        </div>

        {/* Recipient Input */}
        <div className="space-y-3">
          <Label>Endpoint Identity</Label>
          <div
            ref={(el) => addInputRef(el, 2)}
            className="p-0.5 border border-white/10 bg-black transition-all duration-300"
            onFocus={(e) => handleInputFocus(e.currentTarget)}
            onBlur={(e) => handleInputBlur(e.currentTarget)}
          >
            <Input
              value={form.recipientAddress}
              onChange={(e) => setForm({ ...form, recipientAddress: e.target.value })}
              disabled={isFormDisabled}
              placeholder="0x..."
              className="h-11 border-0 bg-transparent text-[11px] font-mono tracking-widest focus:ring-0"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          ref={buttonRef}
          type="submit"
          disabled={!isSubmitEnabled}
          variant="default"
          className="w-full h-14 group relative overflow-hidden transition-all duration-300"
          onMouseEnter={() => handleButtonHover(true)}
          onMouseLeave={() => handleButtonHover(false)}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing via Leo Wallet...
            </div>
          ) : (
            <div className="flex items-center gap-3 relative z-10">
              <Send className="w-4 h-4" />
              Initialize Secure Tunnel
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </Button>
      </div>

      {/* Success Message */}
      {txId && (
        <div
          ref={successRef}
          className="p-4 border border-primary/30 bg-primary/10 text-[9px] font-black text-primary uppercase tracking-[0.2em] text-center relative overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-4 h-4" />
            Transaction Signed via Leo Wallet
          </div>
          <a
            href={`https://testnet.explorer.provable.com/transaction/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[8px] font-mono text-white/60 flex items-center justify-center gap-1 hover:text-primary transition-colors"
          >
            TX: {txId.slice(0, 20)}...{txId.slice(-8)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          ref={errorRef}
          className="p-4 border border-red-600/30 bg-red-600/10 text-[9px] font-black text-red-500 uppercase tracking-[0.2em] text-center"
        >
          ⚠ {error}
        </div>
      )}
    </form>
  );
};
