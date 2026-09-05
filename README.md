# MandateSentinel — Real-Time Behavioral Trust Gate for Agentic Commerce

> [!IMPORTANT]
> **DEFENSE-ONLY VERIFIER NOTICE:**
> MandateSentinel is strictly a defense-only verifier designed to protect merchants and payment gateways from compromised or drifting AI purchasing agents. It contains **no offense-capable tools**, no authorization bypass mechanisms, and no agent identity spoofing utilities. It verifies inbound transactions against declared mandate parameters and cannot be repurposed as an attacker tool.

**Track:** AI Risk Manager (Track 2) / AI Growth & Agentic Commerce Enabler (Track 1)  
**One-liner:** A real-time behavioral trust gate that sits between an inbound AI purchasing agent and a merchant's Razorpay checkout, deciding in under **10ms** (well below the 300ms SLA budget), with a 100% audit trail, whether to **APPROVE**, **STEP-UP**, or **BLOCK** each transaction based on whether it is consistent with the agent's authorized mandate.

---

## 1. Problem Statement

Agentic commerce today relies on **static controls**: consent-based pre-authorization, spend caps (e.g. UPI Reserve Pay), and upfront authentication. While these controls stop an agent from spending *more* than allowed, they fail to verify whether a specific transaction is *the right purchase*:
- An agent can remain under its spend cap, pass authentication, and still buy the wrong item due to **semantic drift**, **prompt injection**, or **session hijack**.
- Traditional fraud detection systems are tuned to human velocity and miss agent-driven throughput (e.g., 50 legitimate rapid API calls look normal to velocity filters).
- When a rogue transaction occurs today, the **merchant eats the liability**, forcing payment networks to cap agent limits artificially low.

**MandateSentinel is the behavioral verification layer that answers: *"Does this purchase match what this agent was authorized to do?"***

---

## 2. Benchmark Results on Held-Out Test Set (30% Split)

All metrics below are measured on a strictly held-out synthetic test set of agent transactions across diverse domains (Office Procurement, Catering, Cloud Infrastructure, Corporate Travel):

| Metric | Measured Value | Buildathon SLA / Target | Status |
|---|---|---|---|
| **Precision** | **90.48%** | $\ge 85.0\%$ | **EXCEEDED** |
| **Recall** | **100.00%** | $\ge 85.0\%$ | **PERFECT (Zero Missed Attacks)** |
| **F1 Score** | **0.9500** | $\ge 0.85$ | **EXCEEDED** |
| **Accuracy** | **98.73%** | $\ge 90.0\%$ | **EXCEEDED** |
| **Average Latency** | **9.49 ms** | $< 300 \text{ ms}$ | **30x Faster than SLA** |
| **p95 Latency** | **18.01 ms** | $< 300 \text{ ms}$ | **EXCEEDED** |
| **p99 Latency** | **21.44 ms** | $< 300 \text{ ms}$ | **EXCEEDED** |
| **SLA Compliance** | **100.0%** | $100\%$ | **COMPLIANT** |
| **Adversarial Volume Blocked** | **₹368,450.00** | — | **100% Protected** |

### Confusion Matrix (Held-Out Test Set)

```
                    ┌─────────────────────────┬─────────────────────────┐
                    │ Predicted: RISK / BLOCK │ Predicted: APPROVE      │
┌───────────────────┼─────────────────────────┼─────────────────────────┤
│ Actual: ATTACK    │  True Positive  (TP): 19│  False Negative (FN): 0 │
├───────────────────┼─────────────────────────┼─────────────────────────┤
│ Actual: CLEAN     │  False Positive (FP): 2 │  True Negative (TN): 136│
└───────────────────┴─────────────────────────┴─────────────────────────┘
```
*Note: False Positives are routed gracefully to Human-in-the-Loop Step-Up review rather than silent drops, preserving merchant sales.*

---

## 3. System Architecture

```mermaid
flowchart LR
    subgraph AgenticCommerce["Inbound AI Purchasing Agents"]
        Agent["Autonomous Agent / Claude Agent SDK"]
        Sim["Agent Simulator (Clean & 5 Attack Types)"]
    end

    subgraph MandateSentinel["MandateSentinel Trust Gate (<300ms SLA)"]
        SessionStore["Session & Mandate Store (Postgres / Redis)"]
        FeatExt["Feature Extraction Service
        - Semantic Distance
        - Allowlist Check
        - Velocity Z-Score
        - Cumulative Spend Ratio"]
        
        Scorer["Risk Scoring Engine
        - Hard Rule Filters
        - Isolation Forest Anomaly Model
        - Multi-Signal Weighted Risk"]
        
        Gate{"Decision Policy Gate"}
        AuditLog["Immutable Audit Trail & Reason Generator"]
    end

    subgraph External["External Settlement & Admin"]
        RazorpayAPI["Razorpay Test-Mode Orders API (rzp_test_...)"]
        HumanReview["Step-Up Human Confirmation Modal"]
        Dashboard["React Admin & Risk Intelligence Dashboard"]
    end

    Agent -->|1. Register Mandate| SessionStore
    Sim -->|2. Transaction Request| FeatExt
    SessionStore --> FeatExt
    FeatExt --> Scorer
    Scorer --> Gate

    Gate -->|APPROVE (score < T_stepup)| RazorpayAPI
    Gate -->|STEP_UP (T_stepup <= score < T_block)| HumanReview
    Gate -->|BLOCK (score >= T_block or hard_block)| AuditLog

    HumanReview -->|Confirm| RazorpayAPI
    HumanReview -->|Deny| AuditLog
    RazorpayAPI --> AuditLog
    AuditLog --> Dashboard
```

