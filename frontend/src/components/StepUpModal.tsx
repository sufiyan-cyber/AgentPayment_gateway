import React, { useState } from 'react';
import { AuditEntry } from '../types';
import { AlertTriangle, X, Check, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface StepUpModalProps {
  entry: AuditEntry | null;
  onClose: () => void;
  onConfirm: (decisionId: string, approved: boolean, notes?: string) => Promise<void>;
}

export const StepUpModal: React.FC<StepUpModalProps> = ({ entry, onClose, onConfirm }) => {
  const [notes, setNotes] = useState('Reviewed by merchant operator: genuine business request');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  if (!entry) return null;

  const handleAction = async (approved: boolean) => {
    setIsSubmitting(true);
    setActionType(approved ? 'approve' : 'reject');
    try {
      await onConfirm(entry.decision_id, approved, notes);
      onClose();
    } finally {
      setIsSubmitting(false);
      setActionType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-xs animate-fade-in">
      <div className="bg-card border border-border border-t-2 border-t-accent rounded-lg w-full max-w-lg overflow-hidden shadow-lg">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-accent/15 text-accent border border-accent/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-lg text-foreground">
                Human-in-the-Loop Step-Up Review
              </h3>
              <p className="text-xs text-muted-foreground font-sans">
                Borderline transaction flagged for merchant operator verification
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
        <div className="p-6 space-y-4 text-xs">
          <div className="p-4 rounded-md bg-muted/20 border border-border space-y-2.5 font-sans">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Item:</span>
              <span className="font-serif font-semibold text-foreground text-sm">{entry.item_description}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Amount:</span>
              <span className="font-serif font-bold text-foreground text-base">
                ₹{entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Merchant / Category:</span>
              <span className="font-mono text-foreground">{entry.merchant_id} ({entry.category})</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Mandate Goal:</span>
              <span className="text-foreground text-right max-w-xs">{entry.goal_description || 'Office Procurement'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-md bg-amber-50/80 border border-amber-300/80 text-amber-950 font-sans leading-relaxed">
            <strong className="block text-amber-900 font-mono text-[10px] uppercase tracking-wider mb-1">Flag Reason:</strong>
            {entry.reason_text}
          </div>

          <div>
            <label className="block text-foreground font-medium text-xs mb-1.5 font-sans">
              Reviewer Notes (Logged to Permanent Audit Trail):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-11 px-3.5 rounded-md bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition duration-150"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20">
          <Button
            onClick={() => handleAction(false)}
            disabled={isSubmitting}
            variant="outline"
            size="sm"
            className="border-rose-300 text-rose-800 hover:bg-rose-50 font-mono text-xs"
          >
            {isSubmitting && actionType === 'reject' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>Blocking Order...</span>
              </>
            ) : (
              <span>Reject (Block Order)</span>
            )}
          </Button>

          <Button
            onClick={() => handleAction(true)}
            disabled={isSubmitting}
            variant="primary"
            size="sm"
            className="font-mono text-xs"
          >
            {isSubmitting && actionType === 'approve' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-white" />
                <span>Authorizing Razorpay...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1.5" />
                <span>Confirm &amp; Settle via Razorpay</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
