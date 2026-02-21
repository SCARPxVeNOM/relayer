"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/services/api.client";

export default function MissionPage() {
  const [health, setHealth] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [version, setVersion] = useState<any>(null);
  const [aleo, setAleo] = useState<any>(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    const pull = async () => {
      try {
        const [h, t, v, a] = await Promise.all([
          apiClient.getHealth(),
          apiClient.getTelemetry(),
          apiClient.getVersion(),
          apiClient.getAleoStatus(),
        ]);
        setHealth(h);
        setTelemetry(t);
        setVersion(v);
        setAleo(a);
        setLastUpdated(Date.now());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch system data");
      }
    };
    pull();
    const interval = setInterval(pull, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="border border-white/10 bg-black/78 backdrop-blur-sm p-6 md:p-8 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Operations</p>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
                System Mission
              </h1>
              <p className="text-sm text-white/70 max-w-3xl">
                Live operational status for wallet onboarding, identity registry integration,
                relayer health, and Aleo transaction services.
              </p>
            </div>
            <div className="text-xs text-white/55">
              Last updated:{" "}
              <span className="font-mono text-white/80">
                {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "syncing..."}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatusChip
              label="API"
              value={health?.status || "syncing"}
              tone={health?.status === "healthy" ? "good" : "neutral"}
            />
            <StatusChip
              label="Network"
              value={telemetry?.network || "not set"}
              tone="neutral"
            />
            <StatusChip
              label="Ledger"
              value={aleo?.ledgerMode || "syncing"}
              tone="neutral"
            />
            <StatusChip
              label="Relayer"
              value={telemetry?.relaySubmitConfigured ? "configured" : "client tx id mode"}
              tone={telemetry?.relaySubmitConfigured ? "good" : "warn"}
            />
          </div>
        </section>

        {error && (
          <div className="border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Health" subtitle="Service process health and uptime">
            <Row label="Status" value={health?.status || "-"} />
            <Row label="Service" value={health?.service || "-"} />
            <Row label="Uptime (sec)" value={String(health?.uptimeSec || "-")} />
          </Card>
          <Card title="Telemetry" subtitle="Runtime configuration signals">
            <Row label="Environment" value={telemetry?.environment || "-"} />
            <Row label="Network" value={telemetry?.network || "-"} />
            <Row label="OTP Provider" value={telemetry?.otpProvider || "-"} />
            <Row
              label="Relay Submit"
              value={telemetry?.relaySubmitConfigured ? "configured" : "not configured"}
            />
          </Card>
          <Card title="Version" subtitle="Release and build metadata">
            <Row label="Service" value={version?.service || "-"} />
            <Row label="Release" value={version?.release || "-"} />
            <Row label="Build" value={version?.build || "-"} />
            <Row label="Commit" value={version?.commit || "-"} />
          </Card>
          <Card title="Aleo" subtitle="On-chain execution context">
            <Row label="Status" value={aleo?.status || "-"} />
            <Row label="Ledger Mode" value={aleo?.ledgerMode || "-"} />
            <Row label="Program" value={aleo?.program || "unconfigured"} />
          </Card>
        </div>

        <section className="border border-white/10 bg-black/72 backdrop-blur-sm p-6 md:p-7 space-y-6">
          <h2 className="text-lg font-bold uppercase tracking-wide">Platform Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-white/50">Core Features</p>
              <ul className="space-y-2 text-white/75">
                <li>Private asset management for ALEO and ARC-21 assets</li>
                <li>On-chain anchored username identity claim and resolution</li>
                <li>Private swap quote, sign, and execute workflow</li>
                <li>Private payment and invoice lifecycle using username routing</li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-white/50">Operational Notes</p>
              <ul className="space-y-2 text-white/75">
                <li>Wallet onboarding is signature-first with deterministic session auth.</li>
                <li>Relayer status and explorer indexing are surfaced in protocol history.</li>
                <li>One-time username registration is enforced to prevent identity drift.</li>
                <li>All critical transaction paths are validated against confirmed tx ids.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/10 bg-black/72 backdrop-blur-sm p-5 space-y-3">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
        <p className="text-[11px] text-white/50 mt-1">{subtitle}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3 text-xs">
      <span className="text-white/50 uppercase tracking-wider">{label}</span>
      <span className="font-mono text-right break-all">{value}</span>
    </div>
  );
}

function StatusChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/50 text-emerald-300 bg-emerald-500/10"
      : tone === "warn"
        ? "border-yellow-500/50 text-yellow-200 bg-yellow-500/10"
        : "border-white/20 text-white/80 bg-black/60";
  return (
    <div className={`border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.15em]">{label}</p>
      <p className="text-xs font-semibold mt-1">{value}</p>
    </div>
  );
}

