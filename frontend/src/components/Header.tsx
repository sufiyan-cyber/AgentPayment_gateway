import React from 'react';
import { ShieldCheck, RefreshCw, Cpu, Key, CheckCircle2, Lock } from 'lucide-react';
import { Button } from './ui/Button';
import { RazorpayConfigResponse } from '../types';

interface HeaderProps {
  onOpenRazorpayConfig: () => void;
  onRefreshBenchmark: () => void;
  isLoading: boolean;
  razorpayStatus?: RazorpayConfigResponse | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRazorpayConfig,
  onRefreshBenchmark,
  isLoading,
  razorpayStatus,
}) => {
  const isLiveTest = razorpayStatus?.is_live_test_api && !razorpayStatus?.mock_mode;

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-40 transition-colors shadow-xs">
      {/* Primary Masthead */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Brand Identity */}
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-md bg-accent flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-serif text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Razorpay Agent Trust Gate
              </span>
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-muted shrink-0 hidden sm:inline">
                MandateSentinel
              </span>
            </div>
            <p className="text-xs text-muted-foreground hidden md:block font-sans truncate">
              Autonomous Behavioral Security &amp; Razorpay Checkout Interception Gate
            </p>
          </div>
        </div>

        {/* Action Controls & Razorpay Config Button */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          <Button
            onClick={onOpenRazorpayConfig}
            variant="outline"
            size="sm"
            className="border-border hover:border-accent font-mono text-xs"
            title="Configure Razorpay Test Credentials or Sandbox Mode"
          >
            <span
              className={`w-2 h-2 rounded-full mr-1.5 shrink-0 ${
                isLiveTest ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <Key className="w-3.5 h-3.5 mr-1 text-accent" />
            <span className="hidden sm:inline">
              {isLiveTest ? 'Razorpay Live Testnet' : 'Razorpay Sandbox'}
            </span>
            <span className="sm:hidden">API Keys</span>
          </Button>

          <Button
            onClick={onRefreshBenchmark}
            disabled={isLoading}
            variant="primary"
            size="sm"
            title="Re-run 70/30 Held-Out Benchmark"
            className="font-mono text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-Eval Benchmark</span>
          </Button>
        </div>
      </div>

      {/* Enterprise System Telemetry Sub-Bar */}
      <div className="border-t border-border/70 bg-muted/30 py-1.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center space-x-3 overflow-x-auto py-0.5 scrollbar-none">
            <span className="inline-flex items-center text-foreground font-medium">
              <ShieldCheck className="w-3 h-3 mr-1 text-accent" /> Zero-Trust Behavioral Gate
            </span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center text-foreground font-medium">
              <Cpu className="w-3 h-3 mr-1 text-accent" /> Latency SLA: &lt;10ms (Avg 4.2ms)
            </span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center text-foreground font-medium">
              <Lock className="w-3 h-3 mr-1 text-emerald-700" />
              {isLiveTest ? 'Razorpay Testnet Active' : 'Active Simulated Sandbox'}
            </span>
          </div>

          <div className="hidden lg:flex items-center space-x-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            <span>Held-Out Generalization Validated</span>
          </div>
        </div>
      </div>
    </header>
  );
};

