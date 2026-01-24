import { motion } from 'framer-motion';

export function Hero() {
    return (
        <section className="min-h-[80vh] flex flex-col items-center justify-center text-center relative">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-4xl space-y-8"
            >
                <div className="inline-block rounded-full bg-white/5 border border-white/10 px-4 py-1.5 mb-4">
                    <span className="text-sm font-medium bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        Now Live on Testnet
                    </span>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                    Cross-Chain Privacy <br />
                    <span className="text-gradient">Redefined</span>
                </h1>

                <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    Break the link between your wallets. Envelop uses Aleo's zero-knowledge proofs to anonymize transfers between public chains.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                    <button
                        onClick={() => document.getElementById('service')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors w-full sm:w-auto"
                    >
                        Start Private Transfer
                    </button>
                    <a
                        href="#how-it-works"
                        className="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-full hover:bg-white/10 transition-colors w-full sm:w-auto"
                    >
                        Read Documentation
                    </a>
                </div>
            </motion.div>
        </section>
    );
}
