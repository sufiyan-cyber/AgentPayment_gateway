import React, { useState } from 'react';
import { Play, Pause, AlertOctagon, Zap, ShieldAlert, TrendingUp, Shuffle, Repeat } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface SimulatorControlsProps {
  onTriggerSample: (attackType?: string) => Promise<void>;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  isLoading: boolean;
}

export const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  onTriggerSample,
  isStreaming,
  onToggleStreaming,
  isLoading,
}) => {
  const [activeTrigger, setActiveTrigger] = useState<string | null>(null);

  const handleTrigger = async (type?: string) => {
    setActiveTrigger(type || 'clean');
    try {
      await onTriggerSample(type);
    } finally {
      setActiveTrigger(null);
    }
  };

  return (
    <Card className="p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-semibold text-foreground">
                Agent Simulator &amp; Attack Injection Console
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">
                Interactive
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-sans">
              Dispatch synthetic agent purchasing intents to test the behavioral verification gate.
            </p>
          </div>

          {/* Streaming Toggle */}
          <div className="flex items-center space-x-2 shrink-0">
            <Button
              onClick={onToggleStreaming}
              variant={isStreaming ? 'outline' : 'primary'}
              size="sm"
              className={isStreaming ? 'border-amber-600/40 text-amber-900 bg-amber-50/50' : ''}
            >
              {isStreaming ? (
                <>
                  <Pause className="w-3.5 h-3.5 mr-1.5 text-amber-800" />
                  <span>Pause Stream</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  <span>Start Live Agent Stream</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Manual Scenario Triggers in 3-col Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Clean Sample */}
        <button
          onClick={() => handleTrigger()}
          disabled={isLoading || activeTrigger !== null}
          className="flex flex-col items-start p-3 rounded-md bg-muted/30 hover:bg-muted/70 border border-border hover:border-emerald-600/50 text-left transition-all duration-200 group disabled:opacity-50 touch-manipulation hover:-translate-y-0.5"
        >
          <div className="flex items-center font-mono text-[11px] font-semibold text-emerald-800 tracking-wide">
            <Zap className="w-3.5 h-3.5 mr-1 text-emerald-700" />
            Clean Mandate
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
            Normal purchase within policy bounds (~80%)
          </span>
        </button>

        {/* 1. Semantic Drift */}
        <button
          onClick={() => handleTrigger('semantic_drift')}
          disabled={isLoading || activeTrigger !== null}
          className="flex flex-col items-start p-3 rounded-md bg-muted/30 hover:bg-muted/70 border border-border hover:border-amber-600/50 text-left transition-all duration-200 group disabled:opacity-50 touch-manipulation hover:-translate-y-0.5"
        >
          <div className="flex items-center font-mono text-[11px] font-semibold text-amber-900 tracking-wide">
            <Shuffle className="w-3.5 h-3.5 mr-1 text-amber-800" />
            Semantic Drift
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
            Goal divergence &amp; subtle prompt hijacking
          </span>
        </button>

        {/* 2. Spend Spike */}
        <button
          onClick={() => handleTrigger('spend_spike')}
          disabled={isLoading || activeTrigger !== null}
          className="flex flex-col items-start p-3 rounded-md bg-muted/30 hover:bg-muted/70 border border-border hover:border-rose-600/50 text-left transition-all duration-200 group disabled:opacity-50 touch-manipulation hover:-translate-y-0.5"
        >
          <div className="flex items-center font-mono text-[11px] font-semibold text-rose-900 tracking-wide">
            <TrendingUp className="w-3.5 h-3.5 mr-1 text-rose-800" />
            Spend Spike
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
            Exceeds max transaction limit cap
          </span>
        </button>

        {/* 3. Category Swap */}
        <button
          onClick={() => handleTrigger('category_swap')}
          disabled={isLoading || activeTrigger !== null}
          className="flex flex-col items-start p-3 rounded-md bg-muted/30 hover:bg-muted/70 border border-border hover:border-rose-600/50 text-left transition-all duration-200 group disabled:opacity-50 touch-manipulation hover:-translate-y-0.5"
        >
          <div className="flex items-center font-mono text-[11px] font-semibold text-rose-900 tracking-wide">
            <AlertOctagon className="w-3.5 h-3.5 mr-1 text-rose-800" />
            Category Swap
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
            Merchant mismatch outside whitelist
          </span>
        </button>

        {/* 4. Velocity Burst */}
        <button
          onClick={() => handleTrigger('velocity_burst')}
          disabled={isLoading || activeTrigger !== null}
          className="flex flex-col items-start p-3 rounded-md bg-muted/30 hover:bg-muted/70 border border-border hover:border-purple-600/50 text-left transition-all duration-200 group disabled:opacity-50 touch-manipulation hover:-translate-y-0.5"
        >
          <div className="flex items-center font-mono text-[11px] font-semibold text-purple-900 tracking-wide">
            <Repeat className="w-3.5 h-3.5 mr-1 text-purple-800" />
            Velocity Burst
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
            High-frequency agent loop replay
          </span>
        </button>

        {/* 5. Session Hijack */}
        <button
          onClick={() => handleTrigger('session_hijack')}
          disabled={isLoading || activeTrigger !== null}
          className="flex flex-col items-start p-3 rounded-md bg-muted/30 hover:bg-muted/70 border border-border hover:border-rose-600/50 text-left transition-all duration-200 group disabled:opacity-50 touch-manipulation hover:-translate-y-0.5"
        >
          <div className="flex items-center font-mono text-[11px] font-semibold text-rose-900 tracking-wide">
            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-800" />
            Session Hijack
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
            Unauthorized goal change mid-session
          </span>
        </button>
      </div>
      </div>
    </Card>
  );
};
