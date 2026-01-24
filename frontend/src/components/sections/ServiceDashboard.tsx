"use client";

import { useSessionStore } from '../../stores/session.store';
import { TransferForm } from '../TransferForm';
import { WalletButton } from '../WalletButton';
import { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Database, Zap } from 'lucide-react';

/**
 * COMMAND CORE - Service Dashboard
 * 
 * This is the ONLY page that can create execution intents.
 * 
 * Restrictions:
 * - NO MetaMask connection (frontend doesn't handle EVM)
 * - ONLY Aleo wallet for intent creation
 * - Disabled unless: aleoConnected AND controlSessionActive
 */
export function ServiceDashboard() {
    const {
        aleoConnected,
        aleoAddress,
        controlSessionActive,
        connectAleo,
        disconnectAleo,
    } = useSessionStore();

    const [leoError, setLeoError] = useState<string | null>(null);
    const [isConnectingLeo, setIsConnectingLeo] = useState(false);

    const handleConnectLeoWallet = async () => {
        setLeoError(null);
        setIsConnectingLeo(true);
        try {
            await connectAleo();
        } catch (error: any) {
            setLeoError(error.message || 'Leo Wallet Connection Failed');
        } finally {
            setIsConnectingLeo(false);
        }
    };

    const handleDisconnectLeo = async () => {
        try {
            await disconnectAleo();
        } catch (error: any) {
            console.error('Failed to disconnect:', error);
        }
    };

    // Check if Command Core is enabled
    // Must have: Aleo connected AND session active
    const isCommandCoreEnabled = aleoConnected && controlSessionActive;

    return (
        <div className="flex flex-col bg-black border border-white/5">
            {/* SpaceX Mission HUD Header */}
            <div className="bg-[#0a0a0a] border-b border-white/10 px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary shadow-[0_0_10px_rgba(255,77,0,0.8)]" />
                        <span className="hud-text text-white">Bridge Console // Primary</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex gap-2">
                        {[1, 1, 1, 1, 0].map((v, i) => (
                            <div key={i} className={`w-1.5 h-4 ${v ? 'bg-primary/60' : 'bg-white/5'}`} />
                        ))}
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Latency:</span>
                        <span className="text-[10px] font-mono font-bold text-secondary tracking-widest">0.024ms</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Sector:</span>
                        <span className="text-[10px] font-mono font-bold text-white tracking-widest">ORBITAL-7</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[700px]">
                {/* Hardware Ports - Connectivity Control */}
                <div className="lg:col-span-4 p-8 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#050505]">
                    <div className="flex items-center gap-3 mb-12 pb-4 border-b border-white/5">
                        <Activity className="w-4 h-4 text-secondary/60" />
                        <span className="hud-text text-white/60">Hardware Ports</span>
                    </div>

                    <div className="space-y-16">
                        {/* Privacy Tunnel - Leo (ONLY wallet connection allowed) */}
                        {/* NO MetaMask - Frontend doesn't handle EVM transactions */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">ZK Tunnel</span>
                                <div className="flex items-center gap-2 px-2 py-0.5 border border-secondary/20 bg-secondary/5">
                                    <div className="w-1 h-1 bg-secondary shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-secondary leading-none">Aleo</span>
                                </div>
                            </div>
                            <div className="p-0.5 border border-white/10 bg-black">
                                <WalletButton
                                    walletType="leo"
                                    connected={leoWallet.connected}
                                    address={leoWallet.address}
                                    onConnect={handleConnectLeoWallet}
                                    onDisconnect={disconnectLeoWallet}
                                    loading={isConnectingLeo}
                                    error={leoError}
                                />
                            </div>
                            {leoWallet.connected && (
                                <div className="flex justify-between items-center pt-2 px-1">
                                    <span className="text-[9px] text-white/30 uppercase font-black tracking-widest">Shielded</span>
                                    <span className="text-xs font-mono font-bold tracking-tighter text-secondary">{formatBalance(leoWallet.balance)} <span className="text-[9px] opacity-40">ALEO</span></span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-24 pt-8 border-t border-white/5">
                        <div className="flex items-start gap-4 p-5 border border-primary/20 bg-primary/5">
                            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                            <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-primary tracking-widest block">Circuit Active</span>
                                <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                                    Hardware-level zero-knowledge encryption engaged. All bridge telemetry is hidden from public observers.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mission Core - Operational Center */}
                <div className="lg:col-span-8 p-12 flex flex-col items-center justify-center bg-black relative">
                    {/* Grid line background overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-20"
                        style={{ backgroundImage: 'radial-gradient(circle at 12px 12px, rgba(255, 77, 0, 0.1) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 opacity-5">
                        <Database className="w-full h-full text-white scale-110" />
                    </div>

                    <div className="w-full max-w-md relative z-10">
                        <div className="text-center mb-16 space-y-3">
                            <div className="inline-flex items-center gap-3 px-3 py-1 border border-primary/30 bg-primary/5 mb-2">
                                <Zap className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary">Operational Gateway</span>
                            </div>
                            <h3 className="text-3xl font-black uppercase tracking-tighter italic text-white flex flex-col">
                                <span className="text-white/40 text-[14px] not-italic tracking-[0.2em] mb-1">Mission Control</span>
                                Initialize Bridge
                            </h3>
                        </div>

                        <div className="p-10 border border-white/10 bg-[#070707] shadow-3xl">
                            <TransferForm />
                        </div>

                        <div className="mt-12 flex justify-center items-center gap-12 grayscale opacity-30">
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-mono font-bold">STK_PRTCL</span>
                                <div className="w-8 h-0.5 bg-white/20" />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-mono font-bold">ZK_SHIELD</span>
                                <div className="w-8 h-0.5 bg-white/20" />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-mono font-bold">L2_GATEWAY</span>
                                <div className="w-8 h-0.5 bg-white/20" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
