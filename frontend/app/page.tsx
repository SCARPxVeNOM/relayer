"use client";

import { Activity, Globe, Zap, Shield, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { useSessionStore } from "@/stores/session.store";
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useWalletModal } from '@demox-labs/aleo-wallet-adapter-reactui';
import { apiClient } from "@/services/api.client";
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * PAGE 1 — LANDING ("Envelope Protocol")
 * 
 * Purpose: System readiness + control identity
 * Enhanced with GSAP animations for premium experience
 */
export default function Home() {
  const { publicKey, connect, select, wallet, wallets, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { initSession, controlSessionActive } = useSessionStore();
  const aleoConnected = connected && !!publicKey;
  const [systemReady, setSystemReady] = useState(false);
  const [uplinkStatus, setUplinkStatus] = useState<string>("Checking...");
  const [orbitLocked, setOrbitLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [heartbeatPulse, setHeartbeatPulse] = useState<'IDLE' | 'NORMAL' | 'FAST'>('IDLE');

  // Refs for GSAP animations
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const telemetryRef = useRef<HTMLDivElement>(null);

  // Initial page load animations
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Set initial states
    gsap.set([hudRef.current, titleRef.current, subtitleRef.current, buttonsRef.current, scrollIndicatorRef.current], {
      opacity: 0
    });

    // Console entrance
    tl.fromTo(consoleRef.current,
      { scale: 0.9, opacity: 0, y: 60 },
      { scale: 1, opacity: 1, y: 0, duration: 1.2, ease: 'power4.out' }
    )
      // HUD status bar
      .fromTo(hudRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.8 },
        '-=0.6'
      )
      // Title animation - letter by letter feel
      .fromTo(titleRef.current,
        { opacity: 0, y: 40, filter: 'blur(10px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power2.out' },
        '-=0.4'
      )
      // Subtitle fade
      .fromTo(subtitleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        '-=0.3'
      )
      // Buttons stagger
      .fromTo(buttonsRef.current?.children || [],
        { opacity: 0, y: 20, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.15 },
        '-=0.2'
      )
      // Scroll indicator
      .fromTo(scrollIndicatorRef.current,
        { opacity: 0 },
        { opacity: 0.3, duration: 0.8 },
        '-=0.3'
      );

    // telemetry HUD animation
    gsap.fromTo(telemetryRef.current,
      { x: 100, opacity: 0 },
      { x: 0, opacity: 1, duration: 1, delay: 1.5, ease: 'power3.out' }
    );

    // Continuous floating animation for scroll indicator
    gsap.to(scrollIndicatorRef.current, {
      y: 10,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut'
    });

    // Title glow pulse
    gsap.to('.title-glow', {
      textShadow: '0 0 30px rgba(255,77,0,0.6), 0 0 60px rgba(255,77,0,0.3)',
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut'
    });

  }, []);

  // Heartbeat pulse animation
  useEffect(() => {
    if (heartbeatPulse === 'FAST') {
      gsap.to('.pulse-bar', {
        scaleY: 1.5,
        duration: 0.3,
        stagger: { each: 0.1, repeat: -1, yoyo: true },
        ease: 'power2.inOut'
      });
    }
  }, [heartbeatPulse]);

  // On page load: GET /api/health and /api/latency
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [health, latency, heartbeat] = await Promise.allSettled([
          apiClient.getHealth(),
          apiClient.getLatency().catch(() => ({ value: 25, unit: 'ms', status: 'SECURED' })),
          apiClient.getHeartbeat().catch(() => ({ pulseRate: 'IDLE', activity: 0, timestamp: Date.now() }))
        ]);

        const healthData = health.status === 'fulfilled' ? health.value : null;
        const latencyData = latency.status === 'fulfilled' ? latency.value : { value: 25, unit: 'ms', status: 'SECURED' };
        const heartbeatData = heartbeat.status === 'fulfilled' ? heartbeat.value : { pulseRate: 'IDLE', activity: 0, timestamp: Date.now() };

        setSystemReady(healthData?.status === 'healthy');
        setUplinkStatus(`${latencyData.status}_${latencyData.value}${latencyData.unit}`);
        setHeartbeatPulse(heartbeatData.pulseRate as 'IDLE' | 'NORMAL' | 'FAST');
        setOrbitLocked(true);
      } catch (error) {
        console.error('Data fetch failed:', error);
        setSystemReady(false);
        setUplinkStatus('Degraded');
        setOrbitLocked(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectPort = async () => {
    if (aleoConnected) return;
    try {
      setVisible(true);
    } catch (error: any) {
      console.error('Failed to open wallet modal:', error);
      alert('Failed to open wallet selection. Please try again.');
    }
  };

  const handleInitializeTunnel = async () => {
    if (!aleoConnected) {
      alert('Please connect Aleo wallet first');
      return;
    }

    setIsLoading(true);

    // Button press animation
    if (buttonsRef.current?.children[0]) {
      gsap.to(buttonsRef.current.children[0], {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1
      });
    }

    try {
      await initSession();
      // Success animation
      gsap.to(consoleRef.current, {
        boxShadow: '0 0 60px rgba(0, 255, 136, 0.3)',
        duration: 0.5,
        yoyo: true,
        repeat: 1
      });
    } catch (error) {
      console.error('Failed to initialize session:', error);
      alert('Failed to initialize session');
    } finally {
      setIsLoading(false);
    }
  };

  // Hover animation for buttons
  const handleButtonHover = (e: React.MouseEvent, isEnter: boolean) => {
    gsap.to(e.currentTarget, {
      scale: isEnter ? 1.05 : 1,
      boxShadow: isEnter
        ? '0 10px 40px rgba(255, 77, 0, 0.3)'
        : '0 4px 20px rgba(255, 77, 0, 0.1)',
      duration: 0.3,
      ease: 'power2.out'
    });
  };

  return (
    <div className="relative min-h-screen selection:bg-primary selection:text-black font-mono antialiased text-white overflow-hidden">

      <div className="flex flex-col pt-16">
        {/* Cinematic SpaceX Hero Section */}
        <section
          ref={heroRef}
          className="relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/5 pb-20 md:pb-32 px-6"
        >

          {/* BACKGROUND ASSET */}
          <div className="absolute inset-0 -z-10 bg-[#020202]">
            <img
              src="/IMAGE4.jpg"
              alt="Orbital View"
              className="w-full h-full object-cover opacity-50 scale-105 brightness-75 transition-transform duration-[20s]"
              style={{ objectPosition: 'center 40%' }}
            />
            {/* Animated gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
            <div className="absolute inset-0 bg-radial-at-c from-transparent to-black/90" />

            {/* Animated scanlines */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none animate-scanline"
              style={{
                backgroundImage: 'linear-gradient(rgba(255, 77, 0, 0.15) 1px, transparent 1px)',
                backgroundSize: '100% 3px'
              }}
            />

            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${5 + Math.random() * 10}s`
                  }}
                />
              ))}
            </div>
          </div>

          <div className="max-w-7xl w-full mx-auto relative z-10 flex flex-col items-center">
            {/* HUD Status Bar */}
            <div ref={hudRef} className="mb-12 md:mb-20">
              <div className="flex items-center gap-6 md:gap-12 border border-white/10 bg-black/40 px-4 md:px-8 py-3 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 ${systemReady ? 'bg-primary shadow-[0_0_10px_rgba(255,77,0,0.8)] animate-pulse' : 'bg-red-500'}`} />
                  <span className="hud-text text-white text-xs md:text-sm">{systemReady ? 'System Ready' : 'System Degraded'}</span>
                </div>
                <div className="h-5 w-px bg-white/10" />
                <div className="flex items-center gap-2 md:gap-4">
                  <span className="hud-text text-white/40 text-xs">Uplink:</span>
                  <span className="hud-text text-secondary text-xs md:text-sm">{uplinkStatus}</span>
                </div>
                {/* Heartbeat Pulse Bars */}
                <div className="h-5 w-px bg-white/10 hidden md:block" />
                <div className="hidden md:flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`pulse-bar h-3 w-6 transition-all duration-300 origin-bottom ${heartbeatPulse === 'FAST'
                        ? 'bg-primary'
                        : heartbeatPulse === 'NORMAL'
                          ? 'bg-primary/60'
                          : 'bg-white/10'
                        }`}
                      style={{ height: `${(i + 1) * 4}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* MAIN MISSION CONSOLE */}
            <div className="w-full max-w-5xl">
              <div
                ref={consoleRef}
                className="border border-white/10 p-8 md:p-16 lg:p-24 bg-black/60 backdrop-blur-md shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-primary/30"
              >
                {/* Animated Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/40 transition-all duration-500 group-hover:w-12 group-hover:h-12 group-hover:border-primary" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/40 transition-all duration-500 group-hover:w-12 group-hover:h-12 group-hover:border-primary" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/40 transition-all duration-500 group-hover:w-12 group-hover:h-12 group-hover:border-primary" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/40 transition-all duration-500 group-hover:w-12 group-hover:h-12 group-hover:border-primary" />

                {/* Background grid pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(255,77,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,77,0,0.5) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                  }}
                />

                <div className="text-center relative z-10">
                  <h1
                    ref={titleRef}
                    className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black italic tracking-tighter mb-6 md:mb-10 leading-[0.85] text-white"
                  >
                    ENVELOPE<br />
                    <span className="title-glow text-primary tracking-[-0.05em] drop-shadow-[0_0_20px_rgba(255,77,0,0.5)]">
                      PROTOCOL
                    </span>
                  </h1>

                  <div className="max-w-2xl mx-auto space-y-8 md:space-y-12">
                    <p
                      ref={subtitleRef}
                      className="hud-text text-white/40 text-[10px] md:text-xs leading-loose border-t border-white/5 pt-8 md:pt-12 px-4 md:px-6"
                    >
                      <span className="text-primary">//</span> Protocol Handshake Initialized <br className="hidden sm:block" />
                      Engaging sub-orbital Zero-Knowledge tunnel for high-fidelity private transit.
                    </p>

                    <div
                      ref={buttonsRef}
                      className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center pt-4"
                    >
                      <Button
                        size="lg"
                        className="w-full sm:w-auto h-14 md:h-16 min-w-[200px] md:min-w-[240px] relative overflow-hidden group/btn"
                        onClick={handleInitializeTunnel}
                        disabled={!aleoConnected || isLoading || controlSessionActive}
                        onMouseEnter={(e) => handleButtonHover(e, true)}
                        onMouseLeave={(e) => handleButtonHover(e, false)}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          {controlSessionActive ? 'Tunnel Active' : isLoading ? 'Initializing...' : 'Initialize Tunnel'}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto h-14 md:h-16 min-w-[200px] md:min-w-[240px] group/btn"
                        onClick={() => window.location.href = '/mission'}
                        onMouseEnter={(e) => handleButtonHover(e, true)}
                        onMouseLeave={(e) => handleButtonHover(e, false)}
                      >
                        <Activity className="w-4 h-4 mr-2 group-hover/btn:animate-pulse" />
                        Telemetry Log
                      </Button>
                    </div>

                    {/* Connection status indicator */}
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${aleoConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-white/40">
                        {aleoConnected ? `Connected: ${publicKey?.slice(0, 8)}...${publicKey?.slice(-6)}` : 'Wallet not connected'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div
            ref={scrollIndicatorRef}
            className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 cursor-pointer"
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          >
            <span className="hud-text text-[9px] text-white/60">Scroll for terminal data</span>
            <ArrowDown className="w-4 h-4 text-primary/60" />
            <div className="w-px h-16 md:h-24 bg-gradient-to-b from-primary to-transparent" />
          </div>
        </section>

      </div>

      {/* Persistence Telemetry HUD */}
      <div
        ref={telemetryRef}
        className="fixed bottom-8 md:bottom-12 right-4 md:right-12 z-50 hidden lg:block"
      >
        <div className="border border-white/10 bg-black/90 px-6 md:px-8 py-4 md:py-5 flex items-center gap-8 md:gap-12 shadow-3xl group transition-all duration-500 hover:border-primary/40 hover:bg-black/95">
          <div className="flex flex-col gap-2">
            <span className="hud-text text-[9px] text-white/20">Nav Status</span>
            <span className={`text-[12px] md:text-[14px] font-black uppercase tracking-[0.2em] group-hover:text-primary transition-colors ${orbitLocked ? 'text-secondary' : 'text-red-500'}`}>
              {orbitLocked ? 'Orbit Locked' : 'Orbit Unstable'}
            </span>
          </div>
          <div className="p-2 border border-secondary/20 bg-secondary/5 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-300 group-hover:rotate-12">
            <Globe className="w-8 h-8 md:w-10 md:h-10 text-secondary group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
        }
        
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