---

## 4. The 5 Defended Attack Vectors

1. **Semantic Drift:**  
   The requested item deviates from the session's stated goal despite using a valid category and merchant ID (e.g. buying a luxury gaming console under an "office stationery" goal). Detected via sub-millisecond semantic cosine embeddings.
2. **Spend Spike:**  
   Single purchase amount or cumulative session total exceeds authorized financial caps. Triggered instantly by financial boundary rules.
3. **Velocity Burst:**  
   Rapid burst of automated replay requests (simulating agent hijacking or runaway retry loops). Detected via rolling-window rate counters and statistical velocity z-scores.
4. **Category Swap:**  
   Purchasing items in forbidden categories (e.g., consumer electronics or jewelry) through a permitted merchant ID. Gated by hard category allowlists.
5. **Session Hijack:**  
   Mid-session goal change or unauthorized prompt injection redirecting the agent to acquire digital gift cards or untraceable goods.

---

## 5. Razorpay Integration

MandateSentinel connects directly to **Razorpay's Test-Mode Orders API**:
- When an agent transaction is **APPROVED**, MandateSentinel calls `client.order.create({...})` using the official `razorpay` Python SDK and attaches the returned `order_id` to the audit log record.
- When an agent transaction is **STEPPED-UP**, an operator can review the flag in the dashboard. Confirming the request immediately triggers the Razorpay order creation.
- When **BLOCKED**, no order is dispatched to Razorpay, preventing settlement and liability.
- Includes a zero-setup mock fallback mode (`RAZORPAY_MOCK_MODE=true`) for instant offline evaluation.

---

## 6. Tech Stack

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2, scikit-learn (Isolation Forest), Razorpay Python SDK, Redis / In-Memory State Tracker.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Database:** PostgreSQL (production / Docker) + SQLite (zero-setup local fallback).
- **Packaging:** Docker & Docker Compose.

---

## 7. Quickstart & Running

### Option A: Docker Compose (One-Command Startup)

```bash
# 1. Clone repository
git clone https://github.com/your-username/MandateSentinel.git
cd MandateSentinel

# 2. Start API, Frontend, Postgres, and Redis
docker compose up --build
```
- **React Dashboard:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option B: Local Development (Instant Zero-Docker Setup)

#### 1. Backend:
```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run benchmark evaluation CLI
python backend/benchmark.py

# Option 1 (Recommended - works from any folder):
python run.py

# Option 2 (From project root A:\Agentpayment):
uvicorn app.main:app --app-dir backend --reload --port 8000

# Option 3 (If already inside A:\Agentpayment\backend):
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 8. Running the Test Suite

```bash
pytest backend/tests/ -v
```
Runs 9 comprehensive unit and integration tests covering semantic similarity, feature extraction, policy gates, API endpoints, and Razorpay order workflows.

---

## 9. 5-Minute Demo Video Script Guide

1. **0:00–0:45 (The Gap):** Explain how static spend caps leave merchants vulnerable to rogue agent purchases and prompt injection.
2. **0:45–1:30 (Architecture):** Walk through the 5-step pipeline: Semantic Vectorizer $\to$ Isolation Forest $\to$ Policy Gate $\to$ Razorpay Test Order.
3. **1:30–3:00 (Live Run):** Trigger clean transactions and show generated Razorpay order IDs; inject a Semantic Drift attack and show it blocked with human-readable reasoning; demonstrate resolving a Step-Up challenge.
4. **3:00–4:00 (Honest Held-Out Numbers):** Present the 90.5% Precision, 100% Recall, and 9.49ms Latency benchmarks on the 30% held-out test split.
5. **4:00–5:00 (Business Impact):** Position MandateSentinel as Agent Buyer Protection — the trust layer enabling Razorpay to safely increase agent spend limits and unlock agentic commerce.

---

## 10. License

Apache 2.0. Defense-only security and risk verification tool for agentic payments.
