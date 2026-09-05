import React, { useState } from 'react';
import {
  Bot,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  ChevronRight,
  Send,
  Lock,
  UserCheck,
  Sliders,
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { apiClient } from '../api';
import { AgentExecuteResponse, PlaygroundScenario, AuditEntry, StepUpConfirmResponse } from '../types';

interface AgentPlaygroundProps {
  onTransactionExecuted: (entry: AuditEntry) => void;
  onStepUpAction?: (entry: AuditEntry) => void;
  resolvedStepUp?: StepUpConfirmResponse | null;
}


const PRESET_SCENARIOS: PlaygroundScenario[] = [
  {
    id: 'legit_keyboard',
    name: 'Legitimate IT Purchase',
    type: 'legitimate',
    tag: 'Clean Mandate',
    tagColor: 'green',
    item: 'Keychron K2 Mechanical Keyboard with brown switches',
    amount: 3400.0,
    category: 'electronics',
    merchant: 'merch_amazon_in',
    description: 'Compliant hardware purchase within Bangalore IT workstation policy.',
    isAdversarial: false,
  },
  {
    id: 'prompt_injection_gold',
    name: 'Prompt Injection Scam',
    type: 'attack',
    tag: 'Semantic Drift Attack',
    tagColor: 'red',
    item: '22K Gold Bullion Coin and 24K Gold Chain Necklace',
    amount: 25000.0,
    category: 'luxury_jewelry',
    merchant: 'merch_tanishq',
    description: 'Adversarial jailbreak attempting unauthorized precious metals exfiltration.',
    attackType: 'prompt_injection',
    isAdversarial: true,
  },
  {
    id: 'spend_cap_breach',
    name: 'Spend Cap Breach',
    type: 'limit_breach',
    tag: 'Policy Limit Breach',
    tagColor: 'red',
    item: '10x Apple MacBook Pro M3 Max 64GB Unified Memory',
    amount: 1250000.0,
    category: 'electronics',
    merchant: 'merch_croma_corp',
    description: 'Massive limit overshoot (₹12,50,000 requested vs ₹10,000 single cap).',
    attackType: 'spend_spike',
    isAdversarial: true,
  },
  {
    id: 'step_up_chair',
    name: 'Ambiguous Edge Case',
    type: 'ambiguous',
    tag: 'Near Boundary',
    tagColor: 'amber',
    item: 'Herman Miller Mirra 2 Ergonomic Workstation Chair',
    amount: 11500.0,
    category: 'office_supplies',
    merchant: 'merch_urbanladder',
    description: 'High-value furniture item exceeding single-item limit triggering human review.',
    isAdversarial: false,
  },
];

export const AgentPlayground: React.FC<AgentPlaygroundProps> = ({
  onTransactionExecuted,
  onStepUpAction,
  resolvedStepUp,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<PlaygroundScenario>(PRESET_SCENARIOS[0]);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Custom Form Fields
  const [customItem, setCustomItem] = useState('Logitech MX Master 3S Wireless Mouse');
  const [customAmount, setCustomAmount] = useState('7995');
  const [customCategory, setCustomCategory] = useState('electronics');
  const [customMerchant, setCustomMerchant] = useState('merch_amazon_in');

  // Execution State & Visualizer
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState<1 | 2 | 3 | null>(null);
  const [executionResult, setExecutionResult] = useState<AgentExecuteResponse | null>(null);
  const [currentAuditEntry, setCurrentAuditEntry] = useState<AuditEntry | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Sync when operator approves or rejects step-up in human review
  React.useEffect(() => {
    if (resolvedStepUp && executionResult && resolvedStepUp.decision_id === executionResult.decision_id) {
      setExecutionResult((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          decision: resolvedStepUp.decision,
          razorpay_order_id: resolvedStepUp.razorpay_order_id,
          reason_text: `${prev.reason_text} [${resolvedStepUp.decision === 'APPROVE' ? 'Approved' : 'Rejected'} by human operator: ${resolvedStepUp.razorpay_order_id ? 'Order ' + resolvedStepUp.razorpay_order_id : 'Settlement Blocked'}]`,
        };
      });
      setCurrentAuditEntry((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          decision: resolvedStepUp.decision,
          stepup_status: resolvedStepUp.stepup_status,
          razorpay_order_id: resolvedStepUp.razorpay_order_id,
        };
      });
    }
  }, [resolvedStepUp]);

  // Editable Mandate State
  const [mandateScope, setMandateScope] = useState({
    agentId: 'agent_blr_it_09',
    agentName: 'Claude IT Procurement Agent',
    goal: 'Procure IT accessories, ergonomic keyboards, mice, and desk gear for Bangalore engineering workstations',
    singleItemCap: 10000,
    sessionCap: 50000,
    allowedCategories: ['electronics', 'office_supplies', 'stationery'],
    whitelistedMerchants: ['merch_amazon_in', 'merch_croma_corp', 'merch_reliance_digital', 'merch_urbanladder'],
  });
  const [isEditingMandate, setIsEditingMandate] = useState(false);
  const [editSingleCap, setEditSingleCap] = useState('10000');
  const [editSessionCap, setEditSessionCap] = useState('50000');

  const handleSaveMandateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const single = Math.max(500, parseFloat(editSingleCap) || 10000);
    const session = Math.max(single, parseFloat(editSessionCap) || 50000);
    setMandateScope((prev) => ({
      ...prev,
      singleItemCap: single,
      sessionCap: session,
    }));
    setIsEditingMandate(false);
  };

  const handleSelectScenario = (scenario: PlaygroundScenario) => {
    setSelectedScenario(scenario);
    setIsCustomMode(false);
    setExecutionResult(null);
    setExecutionStep(null);
  };

  const handleRunAgentPurchase = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    setCurrentAuditEntry(null);
    setCopiedOrderId(false);

    // Step 1: Agent Dispatch
    setExecutionStep(1);

    const itemDesc = isCustomMode ? customItem : selectedScenario.item;
    const itemAmount = isCustomMode ? parseFloat(customAmount) || 1000 : selectedScenario.amount;
    const itemCat = isCustomMode ? customCategory : selectedScenario.category;
    const itemMerch = isCustomMode ? customMerchant : selectedScenario.merchant;
    const isAdv = isCustomMode ? false : Boolean(selectedScenario.isAdversarial);
    const attackType = isCustomMode ? undefined : selectedScenario.attackType;

    try {
      // Simulate rapid pipeline progression for visual clarity
      await new Promise((res) => setTimeout(res, 260));
      setExecutionStep(2); // Behavioral Gate

      const result = await apiClient.executeAgent({
        agent_id: mandateScope.agentId,
        agent_name: mandateScope.agentName,
        goal_description: mandateScope.goal,
        category_allowlist: mandateScope.allowedCategories,
        max_txn_amount: mandateScope.singleItemCap,
        max_session_total: mandateScope.sessionCap,
        item_description: itemDesc,
        amount: itemAmount,
        category: itemCat,
        merchant_id: itemMerch,
        attack_type: attackType,
        is_adversarial: isAdv,
      });

      await new Promise((res) => setTimeout(res, 220));
      setExecutionStep(3); // Razorpay Settlement / Block
      setExecutionResult(result);

      // Convert result to AuditEntry and dispatch to parent live feed
      const auditItem: AuditEntry = {
        decision_id: result.decision_id,
        request_id: `req_${result.decision_id.slice(-8)}`,
        session_id: result.session_id,
        agent_id: mandateScope.agentId,
        goal_description: mandateScope.goal,
        amount: result.amount,
        category: result.category,
        merchant_id: result.merchant_id,
        item_description: result.item_description,
        is_adversarial: isAdv,
        attack_type: attackType,
        decision: result.decision,
        stepup_status: result.decision === 'STEP_UP' ? 'PENDING' : null,
        risk_score: result.risk_score,
        reason_text: result.reason_text,
        razorpay_order_id: result.razorpay_order_id,
        feature_snapshot: result.feature_snapshot || {},
        latency_ms: result.latency_ms,
        created_at: result.created_at,
      };

      setCurrentAuditEntry(auditItem);
      onTransactionExecuted(auditItem);
    } catch (err) {
      console.error('Failed to execute agent intent:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyOrder = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Workspace Header Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent font-semibold px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
              Interactive Hero Playground
            </span>
            <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
              Zero-Trust Autonomous Purchasing
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground tracking-tight mt-1">
            AI Purchasing Agent &amp; Real-Time Trust Gate
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-muted-foreground">Gate SLA:</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 font-semibold">
            &lt; 10ms Real-Time
          </span>
        </div>
      </div>

      {/* Hero 2-Column Grid: Agent Mandate & Controls (Left 5 cols) + 3-Step Live Pipeline (Right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Agent Persona, Scenarios, and Prompt Console (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Agent Persona & Mandate Card */}
          <Card className="p-4 bg-muted/20 border-border/80 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-md bg-accent/15 text-accent flex items-center justify-center border border-accent/25 shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-serif font-semibold text-foreground text-sm flex items-center gap-1.5">
                    {mandateScope.agentName}
                    <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-card border border-border text-muted-foreground">
                      v2.4
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    ID: {mandateScope.agentId} • Autonomous Buyer
                  </div>
                </div>
              </div>
              <Badge variant="allow" className="text-[10px] py-0.5 px-2">
                Mandate Bound
              </Badge>
            </div>

            {/* Mandate Policy Parameters */}
            {!isEditingMandate ? (
              <div className="mt-3 space-y-2 text-[11px] font-mono">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Authorized Mission:</span>
                  <span className="text-foreground font-sans text-right max-w-[220px] truncate text-[11px]" title={mandateScope.goal}>
                    Bangalore IT Workstation Gear
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Item Limit / Session Cap:</span>
                  <span className="text-foreground font-semibold">
                    ₹{mandateScope.singleItemCap.toLocaleString('en-IN')} / ₹{mandateScope.sessionCap.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Allowed Categories:</span>
                  <span className="text-accent font-medium">
                    {mandateScope.allowedCategories.join(', ')}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setEditSingleCap(mandateScope.singleItemCap.toString());
                    setEditSessionCap(mandateScope.sessionCap.toString());
                    setIsEditingMandate(true);
                  }}
                  className="mt-2.5 pt-2 border-t border-border/70 flex items-center justify-center w-full text-[11px] font-mono text-accent hover:text-accent/80 hover:underline gap-1.5 transition"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Adjust Agent Budget &amp; Caps</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveMandateBudget} className="mt-3 space-y-2.5 border-t border-border/70 pt-2.5">
                <div className="text-[10px] font-mono uppercase text-accent font-semibold flex items-center justify-between">
                  <span>Edit Agent Budget Limits</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingMandate(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono text-muted-foreground uppercase">
                      Single Item Cap (₹)
                    </label>
                    <input
                      type="number"
                      value={editSingleCap}
                      onChange={(e) => setEditSingleCap(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-card border border-border text-xs font-mono focus:ring-1 focus:ring-accent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-muted-foreground uppercase">
                      Session Total (₹)
                    </label>
                    <input
                      type="number"
                      value={editSessionCap}
                      onChange={(e) => setEditSessionCap(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-card border border-border text-xs font-mono focus:ring-1 focus:ring-accent outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="submit" variant="primary" size="sm" className="text-[11px] py-1 px-3">
                    Update Budget
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* Quick Scenario Selector & Mode Toggle */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-foreground font-semibold">
                Select Agent Scenario
              </span>
              <button
                onClick={() => setIsCustomMode(!isCustomMode)}
                className="text-[11px] font-mono text-accent hover:underline flex items-center gap-1"
              >
                {isCustomMode ? 'Use Preset Scenarios' : 'Custom Prompt Console'}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {!isCustomMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_SCENARIOS.map((sc) => {
                  const isSelected = selectedScenario.id === sc.id;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => handleSelectScenario(sc)}
                      className={`p-2.5 rounded-md text-left transition-all border flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-card border-accent shadow-sm ring-1 ring-accent/30'
                          : 'bg-muted/20 border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-serif font-medium text-foreground text-xs truncate">
                          {sc.name}
                        </span>
                        <span className={`font-mono text-[9px] px-1 rounded uppercase font-semibold ${
                          sc.tagColor === 'green'
                            ? 'bg-emerald-500/15 text-emerald-800'
                            : sc.tagColor === 'red'
                            ? 'bg-rose-500/15 text-rose-800'
                            : 'bg-amber-500/15 text-amber-800'
                        }`}>
                          {sc.tagColor === 'green' ? 'Clean' : sc.tagColor === 'red' ? 'Attack' : 'Edge'}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-foreground font-semibold">
                        ₹{sc.amount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate w-full mt-0.5 font-sans">
                        {sc.item}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Custom Mode Console */
              <div className="space-y-2.5 text-xs font-sans bg-muted/15 p-3 rounded-md border border-border">
                <div>
                  <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-0.5">
                    Agent Requested Item Description
                  </label>
                  <input
                    type="text"
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-card border border-border text-xs focus:ring-1 focus:ring-accent outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-0.5">
                      Amount (₹ INR)
                    </label>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-card border border-border text-xs font-mono focus:ring-1 focus:ring-accent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-0.5">
                      Category
                    </label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-card border border-border text-xs font-mono focus:ring-1 focus:ring-accent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-muted-foreground uppercase mb-0.5">
                    Target Merchant ID
                  </label>
                  <input
                    type="text"
                    value={customMerchant}
                    onChange={(e) => setCustomMerchant(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-card border border-border text-xs font-mono focus:ring-1 focus:ring-accent outline-none"
                  />
                </div>
              </div>
            )}

            {/* Action Trigger Button */}
            <Button
              onClick={handleRunAgentPurchase}
              disabled={isExecuting}
              variant="primary"
              className="w-full font-mono text-xs py-2.5 shadow-sm mt-2"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                  <span>Agent Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-2" />
                  <span>Dispatch Agent Purchase Intent</span>
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* RIGHT COLUMN: Real-Time 3-Step Live Execution Visualizer (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="p-5 h-full flex flex-col justify-between overflow-hidden">
            <div>
              {/* Stepper Header */}
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <h3 className="font-serif font-semibold text-sm text-foreground">
                    Real-Time Autonomous Execution Pipeline
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  3-Stage Behavioral Verification
                </span>
              </div>

              {/* 3 Step Visual Nodes */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {/* Step 1 Pill */}
                <div className={`p-2.5 rounded-md border text-center transition-all ${
                  executionStep === 1
                    ? 'border-accent bg-accent/10 shadow-xs'
                    : executionStep && executionStep > 1
                    ? 'border-border bg-muted/40 text-muted-foreground'
                    : 'border-border/60 bg-muted/10 text-muted-foreground/60'
                }`}>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-accent font-semibold">
                    Step 1
                  </div>
                  <div className="font-serif text-xs font-medium mt-0.5 text-foreground">
                    Agent Dispatch
                  </div>
                </div>

                {/* Step 2 Pill */}
                <div className={`p-2.5 rounded-md border text-center transition-all ${
                  executionStep === 2
                    ? 'border-accent bg-accent/10 shadow-xs ring-1 ring-accent/40 animate-pulse'
                    : executionStep && executionStep > 2
                    ? 'border-border bg-muted/40 text-muted-foreground'
                    : 'border-border/60 bg-muted/10 text-muted-foreground/60'
                }`}>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-accent font-semibold">
                    Step 2
                  </div>
                  <div className="font-serif text-xs font-medium mt-0.5 text-foreground">
                    Trust Gate (&lt;10ms)
                  </div>
                </div>

                {/* Step 3 Pill */}
                <div className={`p-2.5 rounded-md border text-center transition-all ${
                  executionStep === 3
                    ? executionResult?.decision === 'APPROVE'
                      ? 'border-emerald-600 bg-emerald-500/10'
                      : executionResult?.decision === 'BLOCK'
                      ? 'border-rose-600 bg-rose-500/10'
                      : 'border-amber-600 bg-amber-500/10'
                    : 'border-border/60 bg-muted/10 text-muted-foreground/60'
                }`}>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-accent font-semibold">
                    Step 3
                  </div>
                  <div className="font-serif text-xs font-medium mt-0.5 text-foreground">
                    Settlement / Guard
                  </div>
                </div>
              </div>

              {/* Step Content Container */}
              <div className="space-y-4">
                {/* 1. Inbound Dispatch Payload Preview */}
                <div className="bg-muted/30 border border-border/80 rounded-md p-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/60 pb-1.5 mb-2">
                    <span className="flex items-center gap-1 text-accent font-semibold">
                      POST /v1/agent/checkout
                    </span>
                    <span>Session: {mandateScope.agentId}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase">Item</span>
                      <span className="text-foreground truncate block font-sans font-medium">
                        {isCustomMode ? customItem : selectedScenario.item}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase">Amount</span>
                      <span className="text-foreground font-semibold">
                        ₹{(isCustomMode ? parseFloat(customAmount) || 0 : selectedScenario.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase">Category</span>
                      <span className="text-foreground truncate block">
                        {isCustomMode ? customCategory : selectedScenario.category}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px] uppercase">Merchant</span>
                      <span className="text-foreground truncate block">
                        {isCustomMode ? customMerchant : selectedScenario.merchant}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Gate Evaluation Metrics (Appears when Step >= 2 or finished) */}
                {executionStep && executionStep >= 2 && (
                  <div className="bg-muted/20 border border-border rounded-md p-3.5 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between text-xs border-b border-border/60 pb-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-accent font-semibold">
                        Behavioral Multi-Signal Gate Evaluation
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                        Latency: <strong className="text-foreground font-bold">{executionResult?.latency_ms || 4}ms</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-[10px] text-muted-foreground block">Semantic Match</span>
                        <span className="font-bold text-foreground mt-0.5 block">
                          {executionResult?.feature_snapshot?.semantic_similarity !== undefined
                            ? `${(executionResult.feature_snapshot.semantic_similarity * 100).toFixed(1)}%`
                            : 'Evaluating...'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-[10px] text-muted-foreground block">Category Whitelist</span>
                        <span className={`font-bold mt-0.5 block ${
                          executionResult?.feature_snapshot?.category_in_allowlist === false
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}>
                          {executionResult?.feature_snapshot?.category_in_allowlist === false ? 'VIOLATION' : 'PASS'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-[10px] text-muted-foreground block">Risk Score</span>
                        <span className={`font-bold mt-0.5 block ${
                          (executionResult?.risk_score || 0) >= 0.70
                            ? 'text-rose-700'
                            : (executionResult?.risk_score || 0) >= 0.45
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}>
                          {executionResult?.risk_score !== undefined
                            ? executionResult.risk_score.toFixed(2)
                            : 'Calculating...'}
                        </span>
                      </div>
                    </div>

                    {executionResult?.reason_text && (
                      <p className="text-[11px] text-muted-foreground font-sans mt-1 italic leading-relaxed">
                        &ldquo;{executionResult.reason_text}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Live Razorpay Settlement or Threat Block */}
                {executionResult && (
                  <div className={`p-4 rounded-lg border text-xs transition-all animate-fade-in ${
                    executionResult.decision === 'APPROVE'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950'
                      : executionResult.decision === 'BLOCK'
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-950'
                      : 'bg-amber-500/10 border-amber-500/40 text-amber-950'
                  }`}>
                    {executionResult.decision === 'APPROVE' ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-700" />
                            <span className="font-serif font-bold text-sm text-emerald-900">
                              {resolvedStepUp && resolvedStepUp.decision_id === executionResult.decision_id
                                ? 'Approved by Human Operator & Minted on Razorpay'
                                : 'Approved & Minted on Razorpay'}
                            </span>
                          </div>
                          <Badge variant="allow">
                            {resolvedStepUp && resolvedStepUp.decision_id === executionResult.decision_id ? 'RESOLVED' : 'SETTLED'}
                          </Badge>
                        </div>

                        <div className="mt-2.5 bg-card/80 p-2.5 rounded border border-border flex items-center justify-between font-mono text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground block uppercase">
                              Razorpay Order ID
                            </span>
                            <span className="font-bold text-foreground text-xs">
                              {executionResult.razorpay_order_id}
                            </span>
                          </div>
                          <Button
                            onClick={() => handleCopyOrder(executionResult.razorpay_order_id || '')}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                          >
                            {copiedOrderId ? (
                              <Check className="w-3 h-3 text-emerald-600 mr-1" />
                            ) : (
                              <Copy className="w-3 h-3 mr-1 text-accent" />
                            )}
                            <span>{copiedOrderId ? 'Copied' : 'Copy'}</span>
                          </Button>
                        </div>

                        <div className="mt-2 text-[10px] text-muted-foreground font-mono flex items-center justify-between">
                          <span>Amount: ₹{executionResult.amount.toLocaleString('en-IN')}</span>
                          <span>Receipt: {executionResult.order_receipt?.receipt || 'rcpt_sentinel_live'}</span>
                          <span>Latency: {executionResult.latency_ms}ms</span>
                        </div>
                      </div>
                    ) : executionResult.decision === 'BLOCK' ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <ShieldAlert className="w-5 h-5 text-rose-700" />
                            <span className="font-serif font-bold text-sm text-rose-900">
                              {resolvedStepUp && resolvedStepUp.decision_id === executionResult.decision_id
                                ? 'Rejected by Human Operator & Settlement Blocked'
                                : 'Threat Intercepted & Settlement Blocked'}
                            </span>
                          </div>
                          <Badge variant="block">
                            {resolvedStepUp && resolvedStepUp.decision_id === executionResult.decision_id ? 'REJECTED' : 'GATED'}
                          </Badge>
                        </div>
                        <p className="text-xs text-rose-900 font-sans mt-1">
                          {resolvedStepUp && resolvedStepUp.decision_id === executionResult.decision_id
                            ? 'Settlement was rejected by operator during step-up review. Razorpay Orders API was not called.'
                            : `Settlement was aborted in ${executionResult.latency_ms}ms. Razorpay Orders API was not called.`}
                        </p>
                        <div className="mt-2 pt-2 border-t border-rose-200/50 flex justify-between font-mono text-[11px] text-rose-900">
                          <span>Volume Protected:</span>
                          <strong className="font-bold">₹{executionResult.amount.toLocaleString('en-IN')} Saved</strong>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-5 h-5 text-amber-700" />
                            <span className="font-serif font-bold text-sm text-amber-900">
                              Step-Up Human-In-The-Loop Escalation
                            </span>
                          </div>
                          <Badge variant="step_up">REVIEW</Badge>
                        </div>
                        <p className="text-xs text-amber-900 font-sans mt-1">
                          Transaction held at decision threshold. Operator approval required before Razorpay settlement.
                        </p>
                        {currentAuditEntry && (
                          <Button
                            onClick={() => onStepUpAction?.(currentAuditEntry)}
                            variant="primary"
                            size="sm"
                            className="mt-3 bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs w-full shadow-xs flex items-center justify-center py-2"
                          >
                            <UserCheck className="w-4 h-4 mr-1.5" />
                            <span>Resolve Step-Up Now (Human Review &amp; Settle)</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Default Idle State if no execution yet */}
                {!executionStep && (
                  <div className="py-8 text-center text-muted-foreground font-sans text-xs border border-dashed border-border rounded-md bg-muted/10">
                    <ShoppingBag className="w-6 h-6 mx-auto mb-2 text-accent/60" />
                    <p className="font-medium text-foreground">Playground Ready</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Select a scenario on the left or customize your own prompt, then click &ldquo;Dispatch Agent Purchase Intent&rdquo;.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Visualizer Footer Guarantee */}
            <div className="border-t border-border/80 pt-3 mt-4 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-accent" /> Zero-Trust Gate
              </span>
              <span>Sub-10ms Behavioral Interception</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
