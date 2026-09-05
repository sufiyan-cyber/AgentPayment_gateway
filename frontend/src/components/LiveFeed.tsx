import React, { useState } from 'react';
import { AuditEntry, DecisionType } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  Clock,
  UserCheck,
  Search,
  Check,
  X,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface LiveFeedProps {
  entries: AuditEntry[];
  onSelectEntry: (entry: AuditEntry) => void;
  onStepUpAction: (entry: AuditEntry) => void;
}

export const LiveFeed: React.FC<LiveFeedProps> = ({
  entries,
  onSelectEntry,
  onStepUpAction,
}) => {
  const [filter, setFilter] = useState<'ALL' | DecisionType>('ALL');
  const [search, setSearch] = useState('');

  const filteredEntries = entries.filter((e) => {
    if (filter === 'APPROVE' && e.decision !== 'APPROVE') return false;
    if (filter === 'BLOCK' && e.decision !== 'BLOCK') return false;
    if (filter === 'STEP_UP' && !(e.decision === 'STEP_UP' || e.stepup_status !== null)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.item_description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.merchant_id.toLowerCase().includes(q) ||
        (e.razorpay_order_id && e.razorpay_order_id.toLowerCase().includes(q)) ||
        (e.reason_text && e.reason_text.toLowerCase().includes(q))
      );
    }
    return true;
  });


  return (
    <Card className="overflow-hidden">
      {/* Header & Filter Toolbar */}
      <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="font-serif text-lg font-semibold text-foreground tracking-tight">
              Live Decision Ledger &amp; Audit Trail
            </h2>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-border bg-card text-muted-foreground">
              {entries.length} txns
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-sans">
            Real-time behavioral trust evaluation on inbound AI agent transactions.
          </p>
        </div>

        {/* Filter Buttons & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search items, merchants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-3.5 py-2 h-9 sm:h-10 rounded-md bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent w-52 sm:w-64 transition duration-150"
            />
          </div>

          <div className="flex rounded-md bg-muted/60 p-1 border border-border text-xs font-mono h-9 sm:h-10 items-center">
            {(['ALL', 'APPROVE', 'STEP_UP', 'BLOCK'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-full px-3 py-1 rounded transition text-[11px] font-medium tracking-wide flex items-center justify-center ${
                  filter === f
                    ? 'bg-card text-foreground shadow-sm border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'ALL' ? 'All' : f === 'APPROVE' ? 'Approved' : f === 'STEP_UP' ? 'Step-Up' : 'Blocked'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Editorial Table */}
      <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-muted/40 sticky top-0 z-10 text-muted-foreground border-b border-border font-mono text-[10px] uppercase tracking-[0.14em]">
            <tr>
              <th className="py-3 px-5 font-medium">Time / Decision</th>
              <th className="py-3 px-5 font-medium">Item &amp; Mandate Match</th>
              <th className="py-3 px-5 font-medium">Category &amp; Merchant</th>
              <th className="py-3 px-5 font-medium">Amount</th>
              <th className="py-3 px-5 font-medium">Risk &amp; Latency</th>
              <th className="py-3 px-5 font-medium">Razorpay Order</th>
              <th className="py-3 px-5 font-medium text-right">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80 font-sans">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-muted-foreground font-sans text-sm">
                  No transactions recorded yet. Trigger a sample above or run the benchmark.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry, index) => {
                const isApproved = entry.decision === 'APPROVE';
                const isStepUp = entry.decision === 'STEP_UP';
                const isBlocked = entry.decision === 'BLOCK';
                const isLatest = index === 0;

                return (
                  <tr
                    key={entry.decision_id}
                    onClick={() => onSelectEntry(entry)}
                    className={`hover:bg-muted/30 transition-colors duration-150 cursor-pointer group ${
                      isLatest ? 'bg-accent/5 animate-pulse duration-1000' : ''
                    }`}
                  >
                    {/* Decision Badge & Time */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isApproved && (
                          <Badge variant="allow" icon={<ShieldCheck className="w-3 h-3 text-emerald-700" />}>
                            {entry.stepup_status === 'CONFIRMED' ? 'APPROVE (HUMAN)' : 'APPROVE'}
                          </Badge>
                        )}
                        {isStepUp && (
                          <Badge variant="step_up" icon={<AlertTriangle className="w-3 h-3 text-amber-800" />}>
                            {entry.stepup_status === 'PENDING' ? 'STEP_UP (PENDING)' : 'STEP_UP'}
                          </Badge>
                        )}
                        {isBlocked && (
                          <Badge variant="block" icon={<ShieldAlert className="w-3 h-3 text-rose-800" />}>
                            {entry.stepup_status === 'REJECTED' ? 'BLOCK (HUMAN)' : 'BLOCK'}
                          </Badge>
                        )}
                        {isLatest && (
                          <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-accent/20 text-accent font-semibold tracking-wider">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-1">
                        {new Date(entry.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>

                    {/* Item Description & Attack Indicator */}
                    <td className="py-4 px-5 max-w-xs">
                      <div className="font-serif font-medium text-foreground text-xs sm:text-sm truncate" title={entry.item_description}>
                        {entry.item_description}
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        {entry.is_adversarial ? (
                          <span className="font-mono text-[10px] text-rose-800 font-medium px-1 rounded bg-rose-50 border border-rose-200/60 uppercase tracking-wider">
                            Attack: {entry.attack_type || 'adversarial'}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-emerald-800 font-medium tracking-wide">
                            Mandate Clean
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category & Merchant */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="text-foreground font-mono text-[11px] font-medium">{entry.category}</div>
                      <div className="text-muted-foreground text-[10px] truncate max-w-[130px] font-mono">{entry.merchant_id}</div>
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-5 whitespace-nowrap font-serif font-semibold text-foreground text-sm">
                      ₹{entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Risk Score & Latency */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-14 bg-muted rounded-full h-1.5 overflow-hidden border border-border">
                          <div
                            className={`h-full rounded-full transition-all ${
                              entry.risk_score >= 0.70
                                ? 'bg-rose-700'
                                : entry.risk_score >= 0.45
                                ? 'bg-amber-600'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${Math.min(100, entry.risk_score * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-medium text-foreground">
                          {entry.risk_score.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center text-[10px] text-muted-foreground font-mono mt-0.5">
                        <Clock className="w-2.5 h-2.5 mr-1 text-accent" />
                        {entry.latency_ms}ms
                      </div>
                    </td>

                    {/* Razorpay Test Order */}
                    <td className="py-4 px-5 whitespace-nowrap font-mono text-[11px]">
                      {entry.razorpay_order_id ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                          {entry.razorpay_order_id}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 text-[10px] italic">Settlement Gated</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-5 whitespace-nowrap text-right">
                      {isStepUp && entry.stepup_status === 'PENDING' ? (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStepUpAction(entry);
                          }}
                          variant="primary"
                          size="sm"
                          className="text-[11px] font-bold py-1 px-2.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                        >
                          <UserCheck className="w-3 h-3 mr-1" />
                          Resolve
                        </Button>
                      ) : entry.stepup_status === 'CONFIRMED' ? (
                        <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 inline-flex items-center">
                          <Check className="w-3 h-3 mr-1" /> Settled
                        </span>
                      ) : entry.stepup_status === 'REJECTED' ? (
                        <span className="font-mono text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/80 inline-flex items-center">
                          <X className="w-3 h-3 mr-1" /> Blocked
                        </span>
                      ) : (
                        <span className="text-muted-foreground group-hover:text-accent font-mono text-[11px] transition inline-flex items-center">
                          Audit <ExternalLink className="w-3 h-3 ml-1" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
