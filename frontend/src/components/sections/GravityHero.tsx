import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { motion } from 'framer-motion';

export const GravityHero = () => {
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);

    useEffect(() => {
        if (!sceneRef.current) return;

        // Module aliases
        const Engine = Matter.Engine,
            Render = Matter.Render,
            World = Matter.World,
            Bodies = Matter.Bodies,
            Mouse = Matter.Mouse,
            MouseConstraint = Matter.MouseConstraint,
            Runner = Matter.Runner,
            Composite = Matter.Composite;

        // Create engine
        const engine = Engine.create();
        engineRef.current = engine;
        const world = engine.world;

        // Create renderer
        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                messages: false, // Debug info
                wireframes: false, // Full render
                background: 'transparent',
                pixelRatio: window.devicePixelRatio
            } as any
        });

        // Create bodies (Words/Shapes)
        const cw = window.innerWidth;
        const ch = window.innerHeight;

        const wallOptions: Matter.IChamferableBodyDefinition = {
            isStatic: true,
            render: { fillStyle: 'transparent' } // Invisible walls
        };

        // Walls
        World.add(world, [
            Bodies.rectangle(cw / 2, -100, cw, 50, wallOptions), // Top
            Bodies.rectangle(cw / 2, ch + 50, cw, 100, wallOptions), // Bottom
            Bodies.rectangle(cw + 50, ch / 2, 100, ch, wallOptions), // Right
            Bodies.rectangle(-50, ch / 2, 100, ch, wallOptions) // Left
        ]);

        // Falling Objects
        const words = ['PRIVACY', 'ANONYMITY', 'SECURITY', 'ALEO', 'ZERO-KNOWLEDGE', 'ENVELOP'];
        const bodies = words.map((word, i) => {
            const x = Math.random() * (cw - 100) + 50;
            const y = Math.random() * -500 - 100; // Start above screen
            return Bodies.rectangle(x, y, 180 + word.length * 10, 60, {
                chamfer: { radius: 20 },
                frictionAir: 0.05,
                restitution: 0.5,
                render: {
                    fillStyle: i % 2 === 0 ? '#06b6d4' : '#9333ea', // Cyan or Purple
                    text: {
                        content: word,
                        color: '#ffffff',
                        size: 18,
                        family: 'Inter, sans-serif'
                    }
                }
            } as any); // Type cast for custom render prop
        });

        // Custom Render Loop for Text
        const originalRenderBody = (Render as any).bodies;
        (Render as any).bodies = function (render: any, bodies: any, context: any) {
            // Call original render first to draw shapes
            originalRenderBody.apply(this, [render, bodies, context]);

            // Draw text on top
            for (let i = 0; i < bodies.length; i += 1) {
                const body = bodies[i];

                if (body.render.text) {
                    const { content, color, size, family } = body.render.text;
                    context.font = `bold ${size}px ${family}`;
                    context.fillStyle = color;
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';

                    // Handle rotation
                    context.translate(body.position.x, body.position.y);
                    context.rotate(body.angle);
                    context.fillText(content, 0, 0);
                    context.rotate(-body.angle);
                    context.translate(-body.position.x, -body.position.y);
                }
            }
        };

        World.add(world, bodies);

        // Mouse Interaction
        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            } as any
        });

        World.add(world, mouseConstraint);

        // Keep the mouse in sync with rendering
        render.mouse = mouse;

        // Run the engine
        const runner = Runner.create();
        Runner.run(runner, engine);
        Render.run(render);

        // Resize handler
        const handleResize = () => {
            render.canvas.width = window.innerWidth;
            render.canvas.height = window.innerHeight;
            // Reposition walls... (implied for brevity, just refreshing canvas size mostly works)
        };
        window.addEventListener('resize', handleResize);

        return () => {
            Render.stop(render);
            Runner.stop(runner);
            Composite.clear(world, false);
            Engine.clear(engine);
            render.canvas.remove();
            render.canvas = null as any;
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black flex flex-col items-center justify-center">
            {/* Canvas Container */}
            <div ref={sceneRef} className="absolute inset-0 z-0" />

            {/* Overlay Content (Non-interactive mostly, or pass-through) */}
            <div className="relative z-10 pointer-events-none text-center space-y-4">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-600 drop-shadow-[0_0_25px_rgba(6,182,212,0.5)]"
                >
                    ANTIGRAVITY
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="text-xl text-gray-400"
                >
                    Drag the blocks. Break the link.
                </motion.p>
            </div>

            {/* Scroll Down Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 1 }}
                className="absolute bottom-10 z-10 animate-bounce text-cyan-400"
            >
                ↓ Scroll Down
            </motion.div>
        </div>
    );
};
