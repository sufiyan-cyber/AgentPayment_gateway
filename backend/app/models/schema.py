import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.models.database import Base


def generate_uuid():
    return str(uuid.uuid4())


def utc_now():
    return datetime.now(timezone.utc)


class SessionModel(Base):
    __tablename__ = "sessions"

    session_id = Column(String(36), primary_key=True, default=generate_uuid)
    agent_id = Column(String(100), nullable=False)
    goal_description = Column(Text, nullable=False)
    category_allowlist = Column(JSON, nullable=False, default=list)  # List of allowed categories
    max_txn_amount = Column(Float, nullable=False)
    max_session_total = Column(Float, nullable=False)
    expected_request_count = Column(Integer, default=5)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    requests = relationship("RequestModel", back_populates="session", cascade="all, delete-orphan")


class RequestModel(Base):
    __tablename__ = "requests"

    request_id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.session_id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(100), nullable=False)
    merchant_id = Column(String(100), nullable=False)
    item_description = Column(Text, nullable=False)
    is_adversarial = Column(Boolean, default=False)
    attack_type = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    session = relationship("SessionModel", back_populates="requests")
    decision = relationship("DecisionModel", back_populates="request", uselist=False, cascade="all, delete-orphan")


class DecisionModel(Base):
    __tablename__ = "decisions"

    decision_id = Column(String(36), primary_key=True, default=generate_uuid)
    request_id = Column(String(36), ForeignKey("requests.request_id", ondelete="CASCADE"), nullable=False)
    risk_score = Column(Float, nullable=False)
    feature_snapshot = Column(JSON, nullable=False, default=dict)
    decision = Column(String(20), nullable=False)  # APPROVE | STEP_UP | BLOCK
    stepup_status = Column(String(20), nullable=True)  # PENDING | CONFIRMED | REJECTED (when decision is STEP_UP)
    reason_text = Column(Text, nullable=False)
    razorpay_order_id = Column(String(100), nullable=True)
    latency_ms = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    request = relationship("RequestModel", back_populates="decision")
