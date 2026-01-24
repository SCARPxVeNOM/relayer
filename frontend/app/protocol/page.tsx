"use client";

import { Gauge, Globe } from "lucide-react";
import { ServiceDashboard } from "@/components/sections/ServiceDashboard";
import { useEffect, useState } from "react";
import { apiClient } from "@/services/api.client";

/**
 * PAGE 3 — COMMAND CORE
 * 
 * Purpose: The ONLY page allowed to create execution intent
 * 
 * Restrictions:
 * - ONLY creates Aleo intents (POST /api/intent)
 * - NEVER sends EVM transactions
 * - NEVER manages relayer wallets
 * - Disabled unless: Aleo wallet connected AND session initialized
 */
export default function ProtocolPage() {
    const [activeNode, setActiveNode] = useState<string>('ORBITAL_GATEWAY_7');

    // Fetch active node from backend
    useEffect(() => {
        const fetchNode = async () => {
            try {
                const info = await apiClient.getRelayerInfo();
                setActiveNode(info.activeNode);
            } catch (error) {
                console.error('Failed to fetch relayer info:', error);
                // Keep default value
            }
        };

        fetchNode();
        const interval = setInterval(fetchNode, 10000); // Update every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative min-h-screen font-mono antialiased text-white overflow-hidden">

            {/* CINEMATIC BACKGROUND */}
            <div className="absolute inset-0 -z-10 bg-[#020202]">
                <img
                    src="/image5.webp"
                    alt="Protocol Architecture"
                    className="w-full h-full object-cover opacity-50 scale-110 brightness-[0.7]"
                    style={{ objectPosition: 'center 40%' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
            </div>

            <main className="pt-32 pb-48 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Page Header - Industrial Precision */}
                    <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-12 border-l border-primary/40 pl-12">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 border border-primary/30 bg-primary/5">
                                    <Gauge className="w-8 h-8 text-primary" />
                                </div>
                                <span className="hud-text text-primary text-[12px] uppercase tracking-[0.4em]">Mission Console // Protocol V1.0</span>
                            </div>
                            <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter italic leading-none text-white">
                                Command <span className="text-primary italic">Core</span>
                            </h1>
                            <p className="hud-text text-white/40 text-[11px] max-w-xl leading-relaxed">
                                // Secure handshake with ALEO_NETWORK established. <br />
                                // Zero-knowledge tunnel protocols finalized for high-fidelity transit.
                            </p>
                        </div>

                        <div className="hidden lg:flex flex-col items-end gap-2 text-right">
                            <span className="hud-text text-white/20">Active Node:</span>
                            <span className="text-2xl font-black italic tracking-tighter text-secondary leading-none uppercase">{activeNode}</span>
                        </div>
                    </div>

                    {/* MAIN DASHBOARD INTERFACE */}
                    <div className="border border-white/10 bg-black/60 backdrop-blur-md shadow-4xl relative overflow-hidden">
                        {/* Decorative HUD Elements */}
                        <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                            <div className="flex gap-2">
                                <div className="w-1 h-3 bg-primary" />
                                <div className="w-1 h-3 bg-primary" />
                                <div className="w-1 h-3 bg-primary" />
                            </div>
                        </div>

                        <ServiceDashboard />
                    </div>
                </div>
            </main>

            {/* Telemetry Footer Overlay */}
            <div className="fixed bottom-12 right-12 z-50 hidden xl:block">
                <div className="border border-white/10 bg-black/90 px-8 py-5 flex items-center gap-12 shadow-3xl">
                    <div className="flex flex-col gap-2">
                        <span className="hud-text text-[9px] text-white/20">System Status</span>
                        <span className="text-[14px] font-black uppercase text-secondary tracking-[0.2em]">Protocol Live</span>
                    </div>
                    <div className="p-2 border border-secondary/20 bg-secondary/5">
                        <Globe className="w-10 h-10 text-secondary" />
                    </div>
                </div>
            </div>
        </div>
    );
}
