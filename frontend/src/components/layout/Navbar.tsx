"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useWalletModal } from "@demox-labs/aleo-wallet-adapter-reactui";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Mission", href: "/mission" },
  { label: "Protocol", href: "/protocol" },
];

export function Header() {
  const pathname = usePathname();
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [mobileOpen, setMobileOpen] = useState(false);

  const openWalletModal = () => setVisible(true);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/image 2.png" alt="Envelop" className="h-10 w-auto border border-white/10" />
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Envelop</p>
              <p className="text-xs text-white/80">Aleo Private Finance</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-xs uppercase tracking-wider border ${
                    active
                      ? "border-primary/70 bg-primary/10 text-primary"
                      : "border-transparent text-white/75 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {connected ? (
              <div className="px-3 py-2 text-[11px] border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                Wallet Connected
              </div>
            ) : (
              <button
                type="button"
                onClick={openWalletModal}
                className="px-4 py-2 text-xs uppercase tracking-wider border border-primary/60 text-primary hover:bg-primary/10"
              >
                Connect Wallet
              </button>
            )}
          </div>

          <button
            className="md:hidden p-2 text-white/75 hover:text-white"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-black">
          <div className="px-4 py-4 space-y-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm border border-white/10 text-white/80"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openWalletModal();
              }}
              className="w-full px-3 py-2 text-sm border border-primary/60 text-primary"
            >
              {connected ? "Wallet Connected" : "Connect Wallet"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
