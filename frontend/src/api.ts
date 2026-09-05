import axios from 'axios';
import {
  MetricsSummary,
  AuditEntry,
  SessionData,
  AgentExecuteRequest,
  AgentExecuteResponse,
  StepUpConfirmResponse,
  RazorpayConfigResponse,
  RazorpayConfigRequest,
} from './types';

const API_BASE = '/api';

export const apiClient = {
  async getMetrics(): Promise<MetricsSummary> {
    const res = await axios.get<MetricsSummary>(`${API_BASE}/metrics`);
    return res.data;
  },

  async runBenchmark(): Promise<MetricsSummary> {
    const res = await axios.post<MetricsSummary>(`${API_BASE}/benchmark/run`, {
      num_sessions: 120,
      target_requests: 1000,
    });
    return res.data;
  },

  async getAuditLogs(limit: number = 50, filter?: string): Promise<AuditEntry[]> {
    const params: Record<string, any> = { limit };
    if (filter) params.decision_filter = filter;
    const res = await axios.get<AuditEntry[]>(`${API_BASE}/audit`, { params });
    return res.data;
  },

  async getAuditDetail(decisionId: string): Promise<AuditEntry> {
    const res = await axios.get<AuditEntry>(`${API_BASE}/audit/${decisionId}`);
    return res.data;
  },

  async getSessions(): Promise<SessionData[]> {
    const res = await axios.get<SessionData[]>(`${API_BASE}/sessions`);
    return res.data;
  },

  async triggerSample(attackType?: string): Promise<any> {
    const params = attackType ? { attack_type: attackType } : {};
    const res = await axios.post(`${API_BASE}/simulator/trigger-sample`, null, { params });
    return res.data;
  },

  async confirmStepUp(decisionId: string, approved: boolean, notes?: string): Promise<StepUpConfirmResponse> {
    const res = await axios.post<StepUpConfirmResponse>(`${API_BASE}/stepup/${decisionId}/confirm`, {
      approved,
      reviewer_notes: notes || (approved ? 'Confirmed by human reviewer in dashboard' : 'Rejected by human reviewer in dashboard'),
    });
    return res.data;
  },

  async executeAgent(payload: AgentExecuteRequest): Promise<AgentExecuteResponse> {
    const res = await axios.post<AgentExecuteResponse>(`${API_BASE}/agent/execute`, payload);
    return res.data;
  },

  async getRazorpayConfig(): Promise<RazorpayConfigResponse> {
    const res = await axios.get<RazorpayConfigResponse>(`${API_BASE}/razorpay/config`);
    return res.data;
  },

  async updateRazorpayConfig(payload: RazorpayConfigRequest): Promise<RazorpayConfigResponse> {
    const res = await axios.post<RazorpayConfigResponse>(`${API_BASE}/razorpay/config`, payload);
    return res.data;
  },
};

