import time
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.database import get_db
from app.models.schema import SessionModel, RequestModel, DecisionModel
from app.api.schemas import (
    SessionCreateRequest,
    SessionResponse,
    EvaluateRequest,
    EvaluateResponse,
    StepUpConfirmRequest,
    StepUpConfirmResponse,
    AuditEntryResponse,
    SimulatorRunRequest,
    AgentExecuteRequest,
    AgentExecuteResponse,
    RazorpayConfigRequest,
    RazorpayConfigResponse,
)
from app.services.semantic import semantic_engine
from app.services.features import feature_extractor
from app.services.policy_gate import policy_gate
from app.services.razorpay_client import razorpay_service
from app.services.evaluator import evaluator_service
from app.services.dataset_generator import MANDATE_TEMPLATES

router = APIRouter()


@router.post("/session", response_model=SessionResponse, status_code=201)
def create_session(payload: SessionCreateRequest, db: Session = Depends(get_db)):
    """Registers an AI agent session and its declared mandate."""
    session = SessionModel(
        agent_id=payload.agent_id,
        goal_description=payload.goal_description,
        category_allowlist=payload.category_allowlist,
        max_txn_amount=payload.max_txn_amount,
        max_session_total=payload.max_session_total,
        expected_request_count=payload.expected_request_count,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Pre-cache goal vector for sub-millisecond semantic similarity evaluation
    semantic_engine.register_goal(session.session_id, session.goal_description)

    return session


@router.get("/sessions", response_model=List[SessionResponse])
def list_sessions(limit: int = 20, db: Session = Depends(get_db)):
    """Lists registered agent sessions."""
    sessions = db.query(SessionModel).order_by(desc(SessionModel.created_at)).limit(limit).all()
    return sessions


@router.post("/evaluate", response_model=EvaluateResponse)
def evaluate_transaction(payload: EvaluateRequest, db: Session = Depends(get_db)):
    """
    Real-time behavioral trust gate (<300ms SLA).
    Scores transaction against declared session mandate, gates decision (APPROVE | STEP_UP | BLOCK),
    and creates Razorpay test-mode order on approval.
    """
    t_start = time.perf_counter()

    # 1. Fetch Session Mandate
    session = db.query(SessionModel).filter(SessionModel.session_id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {payload.session_id} not found")

    # 2. Extract Multi-Dimensional Features
    features = feature_extractor.extract_features(
        session_id=session.session_id,
        goal_description=session.goal_description,
        category_allowlist=session.category_allowlist,
        max_txn_amount=session.max_txn_amount,
        max_session_total=session.max_session_total,
        expected_request_count=session.expected_request_count,
        amount=payload.amount,
        category=payload.category,
        merchant_id=payload.merchant_id,
        item_description=payload.item_description,
    )

    # 3. Policy Gate Evaluation
    decision, risk_score, reason_text, top_factors, is_hard = policy_gate.evaluate(
        features=features,
        max_txn_amount=session.max_txn_amount,
        max_session_total=session.max_session_total,
        category_allowlist=session.category_allowlist,
        goal_description=session.goal_description,
        item_description=payload.item_description,
        category=payload.category,
        amount=payload.amount,
    )

    # 4. Action Execution (Razorpay test-mode Order if approved)
    razorpay_order_id = None
    stepup_status = None

    if decision == "APPROVE":
        order_res = razorpay_service.create_order(
            amount=payload.amount,
            session_id=session.session_id,
            item_description=payload.item_description,
            merchant_id=payload.merchant_id,
        )
        razorpay_order_id = order_res.get("order_id")
    elif decision == "STEP_UP":
        stepup_status = "PENDING"

    # Latency calculation in integer ms
    latency_ms = max(1, int((time.perf_counter() - t_start) * 1000))

    # 5. Persist Request & Decision to Database
    req_record = RequestModel(
        session_id=session.session_id,
        amount=payload.amount,
        category=payload.category,
        merchant_id=payload.merchant_id,
        item_description=payload.item_description,
        is_adversarial=payload.is_adversarial or False,
        attack_type=payload.attack_type,
    )
    db.add(req_record)
    db.flush()

    dec_record = DecisionModel(
        request_id=req_record.request_id,
        risk_score=risk_score,
        feature_snapshot=features,
        decision=decision,
        stepup_status=stepup_status,
        reason_text=reason_text,
        razorpay_order_id=razorpay_order_id,
        latency_ms=latency_ms,
    )
    db.add(dec_record)
    db.commit()
    db.refresh(dec_record)

    return EvaluateResponse(
        decision_id=dec_record.decision_id,
        session_id=session.session_id,
        decision=decision,
        risk_score=risk_score,
        reason_text=reason_text,
        razorpay_order_id=razorpay_order_id,
        top_contributing_factors=top_factors,
        feature_snapshot=features,
        latency_ms=latency_ms,
        created_at=dec_record.created_at,
    )


@router.post("/stepup/{decision_id}/confirm", response_model=StepUpConfirmResponse)
def confirm_stepup(
    decision_id: str,
    payload: StepUpConfirmRequest,
    db: Session = Depends(get_db),
):
    """
    Simulates human confirmation for a STEP_UP decision.
    If confirmed by operator, generates a real Razorpay test-mode Order.
    """
    decision = db.query(DecisionModel).filter(DecisionModel.decision_id == decision_id).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    if decision.stepup_status in ("CONFIRMED", "REJECTED"):
        raise HTTPException(
            status_code=400,
            detail=f"Decision {decision_id} is already resolved as {decision.stepup_status}",
        )

    if decision.decision != "STEP_UP" and not decision.stepup_status:
        raise HTTPException(
            status_code=400,
            detail=f"Decision {decision_id} is '{decision.decision}', not STEP_UP",
        )

    req = decision.request

    if payload.approved:
        # Create Razorpay order on human confirmation
        order_res = razorpay_service.create_order(
            amount=req.amount,
            session_id=req.session_id,
            item_description=req.item_description,
            merchant_id=req.merchant_id,
        )
        decision.decision = "APPROVE"
        decision.stepup_status = "CONFIRMED"
        decision.razorpay_order_id = order_res.get("order_id")
        decision.reason_text += f" [RESOLVED: Confirmed by operator: {payload.reviewer_notes}]"
        db.commit()

        return StepUpConfirmResponse(
            decision_id=decision.decision_id,
            decision="APPROVE",
            stepup_status="CONFIRMED",
            razorpay_order_id=decision.razorpay_order_id,
            message="Step-up transaction approved by human reviewer. Razorpay test-order generated.",
        )
    else:
        decision.decision = "BLOCK"
        decision.stepup_status = "REJECTED"
        decision.reason_text += f" [RESOLVED: Rejected by operator: {payload.reviewer_notes}]"
        db.commit()

        return StepUpConfirmResponse(
            decision_id=decision.decision_id,
            decision="BLOCK",
            stepup_status="REJECTED",
            razorpay_order_id=None,
            message="Step-up transaction rejected by human reviewer. Settlement blocked.",
        )


@router.get("/metrics")
def get_metrics():
    """
    Returns benchmark precision, recall, F1, confusion matrix,
    added decision latency, and financial volume protected on held-out dataset.
    """
    return evaluator_service.get_metrics()


@router.post("/benchmark/run")
def run_benchmark(payload: Optional[SimulatorRunRequest] = None):
    """Triggers dataset generation, clean baseline fitting, and held-out evaluation."""
    num_sessions = payload.num_sessions if payload else 120
    target_requests = payload.target_requests if payload else 1000
    metrics = evaluator_service.run_pipeline(
        num_sessions=num_sessions, target_requests=target_requests
    )
    return metrics


@router.get("/audit", response_model=List[AuditEntryResponse])
def get_audit_log(
    limit: int = Query(50, ge=1, le=200),
    decision_filter: Optional[str] = Query(None, pattern="^(APPROVE|STEP_UP|BLOCK)$"),
    db: Session = Depends(get_db),
):
    """Returns the immutable audit trail of agent purchase evaluations."""
    query = db.query(DecisionModel).join(RequestModel).join(SessionModel)
    if decision_filter:
        if decision_filter == "STEP_UP":
            query = query.filter((DecisionModel.decision == "STEP_UP") | (DecisionModel.stepup_status.isnot(None)))
        else:
            query = query.filter(DecisionModel.decision == decision_filter)

    decisions = query.order_by(desc(DecisionModel.created_at)).limit(limit).all()

    audit_entries = []
    for d in decisions:
        r = d.request
        s = r.session if r else None
        audit_entries.append(
            AuditEntryResponse(
                decision_id=d.decision_id,
                request_id=r.request_id if r else "",
                session_id=r.session_id if r else "",
                agent_id=s.agent_id if s else None,
                goal_description=s.goal_description if s else None,
                amount=r.amount if r else 0.0,
                category=r.category if r else "",
                merchant_id=r.merchant_id if r else "",
                item_description=r.item_description if r else "",
                is_adversarial=r.is_adversarial if r else False,
                attack_type=r.attack_type if r else None,
                decision=d.decision,
                stepup_status=d.stepup_status,
                risk_score=d.risk_score,
                reason_text=d.reason_text,
                razorpay_order_id=d.razorpay_order_id,
                feature_snapshot=d.feature_snapshot or {},
                latency_ms=d.latency_ms,
                created_at=d.created_at,
            )
        )

    return audit_entries


@router.get("/audit/{decision_id}", response_model=AuditEntryResponse)
def get_audit_detail(decision_id: str, db: Session = Depends(get_db)):
    """Returns full audit snapshot and reasoning for a specific decision."""
    d = db.query(DecisionModel).filter(DecisionModel.decision_id == decision_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Audit decision not found")

    r = d.request
    s = r.session if r else None

    return AuditEntryResponse(
        decision_id=d.decision_id,
        request_id=r.request_id if r else "",
        session_id=r.session_id if r else "",
        agent_id=s.agent_id if s else None,
        goal_description=s.goal_description if s else None,
        amount=r.amount if r else 0.0,
        category=r.category if r else "",
        merchant_id=r.merchant_id if r else "",
        item_description=r.item_description if r else "",
        is_adversarial=r.is_adversarial if r else False,
        attack_type=r.attack_type if r else None,
        decision=d.decision,
        stepup_status=d.stepup_status,
        risk_score=d.risk_score,
        reason_text=d.reason_text,
        razorpay_order_id=d.razorpay_order_id,
        feature_snapshot=d.feature_snapshot or {},
        latency_ms=d.latency_ms,
        created_at=d.created_at,
    )


@router.post("/simulator/trigger-sample")
def trigger_simulator_sample(
    attack_type: Optional[str] = Query(None, description="Optional attack type: category_swap, spend_spike, velocity_burst, semantic_drift, session_hijack, or None for clean"),
    db: Session = Depends(get_db),
):
    """
    Generates and processes a sample transaction directly into the trust gate
    for interactive live demo streaming and manual attack injection testing.
    """
    template = random.choice(MANDATE_TEMPLATES)
    
    # 1. Ensure or create a test session
    session = (
        db.query(SessionModel)
        .filter(SessionModel.goal_description == template["goal_description"])
        .first()
    )
    if not session:
        session = SessionModel(
            agent_id=f"agent_sim_{random.choice(['claude_purchaser', 'ops_bot', 'procure_ai'])}",
            goal_description=template["goal_description"],
            category_allowlist=template["category_allowlist"],
            max_txn_amount=template["max_txn_amount"],
            max_session_total=template["max_session_total"],
            expected_request_count=template["expected_request_count"],
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        semantic_engine.register_goal(session.session_id, session.goal_description)

    # 2. Pick item (Clean or Adversarial)
    if attack_type and attack_type in template["adversarial_items"]:
        adv_pool = template["adversarial_items"][attack_type]
        item_desc, amount, category, merch = random.choice(adv_pool)
        is_adv = True
        req_attack = attack_type
    else:
        item_desc, amount, category, merch = random.choice(template["clean_items"])
        amount = round(amount * random.uniform(0.92, 1.08), 2)
        is_adv = False
        req_attack = None

    eval_req = EvaluateRequest(
        session_id=session.session_id,
        amount=amount,
        category=category,
        merchant_id=merch,
        item_description=item_desc,
        is_adversarial=is_adv,
        attack_type=req_attack,
    )

    return evaluate_transaction(eval_req, db)


@router.post("/agent/execute", response_model=AgentExecuteResponse)
def execute_agent_intent(payload: AgentExecuteRequest, db: Session = Depends(get_db)):
    """
    Simulates or executes an autonomous AI purchasing agent action against the MandateSentinel trust gate.
    Returns the real-time evaluation trace, decision, policy breakdown, and minted Razorpay test order.
    """
    t_start = time.perf_counter()

    # 1. Retrieve or initialize the Agent Session Mandate
    session = (
        db.query(SessionModel)
        .filter(
            (SessionModel.agent_id == (payload.agent_id or "claude_procurement_bot"))
            | (SessionModel.goal_description == payload.goal_description)
        )
        .first()
    )

    if not session:
        session = SessionModel(
            agent_id=payload.agent_id or "claude_procurement_bot",
            goal_description=payload.goal_description,
            category_allowlist=payload.category_allowlist,
            max_txn_amount=payload.max_txn_amount,
            max_session_total=payload.max_session_total,
            expected_request_count=10,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        semantic_engine.register_goal(session.session_id, session.goal_description)
    else:
        # Keep limits in sync with test console
        session.category_allowlist = payload.category_allowlist
        session.max_txn_amount = payload.max_txn_amount
        session.max_session_total = payload.max_session_total
        db.commit()
        semantic_engine.register_goal(session.session_id, session.goal_description)

    # 2. Multi-Dimensional Feature Extraction (<2ms)
    features = feature_extractor.extract_features(
        session_id=session.session_id,
        goal_description=session.goal_description,
        category_allowlist=session.category_allowlist,
        max_txn_amount=session.max_txn_amount,
        max_session_total=session.max_session_total,
        expected_request_count=session.expected_request_count,
        amount=payload.amount,
        category=payload.category,
        merchant_id=payload.merchant_id,
        item_description=payload.item_description,
    )

    # 3. Behavioral Policy Gate Evaluation (<5ms)
    decision, risk_score, reason_text, top_factors, is_hard = policy_gate.evaluate(
        features=features,
        max_txn_amount=session.max_txn_amount,
        max_session_total=session.max_session_total,
        category_allowlist=session.category_allowlist,
        goal_description=session.goal_description,
        item_description=payload.item_description,
        category=payload.category,
        amount=payload.amount,
    )

    # 4. Action Settlement Dispatch (Razorpay Test Orders API)
    razorpay_order_id = None
    order_receipt = None
    stepup_status = None

    if decision == "APPROVE":
        order_res = razorpay_service.create_order(
            amount=payload.amount,
            session_id=session.session_id,
            item_description=payload.item_description,
            merchant_id=payload.merchant_id,
        )
        razorpay_order_id = order_res.get("order_id")
        order_receipt = order_res.get("raw_response")
    elif decision == "STEP_UP":
        stepup_status = "PENDING"

    latency_ms = max(1, int((time.perf_counter() - t_start) * 1000))

    # 5. Persist Immutable Request & Decision Record
    req_record = RequestModel(
        session_id=session.session_id,
        amount=payload.amount,
        category=payload.category,
        merchant_id=payload.merchant_id,
        item_description=payload.item_description,
        is_adversarial=payload.is_adversarial or False,
        attack_type=payload.attack_type,
    )
    db.add(req_record)
    db.flush()

    dec_record = DecisionModel(
        request_id=req_record.request_id,
        risk_score=risk_score,
        feature_snapshot=features,
        decision=decision,
        stepup_status=stepup_status,
        reason_text=reason_text,
        razorpay_order_id=razorpay_order_id,
        latency_ms=latency_ms,
    )
    db.add(dec_record)
    db.commit()
    db.refresh(dec_record)

    return AgentExecuteResponse(
        decision_id=dec_record.decision_id,
        session_id=session.session_id,
        decision=decision,
        risk_score=risk_score,
        reason_text=reason_text,
        razorpay_order_id=razorpay_order_id,
        top_contributing_factors=top_factors,
        feature_snapshot=features,
        latency_ms=latency_ms,
        item_description=payload.item_description,
        amount=payload.amount,
        merchant_id=payload.merchant_id,
        category=payload.category,
        agent_name=payload.agent_name or "Claude IT Procurement Agent",
        order_receipt=order_receipt,
        created_at=dec_record.created_at,
    )


@router.get("/razorpay/config", response_model=RazorpayConfigResponse)
def get_razorpay_config():
    """Returns the current Razorpay test credentials status."""
    status = razorpay_service.get_status()
    return RazorpayConfigResponse(
        key_id_masked=status["key_id_masked"],
        mock_mode=status["mock_mode"],
        is_live_test_api=status["is_live_test_api"],
        message=status["message"],
    )


@router.post("/razorpay/config", response_model=RazorpayConfigResponse)
def update_razorpay_config(payload: RazorpayConfigRequest):
    """Updates Razorpay test mode credentials and verifies live connection."""
    res = razorpay_service.configure(
        key_id=payload.key_id,
        key_secret=payload.key_secret,
        mock_mode=payload.mock_mode,
    )
    return RazorpayConfigResponse(
        key_id_masked=res["key_id_masked"],
        mock_mode=res["mock_mode"],
        is_live_test_api=res["is_live_test_api"],
        message=res["message"],
    )
