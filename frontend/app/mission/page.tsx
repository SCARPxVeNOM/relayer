"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/services/api.client";

export default function MissionPage() {
  const [health, setHealth] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [version, setVersion] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const pull = async () => {
      try {
        const [h, t, v] = await Promise.all([
          apiClient.getHealth(),
          apiClient.getTelemetry(),
          apiClient.getVersion(),
        ]);
        setHealth(h);
        setTelemetry(t);
        setVersion(v);
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
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
          System Mission
        </h1>
        <p className="text-sm text-white/70">
          Real-time status for Envelop Aleo private finance services.
        </p>

        {error && (
          <div className="border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Health">
            <Row label="Status" value={health?.status || "-"} />
            <Row label="Service" value={health?.service || "-"} />
            <Row label="Uptime (sec)" value={String(health?.uptimeSec || "-")} />
          </Card>
          <Card title="Telemetry">
            <Row label="Encryption" value={telemetry?.encryptionEngine || "-"} />
            <Row label="Bridge Link" value={telemetry?.bridgeLink || "-"} />
            <Row label="ZK System" value={telemetry?.zkSystemStatus || "-"} />
          </Card>
          <Card title="Version">
            <Row label="Protocol" value={version?.protocol || "-"} />
            <Row label="Gateway" value={version?.gateway || "-"} />
            <Row label="Build" value={version?.build || "-"} />
          </Card>
        </div>

        <div className="border border-white/10 bg-black/40 p-6">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-3">
            Product Definition
          </h2>
          <ul className="space-y-2 text-sm text-white/75">
            <li>Private asset management for ALEO and ARC-21 assets</li>
            <li>Private swap quotes and executions</li>
            <li>Private payments and invoice lifecycle</li>
            <li>Mobile onboarding with WhatsApp OTP + wallet binding</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/10 bg-black/40 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-white/50 uppercase tracking-wider">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

