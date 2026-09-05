import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { AgentPlayground } from './components/AgentPlayground';
import { MetricsOverview } from './components/MetricsOverview';
import { SimulatorControls } from './components/SimulatorControls';
import { LiveFeed } from './components/LiveFeed';
import { AuditDetailModal } from './components/AuditDetailModal';
import { StepUpModal } from './components/StepUpModal';
import { ConfusionMatrixModal } from './components/ConfusionMatrixModal';
import { FalsePositiveCard } from './components/FalsePositiveCard';
import { RazorpayConfigModal } from './components/RazorpayConfigModal';
import { apiClient } from './api';
import { MetricsSummary, AuditEntry, RazorpayConfigResponse, StepUpConfirmResponse } from './types';
import { ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [selectedAuditEntry, setSelectedAuditEntry] = useState<AuditEntry | null>(null);
  const [stepUpEntry, setStepUpEntry] = useState<AuditEntry | null>(null);
  const [resolvedStepUp, setResolvedStepUp] = useState<StepUpConfirmResponse | null>(null);

  const [isConfusionMatrixOpen, setIsConfusionMatrixOpen] = useState(false);
  const [isRazorpayConfigOpen, setIsRazorpayConfigOpen] = useState(false);
  const [razorpayStatus, setRazorpayStatus] = useState<RazorpayConfigResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const streamIntervalRef = useRef<number | null>(null);

  const loadData = async () => {
    try {
      const [m, logs, rzpConfig] = await Promise.all([
        apiClient.getMetrics(),
        apiClient.getAuditLogs(60),
        apiClient.getRazorpayConfig().catch(() => null),
      ]);
      setMetrics(m);
      setAuditEntries(logs);
      if (rzpConfig) setRazorpayStatus(rzpConfig);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerSample = async (attackType?: string) => {
    setIsLoading(true);
    try {
      await apiClient.triggerSample(attackType);
      const [m, logs] = await Promise.all([
        apiClient.getMetrics(),
        apiClient.getAuditLogs(60),
      ]);
      setMetrics(m);
      setAuditEntries(logs);
    } catch (err) {
      console.error('Failed to trigger sample:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshBenchmark = async () => {
    setIsLoading(true);
    try {
      const updatedMetrics = await apiClient.runBenchmark();
      setMetrics(updatedMetrics);
      const logs = await apiClient.getAuditLogs(60);
      setAuditEntries(logs);
    } catch (err) {
      console.error('Failed to re-run benchmark:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmStepUp = async (decisionId: string, approved: boolean, notes?: string) => {
    try {
      const result = await apiClient.confirmStepUp(decisionId, approved, notes);
      setResolvedStepUp(result);
      const logs = await apiClient.getAuditLogs(60);
      setAuditEntries(logs);
      const m = await apiClient.getMetrics();
      setMetrics(m);
    } catch (err) {
      console.error('Failed to resolve step up:', err);
    }
  };

  const handleTransactionExecuted = (newEntry: AuditEntry) => {
    setAuditEntries((prev) => [newEntry, ...prev]);
    // Refresh metrics in background to reflect updated volume and blocked counts
    apiClient.getMetrics().then(setMetrics).catch(() => {});
  };

  useEffect(() => {
    if (isStreaming) {
      const attackPool = [undefined, undefined, undefined, 'semantic_drift', 'spend_spike', 'category_swap', 'velocity_burst'];
      streamIntervalRef.current = window.setInterval(() => {
        const randomAttack = attackPool[Math.floor(Math.random() * attackPool.length)];
        handleTriggerSample(randomAttack);
      }, 2400);
    } else {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    }

    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, [isStreaming]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative paper-texture scroll-smooth">
      {/* Subtle Ambient Glows */}
      <div className="ambient-glow -top-32 -right-32 pointer-events-none" />
      <div className="ambient-glow top-1/2 -left-48 pointer-events-none" />

      {/* Editorial Header */}
      <Header
        onOpenRazorpayConfig={() => setIsRazorpayConfigOpen(true)}
        onRefreshBenchmark={handleRefreshBenchmark}
        isLoading={isLoading}
        razorpayStatus={razorpayStatus}
      />

      {/* Main Container with generous top padding to prevent sticky header clipping */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 flex-1 space-y-10 w-full relative z-10 scroll-pt-28">
        {/* Executive Product Banner */}
        <div className="pt-2 pb-3 border-b border-border/80 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent font-semibold block mb-1">
              Autonomous Commerce Security • Razorpay Production Gate
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-foreground tracking-tight">
              Real-time behavioral trust gate for AI agents.
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1 max-w-3xl">
              Evaluating semantic intent, spend caps, and velocity in under 10ms before Razorpay checkout settlement.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-mono text-xs pb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-muted-foreground">Sentinel Engine:</span>
            <span className="text-foreground font-semibold">Active &amp; Guarded</span>
          </div>
        </div>

        {/* 1. HERO CENTERPIECE: Interactive AI Purchasing Agent Playground (Above the Fold) */}
        <section id="agent-playground" className="scroll-mt-28">
          <AgentPlayground
            onTransactionExecuted={handleTransactionExecuted}
            onStepUpAction={(entry) => setStepUpEntry(entry)}
            resolvedStepUp={resolvedStepUp}
          />
        </section>

        {/* 2. Scoreboard KPI Overview */}
        <section>
          <MetricsOverview
            metrics={metrics}
            onOpenConfusionMatrix={() => setIsConfusionMatrixOpen(true)}
          />
        </section>

        {/* 3. Asymmetric Command Center: Simulator (7 cols) + Step-Up Showcase (5 cols) */}
        <section>
          <div className="mb-3.5 flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-accent">
              Continuous Stream &amp; Attack Injection Console
            </span>
            <span className="font-mono text-[11px] text-muted-foreground hidden sm:block">
              Simulate high-velocity vectors or review false-positive boundary cases
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 h-full">
              <SimulatorControls
                onTriggerSample={handleTriggerSample}
                isStreaming={isStreaming}
                onToggleStreaming={() => setIsStreaming(!isStreaming)}
                isLoading={isLoading}
              />
            </div>

            <div className="lg:col-span-5 h-full">
              <FalsePositiveCard
                showcaseEntry={metrics?.false_positive_showcase || null}
                onOpenDetail={(entry) => setSelectedAuditEntry(entry)}
              />
            </div>
          </div>
        </section>

        {/* 4. Central Ledger Table (Full Width) */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-accent">
              Immutable Transaction &amp; Settlement Ledger
            </span>
            <span className="font-mono text-[11px] text-muted-foreground hidden sm:block">
              Real-time audit log with policy explanation trail
            </span>
          </div>

          <LiveFeed
            entries={auditEntries}
            onSelectEntry={(entry) => setSelectedAuditEntry(entry)}
            onStepUpAction={(entry) => setStepUpEntry(entry)}
          />
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-border bg-card/80 backdrop-blur-xs py-7 text-xs text-muted-foreground font-sans relative z-10 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span className="font-serif font-semibold text-foreground">Razorpay Agent Trust Gate (MandateSentinel)</span>
            <span className="text-border">|</span>
            <span>Autonomous Commerce Behavioral Protection</span>
          </div>
          <div className="flex items-center space-x-3.5 font-mono text-[11px] text-muted-foreground">
            <span>Sub-10ms SLA</span>
            <span className="text-border">•</span>
            <span>Held-Out Validated</span>
            <span className="text-border">•</span>
            <span>Razorpay Testnet Ready</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuditDetailModal
        entry={selectedAuditEntry}
        onClose={() => setSelectedAuditEntry(null)}
      />

      <StepUpModal
        entry={stepUpEntry}
        onClose={() => setStepUpEntry(null)}
        onConfirm={handleConfirmStepUp}
      />

      <ConfusionMatrixModal
        isOpen={isConfusionMatrixOpen}
        metrics={metrics}
        onClose={() => setIsConfusionMatrixOpen(false)}
      />

      <RazorpayConfigModal
        isOpen={isRazorpayConfigOpen}
        onClose={() => setIsRazorpayConfigOpen(false)}
        onConfigUpdated={(cfg) => setRazorpayStatus(cfg)}
      />
    </div>
  );
};

export default App;

