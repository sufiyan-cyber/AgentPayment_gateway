export type DecisionType = 'APPROVE' | 'STEP_UP' | 'BLOCK';
export type StepUpStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface StepUpConfirmResponse {
  decision_id: string;
  decision: DecisionType;
  stepup_status: StepUpStatus;
  razorpay_order_id?: string | null;
  message: string;
}

export interface AuditEntry {
  decision_id: string;
  request_id: string;
  session_id: string;
  agent_id?: string;
  goal_description?: string;
  amount: number;
  category: string;
  merchant_id: string;
  item_description: string;
  is_adversarial: boolean;
  attack_type?: string | null;
  decision: DecisionType;
  stepup_status?: StepUpStatus | null;
  risk_score: number;
  reason_text: string;
  razorpay_order_id?: string | null;
  feature_snapshot: Record<string, any>;
  latency_ms: number;
  created_at: string;
}

export interface MetricsSummary {
  summary: {
    total_eval_requests: number;
    total_train_requests: number;
    precision: number;
    recall: number;
    f1_score: number;
    accuracy: number;
  };
  confusion_matrix: {
    true_positives: number;
    false_positives: number;
    true_negatives: number;
    false_negatives: number;
  };
  latency: {
    avg_ms: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
    sla_target_ms: number;
    sla_compliance_percent: number;
  };
  financial_volume: {
    total_requested_inr: number;
    approved_inr: number;
    blocked_inr: number;
    stepped_up_inr: number;
    adversarial_prevented_inr: number;
  };
  attack_breakdown: Record<
    string,
    {
      total: number;
      blocked: number;
      stepped_up: number;
      approved: number;
    }
  >;
  false_positive_showcase?: AuditEntry | null;
}

export interface SessionData {
  session_id: string;
  agent_id: string;
  goal_description: string;
  category_allowlist: string[];
  max_txn_amount: number;
  max_session_total: number;
  expected_request_count: number;
  created_at: string;
}

export interface AgentExecuteRequest {
  agent_id?: string;
  agent_name?: string;
  goal_description: string;
  category_allowlist: string[];
  max_txn_amount: number;
  max_session_total: number;
  item_description: string;
  amount: number;
  category: string;
  merchant_id: string;
  attack_type?: string | null;
  is_adversarial?: boolean;
}

export interface AgentExecuteResponse {
  decision_id: string;
  session_id: string;
  decision: DecisionType;
  risk_score: number;
  reason_text: string;
  razorpay_order_id?: string | null;
  top_contributing_factors: Record<string, number>;
  feature_snapshot: Record<string, any>;
  latency_ms: number;
  item_description: string;
  amount: number;
  merchant_id: string;
  category: string;
  agent_name: string;
  order_receipt?: Record<string, any> | null;
  created_at: string;
}

export interface RazorpayConfigResponse {
  key_id_masked: string;
  mock_mode: boolean;
  is_live_test_api: boolean;
  message: string;
}

export interface RazorpayConfigRequest {
  key_id: string;
  key_secret: string;
  mock_mode: boolean;
}

export interface PlaygroundScenario {
  id: string;
  name: string;
  type: 'legitimate' | 'attack' | 'limit_breach' | 'ambiguous';
  tag: string;
  tagColor: 'green' | 'red' | 'amber';
  item: string;
  amount: number;
  category: string;
  merchant: string;
  description: string;
  attackType?: string;
  isAdversarial?: boolean;
}

