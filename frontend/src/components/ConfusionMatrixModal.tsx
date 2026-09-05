import React from 'react';
import { MetricsSummary } from '../types';
import { X, Target } from 'lucide-react';
import { Button } from './ui/Button';

interface ConfusionMatrixModalProps {
  isOpen: boolean;
  metrics: MetricsSummary | null;
  onClose: () => void;
}

export const ConfusionMatrixModal: React.FC<ConfusionMatrixModalProps> = ({
  isOpen,
  metrics,
  onClose,
}) => {
  if (!isOpen || !metrics) return null;

  const { summary, confusion_matrix, attack_breakdown } = metrics;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-xs animate-fade-in">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-lg">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-accent/15 text-accent border border-accent/30">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-lg text-foreground">
                Held-Out Benchmark &amp; Confusion Matrix
              </h3>
              <p className="text-xs text-muted-foreground font-sans">
                Evaluated on 30% strictly held-out test split (~{summary.total_eval_requests} requests)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* 2x2 Confusion Matrix Grid */}
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent font-medium block mb-3">
              Confusion Matrix (Ground Truth vs Model Verification)
            </span>
            <div className="grid grid-cols-2 gap-3.5">
              {/* True Positive */}
              <div className="p-4 rounded-md bg-emerald-50/50 border border-emerald-200/80 text-center">
                <span className="font-mono text-[10px] uppercase font-semibold text-emerald-800 tracking-wider block">
                  True Positives (TP)
                </span>
                <div className="font-serif text-3xl font-bold text-emerald-900 mt-1">
                  {confusion_matrix.true_positives}
                </div>
                <p className="text-[11px] text-emerald-800/80 mt-1 font-sans">
                  Adversarial attacks successfully detected &amp; blocked
                </p>
              </div>

              {/* False Positive */}
              <div className="p-4 rounded-md bg-amber-50/50 border border-amber-200/80 text-center">
                <span className="font-mono text-[10px] uppercase font-semibold text-amber-900 tracking-wider block">
                  False Positives (FP)
                </span>
                <div className="font-serif text-3xl font-bold text-amber-900 mt-1">
                  {confusion_matrix.false_positives}
                </div>
                <p className="text-[11px] text-amber-900/80 mt-1 font-sans">
                  Clean requests routed to Step-Up verification
                </p>
              </div>

              {/* False Negative */}
              <div className="p-4 rounded-md bg-rose-50/50 border border-rose-200/80 text-center">
                <span className="font-mono text-[10px] uppercase font-semibold text-rose-900 tracking-wider block">
                  False Negatives (FN)
                </span>
                <div className="font-serif text-3xl font-bold text-rose-900 mt-1">
                  {confusion_matrix.false_negatives}
                </div>
                <p className="text-[11px] text-rose-900/80 mt-1 font-sans">
                  Adversarial attacks missed (Target: 0)
                </p>
              </div>

              {/* True Negative */}
              <div className="p-4 rounded-md bg-muted/30 border border-border text-center">
                <span className="font-mono text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                  True Negatives (TN)
                </span>
                <div className="font-serif text-3xl font-bold text-foreground mt-1">
                  {confusion_matrix.true_negatives}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 font-sans">
                  Legitimate transactions approved without friction
                </p>
              </div>
            </div>
          </div>

          {/* Attack Breakdown Table */}
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent font-medium block mb-2.5">
              Attack Vector Detection Ledger
            </span>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/40 text-muted-foreground font-mono text-[10px] uppercase tracking-[0.12em] border-b border-border">
                  <tr>
                    <th className="p-3 font-medium">Attack Vector</th>
                    <th className="p-3 font-medium">Total Injected</th>
                    <th className="p-3 font-medium">Blocked</th>
                    <th className="p-3 font-medium">Stepped-Up</th>
                    <th className="p-3 font-medium text-right">Detection Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/80 font-mono text-[11px]">
                  {Object.entries(attack_breakdown).map(([atkName, stats]) => {
                    const total = stats.total;
                    const det = stats.blocked + stats.stepped_up;
                    const rate = total > 0 ? (det / total) * 100 : 100;
                    return (
                      <tr key={atkName} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-foreground font-sans font-medium capitalize">
                          {atkName.replace('_', ' ')}
                        </td>
                        <td className="p-3 text-muted-foreground">{total}</td>
                        <td className="p-3 text-rose-800 font-semibold">{stats.blocked}</td>
                        <td className="p-3 text-amber-800">{stats.stepped_up}</td>
                        <td className="p-3 text-right text-emerald-800 font-bold font-serif text-sm">
                          {rate.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Methodology Note */}
          <div className="p-4 rounded-md bg-muted/20 border border-border text-xs text-muted-foreground font-sans leading-relaxed">
            <strong className="text-foreground font-mono text-[10px] uppercase tracking-wider block mb-1.5">
              Evaluation Methodology &amp; Integrity:
            </strong>
            <ul className="list-disc list-inside space-y-1">
              <li>Model parameters and isolation thresholds were calibrated strictly on the 70% training split.</li>
              <li>All statistics above reflect out-of-sample performance on the held-out 30% evaluation set.</li>
              <li>No cherry-picked samples; each transaction is verifiable in the live audit ledger.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex justify-end bg-muted/20">
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
          >
            Close Matrix
          </Button>
        </div>
      </div>
    </div>
  );
};
