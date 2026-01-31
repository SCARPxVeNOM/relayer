'use client';

import React, { useRef, useEffect, ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register plugins
if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

interface AnimatedProps {
    children: ReactNode;
    className?: string;
    animation?: 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scale' | 'blur';
    delay?: number;
    duration?: number;
    stagger?: boolean;
}

/**
 * Animated wrapper component
 */
export function Animated({
    children,
    className = '',
    animation = 'fadeIn',
    delay = 0,
    duration = 0.8,
    stagger = false
}: AnimatedProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const element = ref.current;
        const targets = stagger ? element.children : element;

        const animations: Record<string, { from: gsap.TweenVars; to: gsap.TweenVars }> = {
            fadeIn: {
                from: { opacity: 0, y: 30 },
                to: { opacity: 1, y: 0 }
            },
            slideUp: {
                from: { opacity: 0, y: 60 },
                to: { opacity: 1, y: 0 }
            },
            slideLeft: {
                from: { opacity: 0, x: 60 },
                to: { opacity: 1, x: 0 }
            },
            slideRight: {
                from: { opacity: 0, x: -60 },
                to: { opacity: 1, x: 0 }
            },
            scale: {
                from: { opacity: 0, scale: 0.8 },
                to: { opacity: 1, scale: 1 }
            },
            blur: {
                from: { opacity: 0, filter: 'blur(10px)' },
                to: { opacity: 1, filter: 'blur(0px)' }
            }
        };

        const anim = animations[animation];

        gsap.fromTo(targets, anim.from, {
            ...anim.to,
            duration,
            delay,
            ease: 'power3.out',
            stagger: stagger ? 0.1 : 0
        });
    }, [animation, delay, duration, stagger]);

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}

/**
 * Scroll-triggered animated component
 */
export function ScrollAnimated({
    children,
    className = '',
    animation = 'fadeIn',
    duration = 0.8,
    start = 'top 85%'
}: AnimatedProps & { start?: string }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const animations: Record<string, { from: gsap.TweenVars; to: gsap.TweenVars }> = {
            fadeIn: {
                from: { opacity: 0, y: 40 },
                to: { opacity: 1, y: 0 }
            },
            slideUp: {
                from: { opacity: 0, y: 80 },
                to: { opacity: 1, y: 0 }
            },
            slideLeft: {
                from: { opacity: 0, x: 80 },
                to: { opacity: 1, x: 0 }
            },
            slideRight: {
                from: { opacity: 0, x: -80 },
                to: { opacity: 1, x: 0 }
            },
            scale: {
                from: { opacity: 0, scale: 0.7 },
                to: { opacity: 1, scale: 1 }
            },
            blur: {
                from: { opacity: 0, filter: 'blur(15px)' },
                to: { opacity: 1, filter: 'blur(0px)' }
            }
        };

        const anim = animations[animation];

        gsap.fromTo(ref.current, anim.from, {
            ...anim.to,
            duration,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: ref.current,
                start,
                toggleActions: 'play none none none'
            }
        });
    }, [animation, duration, start]);

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}

/**
 * Floating animation wrapper
 */
export function FloatingElement({
    children,
    className = '',
    duration = 3,
    y = 10
}: {
    children: ReactNode;
    className?: string;
    duration?: number;
    y?: number;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        gsap.to(ref.current, {
            y: y,
            duration,
            ease: 'power1.inOut',
            repeat: -1,
            yoyo: true
        });
    }, [duration, y]);

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}

/**
 * Glowing border animation
 */
export function GlowingBorder({
    children,
    className = '',
    color = 'rgba(0, 255, 136, 0.6)'
}: {
    children: ReactNode;
    className?: string;
    color?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        gsap.to(ref.current, {
            boxShadow: `0 0 20px ${color}, 0 0 40px ${color}, 0 0 60px ${color}`,
            duration: 1.5,
            ease: 'power1.inOut',
            repeat: -1,
            yoyo: true
        });
    }, [color]);

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}

