"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen pt-24 px-4 md:px-8 pb-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <section className="space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold">
            Aleo Private Finance
          </p>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight leading-[0.95]">
            Swap. Pay. Invoice.
          </h1>
          <p className="text-sm md:text-base text-white/70 max-w-xl">
            Envelop is an Aleo-native private asset manager with token swaps,
            invoice payments, and easy onboarding via passkey + PIN (with OTP fallback).
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/protocol"
              className="bg-primary text-black px-6 py-3 text-sm font-black uppercase tracking-wider"
            >
              Launch App
            </Link>
            <Link
              href="/mission"
              className="border border-white/30 px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-white/10"
            >
              View System
            </Link>
          </div>
        </section>

        <section className="border border-white/10 bg-black/78 backdrop-blur-sm p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-black uppercase tracking-wide">What is private?</h2>
          <ul className="space-y-3 text-sm text-white/75">
            <li>Shielded wallet binding with encrypted key material</li>
            <li>Private swap requests and settlement receipts on Aleo</li>
            <li>Private invoice records and payment receipts</li>
            <li>Backend acts as blind relayer for transaction submission</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

