import React from 'react';
import { AuditEntry } from '../types';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface FalsePositiveCardProps {
  showcaseEntry: AuditEntry | null;
  onOpenDetail: (entry: AuditEntry) => void;
}

export const FalsePositiveCard: React.FC<FalsePositiveCardProps> = ({
  showcaseEntry,
  onOpenDetail,
}) => {
  return (
    <Card featured className="p-6 h-full flex flex-col justify-between border-l-4 border-l-accent">
      <div>
        <div className="flex items-start justify-between gap-2 border-b border-border/80 pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded bg-accent/15 text-accent shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                Conversion Safeguard &amp; Step-Up
              </h3>
              <p className="text-xs text-muted-foreground font-sans">
                Human-in-the-loop protection against false rejects
              </p>
            </div>
          </div>
          <Badge variant="accent" className="shrink-0">
            Human-In-The-Loop
          </Badge>
        </div>

        <p className="text-xs sm:text-sm text-foreground/85 font-sans leading-relaxed">
          Traditional rules flatly reject borderline transactions, causing costly cart abandonment. MandateSentinel isolates ambiguous purchases and routes them to an instant <strong>Operator Step-Up Challenge</strong>. Once approved, the order seamlessly settles via Razorpay.
        </p>

        {showcaseEntry && (
          <div className="mt-4 p-4 rounded-md bg-card border border-border space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[10px] uppercase tracking-wider text-accent font-medium">
                Live Borderline Case
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                Status: <strong className="text-amber-700">PENDING STEP-UP</strong>
              </span>
            </div>

            <div>
              <div className="font-serif text-sm font-semibold text-foreground">
                {showcaseEntry.item_description}
              </div>
              <div className="text-muted-foreground text-xs mt-0.5 font-mono">
                Goal: {showcaseEntry.goal_description || 'Office Supplies'} • Amount: <strong className="text-foreground">₹{showcaseEntry.amount}</strong>
              </div>
            </div>

            <Button
              onClick={() => onOpenDetail(showcaseEntry)}
              variant="outline"
              size="sm"
              className="w-full justify-center"
            >
              <span>Inspect Step-Up Audit Record</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-accent" />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <span>Conversion Impact: <strong className="text-emerald-800">Zero Drop-Off</strong></span>
        <span>Resolution SLA: <strong className="text-foreground">&lt;60s</strong></span>
      </div>
    </Card>
  );
};
