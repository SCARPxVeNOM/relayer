"use client";

import { motion } from "framer-motion";

export function PrivacyShield() {
    return (
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
            {/* Pulse Effect */}
            <motion.div
                className="absolute inset-0 rounded-full bg-primary/20 blur-3xl"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Shield SVG */}
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="w-40 h-40 text-primary drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            >
                <motion.path
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                />
                <motion.path
                    d="M12 8v4"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    strokeLinecap="round"
                />
                <motion.path
                    d="M12 16h.01"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.5, type: "spring" }}
                    strokeLinecap="round"
                    strokeWidth="3"
                />
            </svg>

            {/* Orbiting Particles */}
            <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
                <div className="absolute top-0 left-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]" />
            </motion.div>
            <motion.div
                className="absolute inset-0"
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            >
                <div className="absolute bottom-0 left-1/2 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_10px_#8b5cf6]" />
            </motion.div>
        </div>
    );
}
