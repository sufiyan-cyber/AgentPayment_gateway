import React from 'react';
import { AuditEntry } from '../types';
import { X, ShieldCheck, ShieldAlert, AlertTriangle, Clock, FileText, Database } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface AuditDetailModalProps {
  entry: AuditEntry | null;
  onClose: () => void;
}

export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({ entry, onClose }) => {
  if (!entry) return null;

  const isApproved = entry.decision === 'APPROVE';
  const isStepUp = entry.decision === 'STEP_UP';

  const factors = entry.feature_snapshot || {};
  const semanticSim = factors.semantic_similarity ?? 0.0;
  const velocityZ = factors.velocity_zscore ?? 0.0;
  const singleRatio = factors.single_txn_ratio ?? 0.0;
  const spendRatio = factors.cumulative_session_spend_ratio ?? 0.0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-xs animate-fade-in">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-lg">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-muted text-foreground border border-border">
              {isApproved ? (
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              ) : isStepUp ? (
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-700" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="font-serif font-semibold text-lg text-foreground">
                  Audit Trail Decision Record
                </h3>
                {isApproved && <Badge variant="allow">APPROVE</Badge>}
                {isStepUp && <Badge variant="step_up">STEP_UP</Badge>}
                {!isApproved && !isStepUp && <Badge variant="block">BLOCK</Badge>}
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {entry.decision_id}</p>
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
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Reason Box */}
          <div className="p-4 rounded-md bg-muted/30 border border-border">
            <div className="flex items-center text-muted-foreground font-mono text-[11px] uppercase tracking-wider mb-1.5">
              <FileText className="w-3.5 h-3.5 mr-1 text-accent" />
              Reasoning &amp; Policy Explanation
            </div>
            <p className="text-foreground text-sm leading-relaxed font-sans">
              {entry.reason_text}
            </p>
          </div>

          {/* Declared Mandate vs Request */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left: Transaction Request */}
            <div className="p-4 rounded-md bg-card border border-border space-y-2.5 shadow-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent font-medium block">
                Transaction Request
              </span>
              <div>
                <span className="text-muted-foreground">Item:</span>{' '}
                <span className="text-foreground font-medium">{entry.item_description}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>{' '}
                <span className="text-foreground font-serif font-semibold text-sm">
                  ₹{entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Category:</span>{' '}
                <span className="text-foreground font-mono">{entry.category}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Merchant:</span>{' '}
                <span className="text-foreground font-mono">{entry.merchant_id}</span>
              </div>
            </div>

            {/* Right: Declared Mandate */}
            <div className="p-4 rounded-md bg-card border border-border space-y-2.5 shadow-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent font-medium block">
                Authorized Mandate Bounds
              </span>
              <div>
                <span className="text-muted-foreground">Goal:</span>{' '}
                <span className="text-foreground">{entry.goal_description || 'General Corporate Procurement'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Allowlist:</span>{' '}
                <span className={`font-mono font-medium ${factors.category_in_allowlist ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {factors.category_in_allowlist ? 'Authorized (Compliant)' : 'FORBIDDEN (Violation)'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Session Cap Ratio:</span>{' '}
                <span className="text-foreground font-mono">{(spendRatio * 100).toFixed(1)}% of cap</span>
              </div>
            </div>
          </div>

          {/* Risk Scoring Breakdown */}
          <div className="p-4 rounded-md bg-card border border-border shadow-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium block mb-3">
              Behavioral Risk Vector Breakdown
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded border border-border bg-muted/20">
                <span className="font-mono text-[10px] text-muted-foreground uppercase block">Semantic Match</span>
                <span className="font-serif text-base font-semibold text-foreground mt-0.5 block">
                  {(semanticSim * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-2.5 rounded border border-border bg-muted/20">
                <span className="font-mono text-[10px] text-muted-foreground uppercase block">Single Txn Ratio</span>
                <span className="font-serif text-base font-semibold text-foreground mt-0.5 block">
                  {(singleRatio * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-2.5 rounded border border-border bg-muted/20">
                <span className="font-mono text-[10px] text-muted-foreground uppercase block">Velocity Z-Score</span>
                <span className="font-serif text-base font-semibold text-foreground mt-0.5 block">
                  {velocityZ.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded border border-border bg-muted/20">
                <span className="font-mono text-[10px] text-muted-foreground uppercase block">Overall Risk</span>
                <span className={`font-serif text-base font-semibold mt-0.5 block ${
                  entry.risk_score >= 0.70 ? 'text-rose-700' :
                  entry.risk_score >= 0.45 ? 'text-amber-700' : 'text-emerald-700'
                }`}>
                  {entry.risk_score.toFixed(3)}
                </span>
              </div>
            </div>
          </div>

          {/* Razorpay Integration Info */}
          <div className="p-3.5 rounded-md bg-accent-muted border border-accent/30 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Database className="w-4 h-4 text-accent" />
              <div>
                <span className="text-foreground font-serif font-medium block">Razorpay Test-Mode Orders API</span>
                <span className="text-muted-foreground text-xs">
                  {entry.razorpay_order_id
                    ? `Order created and attached: ${entry.razorpay_order_id}`
                    : 'Order not created (Risk gate blocked settlement)'}
                </span>
              </div>
            </div>
            <div className="text-right font-mono text-xs text-muted-foreground">
              <Clock className="w-3 h-3 inline mr-1 text-accent" />
              {entry.latency_ms}ms added latency
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex justify-end bg-muted/20">
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
          >
            Close Audit Record
          </Button>
        </div>
      </div>
    </div>
  );
};
