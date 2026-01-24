"use client";

import { Zap, Shield, ChevronRight, Target, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/services/api.client";

/**
 * PAGE 2 — MISSION ("Our Mission")
 * 
 * Purpose: Read-only protocol telemetry and credibility display
 * 
 * Restrictions:
 * - READ-ONLY: No state mutations
 * - NO buttons that mutate state
 * - ONLY displays telemetry from backend APIs
 * - NO blockchain interactions
 */
export default function MissionPage() {
    const [telemetry, setTelemetry] = useState<{
        bridgeLink: 'STABLE' | 'DEGRADED';
        encryptionEngine: 'LOCKED' | 'UNLOCKED';
        networkOrientation: number[];
        zkSystemStatus: string;
    } | null>(null);
    const [version, setVersion] = useState<{ protocol: string; gateway: string } | null>(null);
    const [telemetryLive, setTelemetryLive] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    // Poll telemetry and version
    useEffect(() => {
        const fetchAll = async () => {
            try {
                setTelemetryLive(false);
                const [telemetryData, versionData] = await Promise.allSettled([
                    apiClient.getTelemetry(),
                    apiClient.getVersion().catch(() => ({ protocol: 'ZK-7', gateway: 'ORBITAL-7', build: 'v1.0.4-beta' }))
                ]);

                if (telemetryData.status === 'fulfilled') {
                    setTelemetry(telemetryData.value);
                    setTelemetryLive(true);
                    setLastUpdate(new Date());
                } else {
                    setTelemetry({
                        bridgeLink: 'DEGRADED',
                        encryptionEngine: 'UNLOCKED',
                        networkOrientation: [1, 1, 1, 1, 1, 1, 0, 0, 0],
                        zkSystemStatus: 'UNKNOWN',
                    });
                }

                if (versionData.status === 'fulfilled') {
                    setVersion(versionData.value);
                } else {
                    setVersion({ protocol: 'ZK-7', gateway: 'ORBITAL-7' });
                }
            } catch (error) {
                console.error('Failed to fetch mission data:', error);
                setTelemetry({
                    bridgeLink: 'DEGRADED',
                    encryptionEngine: 'UNLOCKED',
                    networkOrientation: [1, 1, 1, 1, 1, 1, 0, 0, 0],
                    zkSystemStatus: 'UNKNOWN',
                });
                setVersion({ protocol: 'ZK-7', gateway: 'ORBITAL-7' });
                setTelemetryLive(false);
            }
        };

        fetchAll();
        const interval = setInterval(fetchAll, 5000); // Refresh every 5s
        return () => clearInterval(interval);
    }, []);

    // Calculate network orientation from metrics
    const networkOrientation = telemetry?.networkOrientation || [1, 1, 1, 1, 1, 1, 0, 0, 0];

    return (
        <div className="relative min-h-screen font-mono antialiased text-white overflow-hidden ">

            {/* CINEMATIC BACKGROUND ASSET */}
            <div className="absolute inset-0 -z-10 bg-[#020202]">
                <img
                    src="/image1.png"
                    alt="Deep Space Mission"
                    className="w-full h-full object-cover opacity-40 scale-110 blur-[1px] brightness-50"
                    style={{ objectPosition: 'center 60%' }}
                />
                {/* Depth & Industrial Overlays */}
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
                <div className="absolute inset-0 bg-radial-at-c from-transparent to-black/90" />

                {/* HUD Scanline Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(rgba(255, 77, 0, 0.2) 1px, transparent 1px)', backgroundSize: '100% 3px' }} />
            </div>

            <div className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative z-10">

                {/* MISSION HEADER */}
                <div className="mb-20 space-y-4">
                    <button
                        onClick={() => {
                            // Show version info in console for demo
                            console.log('Version Info:', version);
                        }}
                        className="inline-flex items-center gap-3 px-4 py-1.5 border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 cursor-pointer group">
                        <Target className="w-4 h-4 text-primary animate-pulse" />
                        <span className="hud-text text-primary text-[10px] group-hover:tracking-[0.3em] transition-all">
                            OPERATIONAL_DIRECTIVE_V.{version?.protocol?.split('-')[1] || '5'}
                        </span>
                    </button>
                    <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
                        Our <span className="text-primary drop-shadow-[0_0_30px_rgba(255,77,0,0.5)]">Mission</span>
                    </h1>
                </div>

                {/* MISSION CONTENT GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">

                    {/* PRIMARY BRIEFING */}
                    <div className="space-y-12">
                        <div className="border-l border-white/10 pl-8 space-y-6">
                            <p className="text-xl md:text-2xl font-bold italic leading-relaxed text-white/80">
                                To establish the definitive sub-orbital transit layer for sensitive decentralized assets, ensuring absolute privacy through hardware-level Zero-Knowledge encryption.
                            </p>
                            <div className="h-px w-24 bg-primary/40" />
                        </div>

                        <div className="space-y-8">
                            <MissionPoint
                                icon={<Shield className="w-5 h-5" />}
                                title="Absolute Anonymity"
                                description="Our protocol ensures that every bridge transaction is shielded. External observers see only encrypted telemetry while your assets cross the sub-orbital void."
                            />
                            <MissionPoint
                                icon={<Zap className="w-5 h-5" />}
                                title="High-Precision Execution"
                                description="Speed is secondary only to security. We leverage Aleo's ZK-proof system to validate transfers with sub-millisecond latency on the core network."
                            />
                            <MissionPoint
                                icon={<Activity className="w-5 h-5" />}
                                title="Industrial Reliability"
                                description="System stability is our primary metric. We operate with a 99.99% uptime target for our ground control uplinks and relay hardware."
                            />
                        </div>
                    </div>

                    {/* PRE-FLIGHT STATUS PANEL */}
                    <div className="hidden lg:block">
                        <div className="border border-white/10 bg-black/60 shadow-3xl relative overflow-hidden">
                            {/* Industrial HUD Protocol Version */}
                            <button
                                onClick={() => console.log('Protocol Version:', version)}
                                className="absolute top-0 right-0 p-4 opacity-10 hover:opacity-20 transition-opacity cursor-pointer group/version">
                                <span className="text-[60px] font-black italic group-hover/version:text-primary transition-colors">{version?.protocol || 'ZK-7'}</span>
                            </button>

                            {/* SYSTEM READINESS HEADER */}
                            <div className="border-b border-white/10 px-8 py-5 bg-black/40">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Pre-Flight Status</h3>
                                        <p className="text-[9px] text-white/30 font-medium">Situational Awareness // Not Launch Console</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 border border-red-500/30 bg-red-500/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                                        <span className="text-[9px] font-black uppercase tracking-wider text-red-400">Not Safe to Execute</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-8 relative z-10">
                                {/* NETWORK ORIENTATION - Internal Alignment */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="hud-text text-white/60 text-[10px] mb-0.5">Network Orientation</h4>
                                            <p className="text-[8px] text-white/20 font-medium">Relayer pool readiness · Queue balance</p>
                                        </div>
                                        {lastUpdate && (<span className="text-[8px] text-white/20 font-mono">{lastUpdate.toLocaleTimeString()}</span>)}
                                    </div>
                                    <div className="flex gap-1.5">
                                        {networkOrientation.map((v, i) => (
                                            <div
                                                key={i}
                                                className={`w-2 h-6 transition-all duration-300 ${v
                                                        ? 'bg-secondary shadow-[0_0_8px_rgba(0,255,255,0.6)] hover:h-8 hover:shadow-[0_0_12px_rgba(0,255,255,0.8)]'
                                                        : 'bg-white/5 hover:bg-white/10'
                                                    }`}
                                                style={{
                                                    animationDelay: `${i * 100}ms`,
                                                    animation: v ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[8px] text-yellow-500/60 font-medium">⚠ Partial alignment detected</p>
                                </div>

                                {/* OPERATIONAL STATUS - Safety Checks */}
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="hud-text text-white/60 text-[10px] mb-0.5">Operational Status</h4>
                                        <p className="text-[8px] text-white/20 font-medium">Pre-flight safety checks</p>
                                    </div>

                                    {/* BRIDGE_LINK - Execution Path Health */}
                                    <button
                                        onClick={() => console.log('Bridge Link Status:', telemetry?.bridgeLink)}
                                        className={`w-full px-5 py-4 border transition-all duration-300 group cursor-pointer ${telemetry?.bridgeLink === 'STABLE'
                                                ? 'border-green-500/20 bg-green-500/5 hover:border-green-500/40'
                                                : 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
                                            }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold tracking-widest group-hover:text-primary transition-colors">BRIDGE_LINK</span>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${telemetry?.bridgeLink === 'STABLE'
                                                        ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                                                        : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse'
                                                    }`} />
                                                <span className={`font-mono text-xs font-bold ${telemetry?.bridgeLink === 'STABLE' ? 'text-green-500' : 'text-red-500'
                                                    }`}>
                                                    {telemetry?.bridgeLink || 'UNKNOWN'}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-[8px] text-white/30 text-left font-medium">
                                            {telemetry?.bridgeLink === 'STABLE'
                                                ? 'Execution path healthy'
                                                : 'Below safety threshold · RPC latency high or relayer backlog'}
                                        </p>
                                    </button>

                                    {/* ENCRYPTION_ENGINE - Privacy Protection */}
                                    <button
                                        onClick={() => console.log('Encryption Engine Status:', telemetry?.encryptionEngine)}
                                        className={`w-full px-5 py-4 border transition-all duration-300 group cursor-pointer ${telemetry?.encryptionEngine === 'LOCKED'
                                                ? 'border-green-500/20 bg-green-500/5 hover:border-green-500/40'
                                                : 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
                                            }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold tracking-widest group-hover:text-secondary transition-colors">ENCRYPTION_ENGINE</span>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${telemetry?.encryptionEngine === 'LOCKED'
                                                        ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                                                        : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse'
                                                    }`} />
                                                <span className={`font-mono text-xs font-bold ${telemetry?.encryptionEngine === 'LOCKED' ? 'text-green-500' : 'text-red-500'
                                                    }`}>
                                                    {telemetry?.encryptionEngine || 'UNKNOWN'}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-[8px] text-white/30 text-left font-medium">
                                            {telemetry?.encryptionEngine === 'LOCKED'
                                                ? 'Zero-knowledge privacy armed'
                                                : 'Aleo wallet not connected · View key not loaded'}
                                        </p>
                                    </button>
                                </div>

                                {/* INITIALIZE MISSION CONTROL - System Health Check */}
                                <div className="pt-6 border-t border-white/5">
                                    <Link href="/protocol">
                                        <Button
                                            variant="mission"
                                            size="lg"
                                            className="w-full group relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                            <span className="relative z-10">Initialize Mission Control</span>
                                            <ChevronRight className="w-4 h-4 ml-3 relative z-10 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Link>
                                    <p className="text-[8px] text-white/20 text-center mt-3 font-medium">
                                        Attempt to bring system into launch-capable state
                                    </p>
                                </div>
                            </div>

                            {/* Decorative tech grid */}
                            <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                        </div>
                    </div>
                </div>

            </div>

            {/* FOOTER UPLINK */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-black/80 backdrop-blur-md px-12 py-6 flex justify-between items-center z-50">
                <div className="flex items-center gap-6">
                    <span className="hud-text text-white/20">Sector Uplink:</span>
                    <span className="text-xs font-bold text-secondary font-mono hover:text-primary transition-colors cursor-pointer">
                        {version?.gateway || 'ORBITAL-7'}.BRAVO
                    </span>
                </div>
                <button
                    onClick={() => console.log('Telemetry Status:', { live: telemetryLive, lastUpdate })}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group">
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${telemetryLive
                        ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse'
                        : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]'
                        }`} />
                    <span className={`hud-text transition-colors ${telemetryLive ? 'text-green-500' : 'text-yellow-500'
                        }`}>
                        {telemetryLive ? 'Telemetry Live' : 'Connecting...'}
                    </span>
                </button>
            </div>

        </div>
    );
}

function MissionPoint({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex gap-6 group">
            <div className="w-12 h-12 border border-white/10 bg-white/5 flex items-center justify-center shrink-0 transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
                <div className="text-white/60 group-hover:text-primary transition-colors">
                    {icon}
                </div>
            </div>
            <div className="space-y-2 pt-1">
                <h4 className="text-lg font-black italic tracking-tight uppercase text-white group-hover:text-primary transition-colors">{title}</h4>
                <p className="text-xs leading-relaxed text-white/40 font-medium">
                    {description}
                </p>
            </div>
        </div>
    );
}
