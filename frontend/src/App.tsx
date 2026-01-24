import { ErrorBoundary, TransactionHistory } from './components';
import { LandingLayout } from './components/layout/LandingLayout';
import { GravityHero } from './components/sections/GravityHero';
import { ProcessFlow } from './components/sections/ProcessFlow';
import { ServiceDashboard } from './components/sections/ServiceDashboard';
import { SparkBackground } from './components/ui/SparkBackground';

function App() {
  return (
    <ErrorBoundary>
      <LandingLayout>
        <SparkBackground />

        {/* Antigravity Hero Section */}
        <GravityHero />

        {/* Visual Explanation */}
        <ProcessFlow />

        {/* Main Service Interface */}
        <ServiceDashboard />

        {/* User Data / History */}
        <section className="max-w-4xl mx-auto py-12 relative z-10">
          <div className="glass-panel rounded-2xl p-6 bg-black/40 backdrop-blur-xl border border-white/5">
            <TransactionHistory />
          </div>
        </section>
      </LandingLayout>
    </ErrorBoundary>
  );
}

export default App;
