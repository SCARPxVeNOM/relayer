"use client";

import { useSessionStore } from '../../stores/session.store';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { TransferForm } from '../TransferForm';
import { Activity, ShieldCheck, Database, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '@/services/api.client';

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
    const { publicKey, connected, wallet, connecting } = useWallet();
    const { controlSessionActive } = useSessionStore();
    const [relayerInfo, setRelayerInfo] = useState<{ activeNode: string; region: string } | null>(null);
    const [latency, setLatency] = useState<string>('0ms');
    const [systemHealth, setSystemHealth] = useState<number[]>([1, 1, 1, 1, 0]); // Status bars

    // Check if Command Core is enabled
    // Must have: Aleo connected AND session active
    const aleoConnected = connected && !!publicKey;
    const aleoAddress = publicKey?.toString() || null;
    const isCommandCoreEnabled = aleoConnected && controlSessionActive;

    // Fetch active node info, latency, and system health
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [info, lat, health] = await Promise.allSettled([
                    apiClient.getRelayerInfo(),
                    apiClient.getLatency('control'),
                    apiClient.getHealth()
                ]);

                if (info.status === 'fulfilled') {
                    setRelayerInfo(info.value);
                }

                if (lat.status === 'fulfilled') {
                    setLatency(`${lat.value.value}${lat.value.unit}`);
                }

                // Calculate status bars based on health
                // 5 bars: 4 = healthy, 3 = degraded, 2 = warning, 1 = critical, 0 = offline
                if (health.status === 'fulfilled' && health.value.status === 'healthy') {
                    setSystemHealth([1, 1, 1, 1, 0]); // 4 bars = healthy
                } else if (health.status === 'fulfilled' && health.value.status === 'degraded') {
                    setSystemHealth([1, 1, 1, 0, 0]); // 3 bars = degraded
                } else {
                    setSystemHealth([1, 1, 0, 0, 0]); // 2 bars = warning
                }
            } catch (error) {
                console.error('Dashboard data fetch failed:', error);
                setSystemHealth([1, 0, 0, 0, 0]); // 1 bar = critical
            }
        };

        if (controlSessionActive) {
            fetchData();
            const interval = setInterval(fetchData, 5000);
            return () => clearInterval(interval);
        }
    }, [controlSessionActive]);

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
                        {systemHealth.map((v, i) => (
                            <div key={i} className={`w-1.5 h-4 transition-all duration-300 ${v ? 'bg-primary/60' : 'bg-white/5'}`} />
                        ))}
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Latency:</span>
                        <span className="text-[10px] font-mono font-bold text-secondary tracking-widest">{latency}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Sector:</span>
                        <span className="text-[10px] font-mono font-bold text-white tracking-widest">{relayerInfo?.activeNode || 'ORBITAL-7'}</span>
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
                                {/* Use WalletMultiButton which handles connection automatically */}
                                <div className="[&_.wallet-adapter-button]:w-full [&_.wallet-adapter-button]:h-10 [&_.wallet-adapter-button]:px-4 [&_.wallet-adapter-button]:justify-between [&_.wallet-adapter-button]:bg-transparent [&_.wallet-adapter-button]:border-0 [&_.wallet-adapter-button]:text-white/40 [&_.wallet-adapter-button:hover]:text-white [&_.wallet-adapter-button:hover]:bg-white/5 [&_.wallet-adapter-button]:text-[9px] [&_.wallet-adapter-button]:font-black [&_.wallet-adapter-button]:uppercase [&_.wallet-adapter-button]:tracking-widest">
                                    <WalletMultiButton />
                                </div>
                            </div>
                            {aleoConnected && aleoAddress && (
                                <div className="flex justify-between items-center pt-2 px-1">
                                    <span className="text-[9px] text-white/30 uppercase font-black tracking-widest">Shielded</span>
                                    <span className="text-xs font-mono font-bold tracking-tighter text-secondary">
                                        <span className="text-[9px] opacity-40">ALEO</span>
                                    </span>
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
