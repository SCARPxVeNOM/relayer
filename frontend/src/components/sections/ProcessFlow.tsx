import { motion } from 'framer-motion';
import { ArrowRight, Lock, Shield, Wallet } from 'lucide-react';

export const ProcessFlow = () => {
    const steps = [
        {
            icon: <Wallet className="w-6 h-6" />,
            title: "Deposit",
            desc: "Lock assets in smart contract",
            color: "from-blue-400 to-cyan-400"
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: "Shield",
            desc: "Generate Zero-Knowledge Proof",
            color: "from-cyan-400 to-purple-500"
        },
        {
            icon: <Lock className="w-6 h-6" />,
            title: "Private",
            desc: "Mix with anonymity set",
            color: "from-purple-500 to-pink-500"
        },
        {
            icon: <ArrowRight className="w-6 h-6" />,
            title: "Release",
            desc: "Withdraw to fresh address",
            color: "from-pink-500 to-red-500"
        }
    ];

    return (
        <div className="w-full py-20 relative overflow-hidden">
            {/* Connecting Line */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 hidden md:block" />

            <div className="max-w-6xl mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.2 }}
                            viewport={{ once: true }}
                            className="relative group"
                        >
                            <div className="glass-panel p-6 rounded-2xl border-white/5 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] bg-black/40 backdrop-blur-md">
                                <div className={`w-12 h-12 rounded-full mb-4 flex items-center justify-center bg-gradient-to-br ${step.color} shadow-lg`}>
                                    <div className="text-black">
                                        {step.icon}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                    {step.desc}
                                </p>

                                {/* Arrow for mobile */}
                                {index < steps.length - 1 && (
                                    <div className="md:hidden absolute -bottom-6 left-1/2 -translate-x-1/2 text-gray-600">
                                        ↓
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