/**
 * Text reveal animation (word by word)
 */
export function TextReveal({
    text,
    className = '',
    delay = 0,
    stagger = 0.05
}: {
    text: string;
    className?: string;
    delay?: number;
    stagger?: number;
}) {
    const containerRef = useRef<HTMLSpanElement>(null);
    const words = text.split(' ');

    useEffect(() => {
        if (!containerRef.current) return;

        const wordElements = containerRef.current.querySelectorAll('.word');

        gsap.fromTo(
            wordElements,
            { opacity: 0, y: 20, rotateX: -90 },
            {
                opacity: 1,
                y: 0,
                rotateX: 0,
                duration: 0.5,
                delay,
                stagger,
                ease: 'back.out(1.7)'
            }
        );
    }, [delay, stagger]);

    return (
        <span ref={containerRef} className={className}>
            {words.map((word, i) => (
                <span
                    key={i}
                    className="word inline-block"
                    style={{ marginRight: '0.25em' }}
                >
                    {word}
                </span>
            ))}
        </span>
    );
}

/**
 * Parallax scroll effect
 */
export function Parallax({
    children,
    className = '',
    speed = 0.5
}: {
    children: ReactNode;
    className?: string;
    speed?: number;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        gsap.to(ref.current, {
            y: () => window.innerHeight * speed * -1,
            ease: 'none',
            scrollTrigger: {
                trigger: ref.current,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true
            }
        });
    }, [speed]);

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}

/**
 * Button with hover animation
 */
export function AnimatedButton({
    children,
    className = '',
    onClick
}: {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}) {
    const ref = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!ref.current) return;
        const button = ref.current;

        const onEnter = () => {
            gsap.to(button, {
                scale: 1.05,
                boxShadow: '0 10px 40px rgba(0, 255, 136, 0.3)',
                duration: 0.3,
                ease: 'power2.out'
            });
        };

        const onLeave = () => {
            gsap.to(button, {
                scale: 1,
                boxShadow: '0 4px 20px rgba(0, 255, 136, 0.1)',
                duration: 0.3,
                ease: 'power2.out'
            });
        };

        const onDown = () => {
            gsap.to(button, { scale: 0.95, duration: 0.1 });
        };

        const onUp = () => {
            gsap.to(button, { scale: 1.05, duration: 0.1 });
        };

        button.addEventListener('mouseenter', onEnter);
        button.addEventListener('mouseleave', onLeave);
        button.addEventListener('mousedown', onDown);
        button.addEventListener('mouseup', onUp);

        return () => {
            button.removeEventListener('mouseenter', onEnter);
            button.removeEventListener('mouseleave', onLeave);
            button.removeEventListener('mousedown', onDown);
            button.removeEventListener('mouseup', onUp);
        };
    }, []);

    return (
        <button ref={ref} className={className} onClick={onClick}>
            {children}
        </button>
    );
}

/**
 * Card with 3D tilt effect
 */
export function TiltCard({
    children,
    className = ''
}: {
    children: ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;
        const card = ref.current;

        const onMove = (e: MouseEvent) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            gsap.to(card, {
                rotateX,
                rotateY,
                duration: 0.3,
                ease: 'power2.out',
                transformPerspective: 1000
            });
        };

        const onLeave = () => {
            gsap.to(card, {
                rotateX: 0,
                rotateY: 0,
                duration: 0.5,
                ease: 'power2.out'
            });
        };

        card.addEventListener('mousemove', onMove);
        card.addEventListener('mouseleave', onLeave);

        return () => {
            card.removeEventListener('mousemove', onMove);
            card.removeEventListener('mouseleave', onLeave);
        };
    }, []);

    return (
        <div ref={ref} className={className} style={{ transformStyle: 'preserve-3d' }}>
            {children}
        </div>
    );
}
