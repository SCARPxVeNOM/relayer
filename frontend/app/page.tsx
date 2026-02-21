"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const SWAP_WORD_VARIANTS = ["SWAP", "WAPS", "APSW", "PSWA"];
const SWAP_LETTERS = ["S", "W", "A", "P"];
const SWAP_ORDERS = [
  [0, 1, 2, 3],
  [1, 2, 3, 0],
  [2, 3, 0, 1],
  [3, 0, 1, 2],
];

export default function HomePage() {
  const [swapWordIndex, setSwapWordIndex] = useState(0);

  useEffect(() => {
    let intervalId: number | undefined;
    const firstSwapTimeout = window.setTimeout(() => {
      setSwapWordIndex((prev) => (prev + 1) % SWAP_WORD_VARIANTS.length);
      intervalId = window.setInterval(() => {
        setSwapWordIndex((prev) => (prev + 1) % SWAP_WORD_VARIANTS.length);
      }, 30000);
    }, 8000);

    return () => {
      window.clearTimeout(firstSwapTimeout);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="min-h-screen mt-16 px-4 md:px-8 pb-12 overflow-x-clip lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:pb-0 lg:overflow-hidden">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center lg:h-full">
        <section className="space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold">
            Dive In and Take Off !
          </p>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight leading-[0.95]">
            <span className="home-swap-word-live" aria-label={SWAP_WORD_VARIANTS[swapWordIndex]}>
              <span className="sr-only">{SWAP_WORD_VARIANTS[swapWordIndex]}</span>
              <span className="home-swap-letters" aria-hidden="true">
                {SWAP_LETTERS.map((letter, letterIndex) => {
                  const slot = SWAP_ORDERS[swapWordIndex].indexOf(letterIndex);
                  return (
                    <span
                      key={letter}
                      className="home-swap-letter"
                      style={{ transform: `translateX(${slot}em)` }}
                    >
                      {letter}
                    </span>
                  );
                })}
              </span>
            </span>
            . PAY. INVOICE.
          </h1>
          <p className="text-sm md:text-base text-white/70 max-w-xl">
            Envelop is an Aleo-native private asset manager with token swaps,
            invoice payments, and easy onboarding via passkey.
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

        <section className="relative flex items-center justify-center lg:justify-end">
          <div className="home-envelope-stage relative w-[280px] sm:w-[320px] md:w-[380px] lg:w-[430px] aspect-square lg:translate-x-8 xl:translate-x-12">
            <div className="home-envelope-aura" />
            <div className="home-envelope-ring" />
            <div className="home-envelope-card">
              <div className="home-envelope-media">
                <video
                  src="/card-fill.webm"
                  className="home-envelope-insert-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  aria-hidden="true"
                />
                <Image
                  src="/12.png"
                  alt="Envelope visual"
                  fill
                  priority
                  className="object-contain home-envelope-image"
                  sizes="(max-width: 640px) 280px, (max-width: 768px) 320px, (max-width: 1024px) 380px, 430px"
                />
              </div>
            </div>
            <div className="home-envelope-sheen" />
          </div>
        </section>
      </div>
    </div>
  );
}
