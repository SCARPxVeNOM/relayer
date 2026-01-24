import React from 'react';
import { cn } from '../../lib/utils';

interface LandingLayoutProps {
    children: React.ReactNode;
    className?: string; // Added className to props
}

export function LandingLayout({ children, className }: LandingLayoutProps) {
    return (
        <div className={cn("min-h-screen flex flex-col relative selection:bg-cyan-500/30", className)}>
            {/* Background Ambience */}
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" /> {/* Optional grid texture if available */}
            </div>

            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                            <span className="font-bold text-white">E</span>
                        </div>
                        <span className="font-bold text-lg tracking-tight">Envelop</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">How it works</a>
                        <a href="#service" className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all">Launch App</a>
                    </div>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-24 pb-12">
                {children}
            </main>

            <footer className="border-t border-white/5 py-12 text-center text-gray-500 text-sm">
                <p>© 2024 Envelop Privacy Protocol. Built on Aleo.</p>
            </footer>
        </div>
    );
}
