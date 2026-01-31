"use client";

import { Gauge, Globe, Zap, Shield, Cpu } from "lucide-react";
import { ServiceDashboard } from "@/components/sections/ServiceDashboard";
import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/services/api.client";
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

/**
 * PAGE 3 — COMMAND CORE
 * 
 * Enhanced with GSAP animations for premium experience
 */
export default function ProtocolPage() {
    const [activeNode, setActiveNode] = useState<string>('ORBITAL_GATEWAY_7');

    // Refs for animations
    const headerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const dashboardRef = useRef<HTMLDivElement>(null);
    const telemetryRef = useRef<HTMLDivElement>(null);
    const iconRef = useRef<HTMLDivElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);

    // Page entrance animations
    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        // Header border slide in
        tl.fromTo(headerRef.current,
            { borderLeftColor: 'transparent', x: -30, opacity: 0 },
            { borderLeftColor: 'rgba(255, 77, 0, 0.4)', x: 0, opacity: 1, duration: 0.8 }
        )
            // Icon bounce in
            .fromTo(iconRef.current,
                { scale: 0, rotate: -180 },
                { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(1.7)' },
                '-=0.4'
            )
            // Title reveal
            .fromTo(titleRef.current,
                { opacity: 0, y: 40, filter: 'blur(10px)' },
                { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8 },
                '-=0.3'
            )
            // Dashboard slide up
            .fromTo(dashboardRef.current,
                { opacity: 0, y: 60, scale: 0.98 },
                { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power4.out' },
                '-=0.4'
            )
            // Node display
            .fromTo(nodeRef.current,
                { opacity: 0, x: 30 },
                { opacity: 1, x: 0, duration: 0.6 },
                '-=0.6'
            )
            // Telemetry footer
            .fromTo(telemetryRef.current,
                { opacity: 0, x: 50 },
                { opacity: 1, x: 0, duration: 0.8 },
                '-=0.3'
            );

        // Icon continuous pulse
        gsap.to(iconRef.current, {
            boxShadow: '0 0 30px rgba(255, 77, 0, 0.5)',
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut'
        });

        // Dashboard corner accents animation
        gsap.to('.corner-accent', {
            width: 12,
            height: 12,
            duration: 0.5,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
            stagger: 0.2
        });

    }, []);

    // Fetch active node from backend
    useEffect(() => {
        const fetchNode = async () => {
            try {
                const info = await apiClient.getRelayerInfo();
                setActiveNode(info.activeNode);

                // Animate node change
                gsap.fromTo(nodeRef.current,
                    { scale: 1.1, color: '#ff4d00' },
                    { scale: 1, color: '#00ff88', duration: 0.5 }
                );
            } catch (error) {
                console.error('Failed to fetch relayer info:', error);
            }
        };

        fetchNode();
        const interval = setInterval(fetchNode, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative min-h-screen font-mono antialiased text-white overflow-hidden">

            {/* CINEMATIC BACKGROUND */}
            <div className="absolute inset-0 -z-10 bg-[#020202]">
                <img
                    src="/image5.webp"
                    alt="Protocol Architecture"
                    className="w-full h-full object-cover opacity-50 scale-110 brightness-[0.7] transition-transform duration-[30s] hover:scale-105"
                    style={{ objectPosition: 'center 40%' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />

                {/* Animated grid overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,77,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,77,0,0.3) 1px, transparent 1px)',
                        backgroundSize: '100px 100px'
                    }}
                />

                {/* Floating orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 bg-primary/20 rounded-full animate-pulse"
                            style={{
                                left: `${10 + i * 10}%`,
                                top: `${20 + (i % 3) * 25}%`,
                                animationDelay: `${i * 0.3}s`,
                                animationDuration: `${3 + i * 0.5}s`
                            }}
                        />
                    ))}
                </div>
            </div>

            <main className="pt-28 md:pt-32 pb-32 md:pb-48 px-4 md:px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Page Header */}
                    <div
                        ref={headerRef}
                        className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8 md:gap-12 border-l-2 border-primary/40 pl-6 md:pl-12"
                    >
                        <div className="space-y-4 md:space-y-6">
                            <div className="flex items-center gap-4">
                                <div
                                    ref={iconRef}
                                    className="p-3 md:p-4 border border-primary/30 bg-primary/5 transition-all duration-300 hover:bg-primary/10 hover:border-primary/50"
                                >
                                    <Gauge className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                                </div>
                                <span className="hud-text text-primary text-[10px] md:text-[12px] uppercase tracking-[0.3em] md:tracking-[0.4em]">
                                    Mission Console // Protocol V1.0
                                </span>
                            </div>
                            <h1
                                ref={titleRef}
                                className="text-5xl md:text-7xl lg:text-9xl font-black uppercase tracking-tighter italic leading-none text-white"
                            >
                                Command <span className="text-primary italic drop-shadow-[0_0_20px_rgba(255,77,0,0.4)]">Core</span>
                            </h1>
                            <p className="hud-text text-white/40 text-[10px] md:text-[11px] max-w-xl leading-relaxed">
                                <span className="text-primary">//</span> Secure handshake with ALEO_NETWORK established. <br />
                                <span className="text-primary">//</span> Zero-knowledge tunnel protocols finalized for high-fidelity transit.
                            </p>
                        </div>

                        <div
                            ref={nodeRef}
                            className="flex flex-col items-start md:items-end gap-2 text-left md:text-right"
                        >
                            <span className="hud-text text-white/20 text-xs">Active Node:</span>
                            <span className="text-xl md:text-2xl font-black italic tracking-tighter text-secondary leading-none uppercase flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-primary animate-pulse" />
                                {activeNode}
                            </span>
                        </div>
                    </div>

                    {/* MAIN DASHBOARD INTERFACE */}
                    <div
                        ref={dashboardRef}
                        className="border border-white/10 bg-black/60 backdrop-blur-md shadow-4xl relative overflow-hidden group transition-all duration-500 hover:border-primary/20"
                    >
                        {/* Animated corner accents */}
                        <div className="corner-accent absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/50" />
                        <div className="corner-accent absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/50" />
                        <div className="corner-accent absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/50" />
                        <div className="corner-accent absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/50" />

                        {/* Decorative HUD Elements */}
                        <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                            <div className="flex gap-2">
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-1 bg-primary animate-pulse"
                                        style={{
                                            height: `${(i + 1) * 4}px`,
                                            animationDelay: `${i * 0.2}s`
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <ServiceDashboard />
                    </div>
                </div>
            </main>

            {/* Telemetry Footer Overlay */}
            <div
                ref={telemetryRef}
                className="fixed bottom-8 md:bottom-12 right-4 md:right-12 z-50 hidden lg:block"
            >
                <div className="border border-white/10 bg-black/90 px-6 md:px-8 py-4 md:py-5 flex items-center gap-8 md:gap-12 shadow-3xl group transition-all duration-500 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(255,77,0,0.2)]">
                    <div className="flex flex-col gap-2">
                        <span className="hud-text text-[9px] text-white/20">System Status</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[12px] md:text-[14px] font-black uppercase text-secondary tracking-[0.2em] group-hover:text-primary transition-colors">
                                Protocol Live
                            </span>
                        </div>
                    </div>
                    <div className="p-2 border border-secondary/20 bg-secondary/5 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-300 group-hover:rotate-12">
                        <Globe className="w-8 h-8 md:w-10 md:h-10 text-secondary group-hover:text-primary transition-colors" />
                    </div>
                </div>
            </div>
        </div>
    );
}
