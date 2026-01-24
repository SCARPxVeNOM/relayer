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
    const [metrics, setMetrics] = useState<any>(null);
    const [relayers, setRelayers] = useState<any[]>([]);

    // GET /api/telemetry
    useEffect(() => {
        const fetchTelemetry = async () => {
            try {
                const data = await apiClient.getTelemetry();
                setTelemetry(data);
            } catch (error) {
                console.error('Failed to fetch telemetry:', error);
                // Fallback values
                setTelemetry({
                    bridgeLink: 'DEGRADED',
                    encryptionEngine: 'UNLOCKED',
                    networkOrientation: [1, 1, 1, 1, 1, 1, 0, 0, 0],
                    zkSystemStatus: 'UNKNOWN',
                });
            }
        };

        fetchTelemetry();
        const interval = setInterval(fetchTelemetry, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    // GET /api/metrics
    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await apiClient.getMetrics();
                setMetrics(data);
            } catch (error) {
                console.error('Failed to fetch metrics:', error);
            }
        };

        fetchMetrics();
        const interval = setInterval(fetchMetrics, 15000); // Refresh every 15s
        return () => clearInterval(interval);
    }, []);

    // GET /api/relayers
    useEffect(() => {
        const fetchRelayers = async () => {
            try {
                const data = await apiClient.getRelayers();
                setRelayers(data);
            } catch (error) {
                console.error('Failed to fetch relayers:', error);
            }
        };

        fetchRelayers();
        const interval = setInterval(fetchRelayers, 20000); // Refresh every 20s
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
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-primary/30 bg-primary/5">
                        <Target className="w-4 h-4 text-primary" />
                        <span className="hud-text text-primary text-[10px]">OPERATIONAL_DIRECTIVE_V.9</span>
                    </div>
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

                    {/* SECONDARY HUD PANEL */}
                    <div className="hidden lg:block">
                        <div className="border border-white/10 bg-black/60 p-12 shadow-3xl relative overflow-hidden group">
                            {/* Industrial HUD elements */}
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <span className="text-[60px] font-black italic">ZK-7</span>
                            </div>

                            <div className="space-y-10 relative z-10">
                                <div className="space-y-2">
                                    <h4 className="hud-text text-white/40">Network Orientation</h4>
                                    <div className="flex gap-1.5">
                                        {networkOrientation.map((v, i) => (
                                            <div key={i} className={`w-2 h-6 ${v ? 'bg-secondary' : 'bg-white/5'}`} />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="hud-text text-white/40">Operational Status</h4>
                                    <div className="p-6 border border-white/5 bg-white/[0.02] flex items-center justify-between">
                                        <span className="text-sm font-bold tracking-widest">BRIDGE_LINK</span>
                                        <span className={`font-mono text-xs ${telemetry?.bridgeLink === 'STABLE' ? 'text-green-500' : 'text-red-500'}`}>
                                            {telemetry?.bridgeLink || 'UNKNOWN'}
                                        </span>
                                    </div>
                                    <div className="p-6 border border-white/5 bg-white/[0.02] flex items-center justify-between">
                                        <span className="text-sm font-bold tracking-widest">ENCRYPTION_ENGINE</span>
                                        <span className={`font-mono text-xs ${telemetry?.encryptionEngine === 'LOCKED' ? 'text-green-500' : 'text-red-500'}`}>
                                            {telemetry?.encryptionEngine || 'UNKNOWN'}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-10">
                                    <Link href="/">
                                        <Button variant="mission" size="lg" className="w-full">
                                            Initialize Mission Control <ChevronRight className="w-4 h-4 ml-3" />
                                        </Button>
                                    </Link>
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
                    <span className="text-xs font-bold text-secondary font-mono">ORBITAL-7.BRAVO</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                    <span className="hud-text text-green-500">Telemetry Live</span>
                </div>
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
