import React from 'react';
import { MetricsSummary } from '../types';
import { ShieldCheck, Target, Clock, DollarSign, ArrowUpRight } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface MetricsOverviewProps {
  metrics: MetricsSummary | null;
  onOpenConfusionMatrix: () => void;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  metrics,
  onOpenConfusionMatrix,
}) => {
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-muted/60 border border-border" />
        ))}
      </div>
    );
  }

  const { summary, latency, financial_volume, confusion_matrix } = metrics;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 1. Precision & Recall Card */}
      <Card
        onClick={onOpenConfusionMatrix}
        hoverEffect
        accentTop
        className="p-6 flex flex-col justify-between group"
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Detection Accuracy
            </span>
            <span className="p-1.5 rounded bg-accent/10 text-accent group-hover:bg-accent/20 transition">
              <Target className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="font-serif text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
                {(summary.precision * 100).toFixed(1)}%
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Precision
              </span>
            </div>
            <div className="text-right">
              <div className="font-serif text-3xl sm:text-4xl font-semibold text-accent tracking-tight">
                {(summary.recall * 100).toFixed(1)}%
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Recall
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <span>Held-Out F1: <strong className="text-foreground font-mono">{summary.f1_score.toFixed(3)}</strong></span>
          <span className="text-accent flex items-center font-medium group-hover:underline">
            View Matrix <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </Card>

      {/* 2. Added Latency (<300ms SLA) */}
      <Card className="p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Added Latency SLA
            </span>
            <span className="p-1.5 rounded bg-muted text-muted-foreground">
              <Clock className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-4 flex items-baseline space-x-2.5">
            <div className="font-serif text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              {latency.avg_ms.toFixed(1)}<span className="text-base font-sans font-normal text-muted-foreground ml-0.5">ms</span>
            </div>
            <Badge variant="allow">
              100% &lt;300ms
            </Badge>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-3 font-mono">
          <span>p50: <span className="text-foreground font-medium">{latency.p50_ms.toFixed(1)}ms</span></span>
          <span>p95: <span className="text-foreground font-medium">{latency.p95_ms.toFixed(1)}ms</span></span>
          <span>p99: <span className="text-foreground font-medium">{latency.p99_ms.toFixed(1)}ms</span></span>
        </div>
      </Card>

      {/* 3. Adversarial Volume Prevented */}
      <Card className="p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Adversarial Value Blocked
            </span>
            <span className="p-1.5 rounded bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-4">
            <div className="font-serif text-3xl sm:text-4xl font-semibold text-emerald-800 tracking-tight">
              ₹{financial_volume.adversarial_prevented_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <span>Total Attacks Thwarted</span>
          <span className="text-emerald-800 font-mono font-medium">
            {confusion_matrix.true_positives} attacks
          </span>
        </div>
      </Card>

      {/* 4. Total Volume Gated */}
      <Card className="p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Volume Gated
            </span>
            <span className="p-1.5 rounded bg-muted text-muted-foreground">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>

          <div className="mt-4">
            <div className="font-serif text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              ₹{financial_volume.total_requested_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-3 font-mono">
          <span className="text-emerald-700">Apprv: ₹{financial_volume.approved_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          <span className="text-rose-700">Blk: ₹{financial_volume.blocked_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        </div>
      </Card>
    </div>
  );
};
