import { useEffect, useRef } from 'react';

export const SparkBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const sparks: Spark[] = [];
        const maxSparks = 100;

        class Spark {
            x: number;
            y: number;
            vx: number;
            vy: number;
            life: number;
            size: number;
            color: string;

            constructor() {
                this.x = Math.random() * width;
                this.y = height + 10;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = -(Math.random() * 2 + 1); // Upward velocity
                this.life = Math.random() * 0.5 + 0.5;
                this.size = Math.random() * 2 + 0.5;
                // Ember colors: mix of orange, red, and sometimes gold due to "SpaceX" engine vibe
                const colors = ['#f59e0b', '#ef4444', '#fbbf24'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life -= 0.005; // Fade out
                this.size *= 0.99; // Shrink

                // Jitter
                this.vx += (Math.random() - 0.5) * 0.1;
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.globalAlpha = this.life;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Add new sparks randomly
            if (sparks.length < maxSparks && Math.random() > 0.9) {
                sparks.push(new Spark());
            }

            for (let i = 0; i < sparks.length; i++) {
                sparks[i].update();
                sparks[i].draw(ctx);

                if (sparks[i].life <= 0) {
                    sparks.splice(i, 1);
                    i--;
                }
            }

            requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ mixBlendMode: 'screen' }}
        />
    );
};
