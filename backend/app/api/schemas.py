from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime


class SessionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    agent_id: str = Field(..., json_schema_extra={"example": "claude_purchaser_agent_1"})
    goal_description: str = Field(
        ...,
        json_schema_extra={
            "example": "Purchase office stationery, notebooks, pens, and whiteboard marker supplies for the engineering floor"
        },
    )
    category_allowlist: List[str] = Field(
        ..., json_schema_extra={"example": ["stationery", "office_supplies", "printing"]}
    )
    max_txn_amount: float = Field(..., gt=0, json_schema_extra={"example": 2500.0})
    max_session_total: float = Field(..., gt=0, json_schema_extra={"example": 8000.0})
    expected_request_count: int = Field(default=5, ge=1, json_schema_extra={"example": 5})


class SessionResponse(BaseModel):
    session_id: str
    agent_id: str
    goal_description: str
    category_allowlist: List[str]
    max_txn_amount: float
    max_session_total: float
    expected_request_count: int
    created_at: datetime


class EvaluateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    session_id: str
    amount: float = Field(..., gt=0, json_schema_extra={"example": 650.0})
    category: str = Field(..., json_schema_extra={"example": "stationery"})
    merchant_id: str = Field(..., json_schema_extra={"example": "merch_amazon_in"})
    item_description: str = Field(
        ..., json_schema_extra={"example": "Pack of 12 Pilot G2 0.7mm black gel pens"}
    )
    is_adversarial: Optional[bool] = False
    attack_type: Optional[str] = None


class EvaluateResponse(BaseModel):
    decision_id: str
    session_id: str
    decision: str  # APPROVE | STEP_UP | BLOCK
    risk_score: float
    reason_text: str
    razorpay_order_id: Optional[str] = None
    top_contributing_factors: Dict[str, float]
    feature_snapshot: Dict[str, Any]
    latency_ms: int
    created_at: datetime


class StepUpConfirmRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    approved: bool = Field(..., json_schema_extra={"example": True})
    reviewer_notes: Optional[str] = Field(
        default="Human operator confirmed genuine purchase",
        json_schema_extra={"example": "Approved via dashboard review"},
    )


class StepUpConfirmResponse(BaseModel):
    decision_id: str
    decision: str
    stepup_status: str  # CONFIRMED | REJECTED
    razorpay_order_id: Optional[str] = None
    message: str


class AuditEntryResponse(BaseModel):
    decision_id: str
    request_id: str
    session_id: str
    agent_id: Optional[str] = None
    goal_description: Optional[str] = None
    amount: float
    category: str
    merchant_id: str
    item_description: str
    is_adversarial: bool
    attack_type: Optional[str] = None
    decision: str
    stepup_status: Optional[str] = None
    risk_score: float
    reason_text: str
    razorpay_order_id: Optional[str] = None
    feature_snapshot: Dict[str, Any]
    latency_ms: int
    created_at: datetime


class SimulatorRunRequest(BaseModel):
    num_sessions: int = Field(default=20, ge=1, le=200)
    target_requests: int = Field(default=100, ge=10, le=1000)
    adversarial_ratio: float = Field(default=0.20, ge=0.0, le=1.0)


class AgentExecuteRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    agent_id: Optional[str] = "claude_procurement_bot"
    agent_name: Optional[str] = "Claude IT Procurement Agent"
    goal_description: str = "Procure IT accessories, ergonomic keyboards, mice, and desk gear for Bangalore engineering workstations"
    category_allowlist: List[str] = ["electronics", "office_supplies", "stationery"]
    max_txn_amount: float = 10000.0
    max_session_total: float = 50000.0
    item_description: str
    amount: float
    category: str
    merchant_id: str
    attack_type: Optional[str] = None
    is_adversarial: Optional[bool] = False


class AgentExecuteResponse(BaseModel):
    decision_id: str
    session_id: str
    decision: str  # APPROVE | STEP_UP | BLOCK
    risk_score: float
    reason_text: str
    razorpay_order_id: Optional[str] = None
    top_contributing_factors: Dict[str, float]
    feature_snapshot: Dict[str, Any]
    latency_ms: int
    item_description: str
    amount: float
    merchant_id: str
    category: str
    agent_name: str
    order_receipt: Optional[Dict[str, Any]] = None
    created_at: datetime


class RazorpayConfigRequest(BaseModel):
    key_id: str
    key_secret: str
    mock_mode: bool = False


class RazorpayConfigResponse(BaseModel):
    key_id_masked: str
    mock_mode: bool
    is_live_test_api: bool
    message: str

