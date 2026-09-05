import pytest
from app.services.semantic import semantic_engine
from app.services.features import feature_extractor
from app.services.state_tracker import state_tracker


def test_semantic_similarity_matching():
    session_id = "test_sess_stationery"
    goal = "Purchase office stationery, notebooks, pens, and whiteboard markers"
    semantic_engine.register_goal(session_id, goal)

    # Clean item
    sim_clean = semantic_engine.compute_similarity(
        session_id, goal, "Pack of 12 Pilot G2 black gel pens and whiteboard markers"
    )
    assert sim_clean > 0.40, f"Expected high similarity for matching item, got {sim_clean}"

    # Adversarial / Drift item
    sim_drift = semantic_engine.compute_similarity(
        session_id, goal, "Sony PlayStation 5 DualSense Wireless Controller"
    )
    assert sim_drift < 0.20, f"Expected low similarity for drift item, got {sim_drift}"


def test_feature_extraction_allowlist():
    session_id = "test_sess_feat"
    goal = "Order catering lunch and sandwiches for 10 people"
    allowlist = ["food_beverage", "catering"]

    state_tracker.reset_session(session_id)

    # In allowlist
    feat_valid = feature_extractor.extract_features(
        session_id=session_id,
        goal_description=goal,
        category_allowlist=allowlist,
        max_txn_amount=2000.0,
        max_session_total=6000.0,
        expected_request_count=4,
        amount=1200.0,
        category="catering",
        merchant_id="merch_swiggy",
        item_description="Assorted gourmet sandwiches platter for lunch",
    )
    assert feat_valid["category_in_allowlist"] is True
    assert feat_valid["single_txn_ratio"] == 0.6
    assert feat_valid["semantic_similarity"] > 0.3

    # Outside allowlist
    feat_invalid = feature_extractor.extract_features(
        session_id=session_id,
        goal_description=goal,
        category_allowlist=allowlist,
        max_txn_amount=2000.0,
        max_session_total=6000.0,
        expected_request_count=4,
        amount=1500.0,
        category="electronics",
        merchant_id="merch_amazon",
        item_description="Wireless noise cancelling headphones",
    )
    assert feat_invalid["category_in_allowlist"] is False
