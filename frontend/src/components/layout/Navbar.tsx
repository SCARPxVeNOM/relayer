"use client";

import { Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/wallet.store";
import Link from "next/link";

export function Header() {
    const { metamask, leoWallet } = useWalletStore();
    const isConnected = metamask.connected || leoWallet.connected;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex justify-between items-center h-16">
                    {/* Brand */}
                    <Link href="/" className="flex items-center gap-3 group transition-opacity hover:opacity-100">
                        <img
                            src="/image 2.png"
                            alt="Logo"
                            className="h-14 w-auto border-[1px] border-white/5 bg-black/40 p-1"
                        />
                        <div className="flex flex-col -space-y-1">
                            <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-white/40 group-hover:text-green-500 transition-colors duration-300">Ground Control</span>
                        </div>
                    </Link>

                    {/* Nav */}
                    <nav className="hidden md:flex items-center gap-10">
                        <NavLink label="Mission" href="/mission" />
                        <NavLink label="Telemetry" href="#" />
                        <NavLink label="Protocol" href="/protocol" />
                    </nav>

                    {/* Status/CTA */}
                    <div className="flex items-center gap-6">
                        {isConnected ? (
                            <div className="flex items-center gap-3 px-4 py-1.5 border border-white/5 bg-secondary/5 text-[10px] font-black uppercase tracking-[0.2em]">
                                <div className="w-1.5 h-1.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                <span className="text-secondary">Uplink Stable</span>
                            </div>
                        ) : (
                            <Button variant="mission" size="sm" className="h-9 px-6">
                                Connect Port <ChevronRight className="w-3.5 h-3.5 ml-2" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

function NavLink({ label, href }: { label: string; href: string }) {
    return (
        <Link
            href={href}
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
        >
            {label}
        </Link>
    );
}
