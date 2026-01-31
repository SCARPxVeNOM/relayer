'use client';

import { useRef, useEffect, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

/**
 * Fade in animation hook
 */
export function useFadeIn<T extends HTMLElement>(
    options: {
        duration?: number;
        delay?: number;
        y?: number;
        x?: number;
        scale?: number;
        ease?: string;
    } = {}
): RefObject<T> {
    const ref = useRef<T>(null);
    const {
        duration = 0.8,
        delay = 0,
        y = 30,
        x = 0,
        scale = 1,
        ease = 'power3.out'
    } = options;

    useEffect(() => {
        if (!ref.current) return;

        gsap.fromTo(
            ref.current,
            { opacity: 0, y, x, scale: scale === 1 ? 1 : 0.9 },
            { opacity: 1, y: 0, x: 0, scale: 1, duration, delay, ease }
        );
    }, [duration, delay, y, x, scale, ease]);

    return ref as RefObject<T>;
}

/**
 * Stagger children animation hook
 */
export function useStaggerChildren<T extends HTMLElement>(
    options: {
        stagger?: number;
        duration?: number;
        delay?: number;
        y?: number;
        ease?: string;
    } = {}
): RefObject<T> {
    const ref = useRef<T>(null);
    const {
        stagger = 0.1,
        duration = 0.6,
        delay = 0.2,
        y = 20,
        ease = 'power2.out'
    } = options;

    useEffect(() => {
        if (!ref.current) return;

        const children = ref.current.children;
        if (children.length === 0) return;

        gsap.fromTo(
            children,
            { opacity: 0, y },
            { opacity: 1, y: 0, duration, delay, stagger, ease }
        );
    }, [stagger, duration, delay, y, ease]);

    return ref as RefObject<T>;
}

/**
 * Scale on hover animation
 */
export function useHoverScale<T extends HTMLElement>(
    scale: number = 1.05
): RefObject<T> {
    const ref = useRef<T>(null);

    useEffect(() => {
        if (!ref.current) return;
        const element = ref.current;

        const onEnter = () => {
            gsap.to(element, { scale, duration: 0.3, ease: 'power2.out' });
        };

        const onLeave = () => {
            gsap.to(element, { scale: 1, duration: 0.3, ease: 'power2.out' });
        };

        element.addEventListener('mouseenter', onEnter);
        element.addEventListener('mouseleave', onLeave);

        return () => {
            element.removeEventListener('mouseenter', onEnter);
            element.removeEventListener('mouseleave', onLeave);
        };
    }, [scale]);

    return ref as RefObject<T>;
}

/**
 * Scroll-triggered animation hook
 */
export function useScrollReveal<T extends HTMLElement>(
    options: {
        y?: number;
        duration?: number;
        start?: string;
        ease?: string;
    } = {}
): RefObject<T> {
    const ref = useRef<T>(null);
    const {
        y = 50,
        duration = 0.8,
        start = 'top 80%',
        ease = 'power3.out'
    } = options;

    useEffect(() => {
        if (!ref.current) return;

        gsap.fromTo(
            ref.current,
            { opacity: 0, y },
            {
                opacity: 1,
                y: 0,
                duration,
                ease,
                scrollTrigger: {
                    trigger: ref.current,
                    start,
                    toggleActions: 'play none none none'
                }
            }
        );
    }, [y, duration, start, ease]);

    return ref as RefObject<T>;
}

/**
 * Glow pulse animation for elements
 */
export function useGlowPulse<T extends HTMLElement>(
    color: string = 'rgba(0, 255, 136, 0.5)'
): RefObject<T> {
    const ref = useRef<T>(null);

    useEffect(() => {
        if (!ref.current) return;

        gsap.to(ref.current, {
            boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
            repeat: -1,
            yoyo: true,
            duration: 1.5,
            ease: 'power1.inOut'
        });
    }, [color]);

    return ref as RefObject<T>;
}

/**
 * Typewriter effect hook
 */
export function useTypewriter(
    text: string,
    options: { speed?: number; delay?: number } = {}
): { displayText: string; isComplete: boolean } {
    const { speed = 50, delay = 0 } = options;
    const [displayText, setDisplayText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        setDisplayText('');
        setIsComplete(false);

        const timeout = setTimeout(() => {
            let index = 0;
            const interval = setInterval(() => {
                if (index < text.length) {
                    setDisplayText(text.slice(0, index + 1));
                    index++;
                } else {
                    clearInterval(interval);
                    setIsComplete(true);
                }
            }, speed);

            return () => clearInterval(interval);
        }, delay);

        return () => clearTimeout(timeout);
    }, [text, speed, delay]);

    return { displayText, isComplete };
}

// Need to import useState for typewriter
import { useState } from 'react';

/**
 * Counter animation hook
 */
export function useCountUp(
    endValue: number,
    options: { duration?: number; delay?: number } = {}
): number {
    const { duration = 2, delay = 0 } = options;
    const [value, setValue] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const obj = { value: 0 };
            gsap.to(obj, {
                value: endValue,
                duration,
                ease: 'power2.out',
                onUpdate: () => setValue(Math.round(obj.value))
            });
        }, delay * 1000);

        return () => clearTimeout(timeout);
    }, [endValue, duration, delay]);

    return value;
}

/**
 * Magnetic cursor effect
 */
export function useMagneticEffect<T extends HTMLElement>(
    strength: number = 0.3
): RefObject<T> {
    const ref = useRef<T>(null);

    useEffect(() => {
        if (!ref.current) return;
        const element = ref.current;

        const onMove = (e: MouseEvent) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            gsap.to(element, {
                x: x * strength,
                y: y * strength,
                duration: 0.3,
                ease: 'power2.out'
            });
        };

        const onLeave = () => {
            gsap.to(element, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
        };

        element.addEventListener('mousemove', onMove);
        element.addEventListener('mouseleave', onLeave);

        return () => {
            element.removeEventListener('mousemove', onMove);
            element.removeEventListener('mouseleave', onLeave);
        };
    }, [strength]);

    return ref as RefObject<T>;
}

export { gsap, ScrollTrigger };
