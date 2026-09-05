import pytest
from app.services.policy_gate import DecisionPolicyGate


def test_hard_block_over_amount():
    gate = DecisionPolicyGate(t_stepup=0.45, t_block=0.70)
    features = {
        "category_in_allowlist": True,
        "semantic_similarity": 0.9,
        "velocity_zscore": 0.1,
        "spend_overage_ratio": 0.0,
        "single_overage_ratio": 0.5,
    }

    decision, risk_score, reason, factors, is_hard = gate.evaluate(
        features=features,
        max_txn_amount=1000.0,
        max_session_total=5000.0,
        category_allowlist=["stationery"],
        goal_description="Purchase stationery",
        item_description="Bulk paper",
        category="stationery",
        amount=1500.0,  # exceeds 1000.0
    )

    assert decision == "BLOCK"
    assert is_hard is True
    assert "exceeds max per-transaction cap" in reason


def test_hard_block_forbidden_category():
    gate = DecisionPolicyGate(t_stepup=0.45, t_block=0.70)
    features = {
        "category_in_allowlist": False,
        "semantic_similarity": 0.8,
        "velocity_zscore": 0.1,
        "spend_overage_ratio": 0.0,
        "single_overage_ratio": 0.0,
    }

    decision, risk_score, reason, factors, is_hard = gate.evaluate(
        features=features,
        max_txn_amount=1000.0,
        max_session_total=5000.0,
        category_allowlist=["stationery"],
        goal_description="Purchase stationery",
        item_description="Nintendo Switch Game",
        category="gaming",
        amount=500.0,
    )

    assert decision == "BLOCK"
    assert is_hard is True
    assert "outside the authorized allowlist" in reason


def test_approve_clean_transaction():
    gate = DecisionPolicyGate(t_stepup=0.45, t_block=0.70)
    features = {
        "category_in_allowlist": True,
        "semantic_similarity": 0.95,
        "velocity_zscore": 0.0,
        "spend_overage_ratio": 0.0,
        "single_overage_ratio": 0.0,
        "single_txn_ratio": 0.3,
        "amount_delta_from_expected": 0.0,
        "cumulative_session_spend_ratio": 0.3,
        "novelty_score": 0.0,
    }

    decision, risk_score, reason, factors, is_hard = gate.evaluate(
        features=features,
        max_txn_amount=1000.0,
        max_session_total=5000.0,
        category_allowlist=["stationery"],
        goal_description="Purchase office stationery pens and markers",
        item_description="Pack of blue ballpoint pens",
        category="stationery",
        amount=300.0,
    )

    assert decision == "APPROVE"
    assert is_hard is False
    assert risk_score < 0.45
    assert "APPROVED" in reason
