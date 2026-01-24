"use client";

import { Activity, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useSessionStore } from "@/stores/session.store";
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { apiClient } from "@/services/api.client";

/**
 * PAGE 1 — LANDING ("Envelope Protocol")
 * 
 * Purpose: System readiness + control identity
 * 
 * Restrictions:
 * - NO EVM transactions
 * - NO relayer wallet management
 * - ONLY Aleo wallet connection for intent creation
 * - Session initialization (backend API call only)
 */
export default function Home() {
  const { publicKey, connect, select, wallet, connected } = useWallet();
  const { initSession, controlSessionActive } = useSessionStore();
  const aleoConnected = connected && !!publicKey;
  const [systemReady, setSystemReady] = useState(false);
  const [uplinkStatus, setUplinkStatus] = useState<string>("Checking...");
  const [orbitLocked, setOrbitLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // On page load: GET /api/health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await apiClient.getHealth();
        setSystemReady(health.status === 'healthy');
        setUplinkStatus(`Secured_${(health.uptime * 1000).toFixed(2)}ms`);
        setOrbitLocked(true);
      } catch (error) {
        console.error('Health check failed:', error);
        setSystemReady(false);
        setUplinkStatus('Degraded');
        setOrbitLocked(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const handleConnectPort = async () => {
    if (aleoConnected) {
      // Already connected, do nothing or show disconnect option
      return;
    }

    setIsLoading(true);
    try {
      // First select the Leo wallet if not already selected
      if (!wallet) {
        select('Leo');
      }
      // Then connect
      await connect();
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeTunnel = async () => {
    if (!aleoConnected) {
      alert('Please connect Aleo wallet first');
      return;
    }

    setIsLoading(true);
    try {
      await initSession();
    } catch (error) {
      console.error('Failed to initialize session:', error);
      alert('Failed to initialize session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen selection:bg-primary selection:text-black font-mono antialiased text-white">

      <div className="flex flex-col pt-16">
        {/* Cinematic SpaceX Hero Section - Definitive Industrial Alignment */}
        <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/5 pb-20 md:pb-32 px-6">

          {/* BACKGROUND ASSET - High-Fidelity SpaceX Cityscape */}
          <div className="absolute inset-0 -z-10 bg-[#020202]">
            <img
              src="/IMAGE4.jpg"
              alt="Orbital View"
              className="w-full h-full object-cover opacity-50 scale-105 brightness-75"
              style={{ objectPosition: 'center 40%' }}
            />
            {/* Professional Depth Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
            <div className="absolute inset-0 bg-radial-at-c from-transparent to-black/90" />

            {/* Industrial HUD Scanline overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{ backgroundImage: 'linear-gradient(rgba(255, 77, 0, 0.1) 1px, transparent 1px)', backgroundSize: '100% 4px' }} />
          </div>

          <div className="max-w-7xl w-full mx-auto relative z-10 flex flex-col items-center">
            {/* HUD Status Bar - Precision Alignment */}
            <div className="mb-12 md:mb-20">
              <div className="flex items-center gap-12 border border-white/10 bg-black/40 px-8 py-3 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 ${systemReady ? 'bg-primary shadow-[0_0_10px_rgba(255,77,0,0.8)]' : 'bg-red-500'}`} />
                  <span className="hud-text text-white">{systemReady ? 'System Ready' : 'System Degraded'}</span>
                </div>
                <div className="h-5 w-px bg-white/10" />
                <div className="flex items-center gap-4">
                  <span className="hud-text text-white/40">Uplink:</span>
                  <span className="hud-text text-secondary">{uplinkStatus}</span>
                </div>
              </div>
            </div>

            {/* MAIN MISSION CONSOLE - Industrial Grid Stability */}
            <div className="w-full max-w-5xl">
              <div className="border border-white/10 p-12 md:p-24 lg:p-32 bg-black/60 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                {/* Decorative Sharp Tech Corners */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-primary/40" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-primary/40" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-primary/40" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-primary/40" />

                <div className="text-center relative z-10">
                  <h1 className="text-6xl sm:text-8xl md:text-9xl lg:text-[140px] font-black italic tracking-tighter mb-8 md:mb-12 leading-[0.75] text-white">
                    ENVELOPE<br />
                    <span className="text-primary tracking-[-0.05em] drop-shadow-[0_0_10px_rgba(255,77,0,0.4)]">PROTOCOL</span>
                  </h1>

                  <div className="max-w-2xl mx-auto space-y-12">
                    <p className="hud-text text-white/30 text-[11px] leading-loose border-t border-white/5 pt-12 px-6">
                      // Protocol Handshake Initialized <br className="hidden sm:block" />
                      Engaging sub-orbital Zero-Knowledge tunnel for high-fidelity professional transit.

                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-4">
                      <Button 
                        size="lg" 
                        className="w-full sm:w-auto h-16 min-w-[240px]"
                        onClick={handleInitializeTunnel}
                        disabled={!aleoConnected || isLoading || controlSessionActive}
                      >
                        {controlSessionActive ? 'Tunnel Active' : 'Initialize Tunnel'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className="w-full sm:w-auto h-16 min-w-[240px]"
                        onClick={() => window.location.href = '/mission'}
                      >
                        Telemetry Log
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 opacity-30">
            <span className="hud-text text-[9px] text-white/60">Scroll for terminal data</span>
            <div className="w-px h-24 bg-gradient-to-b from-primary to-transparent" />
          </div>
        </section>

      </div>

      {/* Persistence Telemetry HUD - Expert Overlay */}
      <div className="fixed bottom-12 right-12 z-50 hidden xl:block">
        <div className="border border-white/10 bg-black/90 px-8 py-5 flex items-center gap-12 shadow-3xl group transition-all duration-500 hover:border-primary/40">
          <div className="flex flex-col gap-2">
            <span className="hud-text text-[9px] text-white/20">Nav Status</span>
            <span className={`text-[14px] font-black uppercase tracking-[0.2em] group-hover:text-primary transition-colors ${orbitLocked ? 'text-secondary' : 'text-red-500'}`}>
              {orbitLocked ? 'Orbit Locked' : 'Orbit Unstable'}
            </span>
          </div>
          <div className="p-2 border border-secondary/20 bg-secondary/5 group-hover:border-primary/20 group-hover:bg-primary/5 transition-colors">
            <Globe className="w-10 h-10 text-secondary group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}
