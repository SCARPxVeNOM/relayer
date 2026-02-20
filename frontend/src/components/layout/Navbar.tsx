"use client";

import { Shield, ChevronRight, Menu, X } from "lucide-react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletMultiButton } from "@demox-labs/aleo-wallet-adapter-reactui";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import gsap from 'gsap';

export function Header() {
    const { publicKey, connected } = useWallet();
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isConnected = connected;

    // Refs for animations
    const headerRef = useRef<HTMLElement>(null);
    const logoRef = useRef<HTMLAnchorElement>(null);
    const navRef = useRef<HTMLElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);

    // Initial load animation
    useEffect(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo(headerRef.current,
            { y: -80, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8 }
        )
            .fromTo(logoRef.current,
                { opacity: 0, x: -20 },
                { opacity: 1, x: 0, duration: 0.5 },
                '-=0.4'
            )
            .fromTo(navRef.current?.children || [],
                { opacity: 0, y: -10 },
                { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 },
                '-=0.2'
            )
            .fromTo(ctaRef.current,
                { opacity: 0, x: 20 },
                { opacity: 1, x: 0, duration: 0.5 },
                '-=0.3'
            );
    }, []);

    // Logo hover animation
    const handleLogoHover = (isEnter: boolean) => {
        gsap.to(logoRef.current, {
            scale: isEnter ? 1.02 : 1,
            duration: 0.3,
            ease: 'power2.out'
        });
    };

    return (
        <header
            ref={headerRef}
            className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-md"
        >
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                <div className="flex justify-between items-center h-16">
                    {/* Brand */}
                    <Link
                        ref={logoRef}
                        href="/"
                        className="flex items-center gap-3 group transition-all"
                        onMouseEnter={() => handleLogoHover(true)}
                        onMouseLeave={() => handleLogoHover(false)}
                    >
                        <img
                            src="/image 2.png"
                            alt="Logo"
                            className="h-12 md:h-14 w-auto border-[1px] border-white/5 bg-black/40 p-1 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-[0_0_20px_rgba(255,77,0,0.2)]"
                        />
                        <div className="flex flex-col -space-y-1">
                            <span className="text-[9px] md:text-[10px] font-bold tracking-[0.3em] md:tracking-[0.4em] uppercase text-white/40 group-hover:text-primary transition-colors duration-300">
                                Envelop
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <nav ref={navRef} className="hidden md:flex items-center gap-8 lg:gap-10">
                        <NavLink label="Home" href="/" />
                        <NavLink label="System" href="/mission" />
                        <NavLink label="App" href="/protocol" />
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-white/60 hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>

                    {/* Status/CTA */}
                    <div ref={ctaRef} className="hidden md:flex items-center gap-6">
                        {isConnected ? (
                            <div className="flex items-center gap-3 px-4 py-1.5 border border-white/5 bg-secondary/5 text-[10px] font-black uppercase tracking-[0.2em] group hover:border-green-500/30 transition-all duration-300">
                                <div className="w-1.5 h-1.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                                <span className="text-secondary group-hover:text-green-400 transition-colors">Uplink Stable</span>
                            </div>
                        ) : (
                            <div className="[&_.wallet-adapter-button]:!h-9 [&_.wallet-adapter-button]:!px-6 [&_.wallet-adapter-button]:!bg-transparent [&_.wallet-adapter-button]:!border [&_.wallet-adapter-button]:!border-primary/40 [&_.wallet-adapter-button]:!text-primary [&_.wallet-adapter-button:hover]:!bg-primary/5 [&_.wallet-adapter-button:hover]:!border-primary [&_.wallet-adapter-button]:!shadow-[0_0_20px_rgba(255,77,0,0.1)] [&_.wallet-adapter-button]:!text-[11px] [&_.wallet-adapter-button]:!font-black [&_.wallet-adapter-button]:!uppercase [&_.wallet-adapter-button]:!tracking-[0.2em] [&_.wallet-adapter-button]:!transition-all [&_.wallet-adapter-button]:!rounded-none [&_.wallet-adapter-button]:!flex [&_.wallet-adapter-button]:!items-center [&_.wallet-adapter-button]:!gap-2">
                                <WalletMultiButton>
                                    Connect Wallet <ChevronRight className="w-3.5 h-3.5 ml-2" />
                                </WalletMultiButton>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-white/5 bg-black/95 backdrop-blur-lg animate-slideDown">
                    <div className="px-4 py-4 space-y-4">
                        <MobileNavLink label="Home" href="/" onClick={() => setMobileMenuOpen(false)} />
                        <MobileNavLink label="System" href="/mission" onClick={() => setMobileMenuOpen(false)} />
                        <MobileNavLink label="App" href="/protocol" onClick={() => setMobileMenuOpen(false)} />
                        <div className="pt-4 border-t border-white/5">
                            {isConnected ? (
                                <div className="flex items-center gap-3 px-4 py-2 border border-white/5 bg-secondary/5 text-[10px] font-black uppercase tracking-[0.2em]">
                                    <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
                                    <span className="text-secondary">Uplink Stable</span>
                                </div>
                            ) : (
                                <WalletMultiButton className="w-full">
                                    Connect Port
                                </WalletMultiButton>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideDown {
                    animation: slideDown 0.3s ease-out;
                }
            `}</style>
        </header>
    );
}

function NavLink({ label, href }: { label: string; href: string }) {
    const linkRef = useRef<HTMLAnchorElement>(null);

    const handleHover = (isEnter: boolean) => {
        gsap.to(linkRef.current, {
            y: isEnter ? -2 : 0,
            color: isEnter ? '#ff4d00' : '',
            duration: 0.2,
            ease: 'power2.out'
        });
    };

    return (
        <Link
            ref={linkRef}
            href={href}
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors relative group"
            onMouseEnter={() => handleHover(true)}
            onMouseLeave={() => handleHover(false)}
        >
            {label}
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
        </Link>
    );
}

function MobileNavLink({ label, href, onClick }: { label: string; href: string; onClick: () => void }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="block text-sm font-bold uppercase tracking-widest text-white/60 hover:text-primary transition-colors py-2"
        >
            {label}
        </Link>
    );
}
