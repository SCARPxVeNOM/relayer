"use client";

import React, { useEffect, useRef } from 'react';

interface SparkCanvasProps {
    active?: boolean;
}

export const SparkCanvas: React.FC<SparkCanvasProps> = ({ active = true }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !active) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;
        let particles: any[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        class Particle {
            x: number; y: number; vx: number; vy: number; life: number; color: string;
            constructor(x: number, y: number) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 10;
                this.vy = (Math.random() - 0.5) * 10;
                this.life = 1.0;
                this.color = Math.random() > 0.5 ? '#FF4D00' : '#00FFFF';
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.1; // gravity
                this.life -= 0.02;
            }

            draw() {
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - this.vx * 2, this.y - this.vy * 2);
                ctx.stroke();
            }
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (Math.random() > 0.8) {
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height));
                }
            }

            particles = particles.filter(p => p.life > 0);
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            requestAnimationFrame(animate);
        };

        animate();
        return () => window.removeEventListener('resize', resize);
    }, [active]);

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};
