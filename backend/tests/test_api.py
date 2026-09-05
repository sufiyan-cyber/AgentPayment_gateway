import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.database import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_session_and_evaluate():
    # 1. Create Session
    session_payload = {
        "agent_id": "test_agent_claude_1",
        "goal_description": "Purchase office stationery, printing paper, and desk organizers",
        "category_allowlist": ["stationery", "office_supplies", "printing"],
        "max_txn_amount": 3000.0,
        "max_session_total": 10000.0,
        "expected_request_count": 5,
    }
    s_res = client.post("/api/session", json=session_payload)
    assert s_res.status_code == 201
    s_data = s_res.json()
    session_id = s_data["session_id"]
    assert session_id is not None

    # 2. Evaluate Clean Request
    eval_payload = {
        "session_id": session_id,
        "amount": 850.0,
        "category": "stationery",
        "merchant_id": "merch_amazon_in",
        "item_description": "Pack of 10 pilot gel ink pens and sticky notes",
    }
    e_res = client.post("/api/evaluate", json=eval_payload)
    assert e_res.status_code == 200
    e_data = e_res.json()
    assert e_data["decision"] == "APPROVE"
    assert e_data["razorpay_order_id"] is not None
    assert e_data["latency_ms"] < 300  # Sub-300ms SLA

    # 3. Evaluate Adversarial Category Swap Request
    adv_payload = {
        "session_id": session_id,
        "amount": 25000.0,
        "category": "luxury_jewelry",
        "merchant_id": "merch_tanishq",
        "item_description": "22K Gold Chain Necklace",
        "is_adversarial": True,
        "attack_type": "category_swap",
    }
    adv_res = client.post("/api/evaluate", json=adv_payload)
    assert adv_res.status_code == 200
    adv_data = adv_res.json()
    assert adv_data["decision"] == "BLOCK"
    assert adv_data["razorpay_order_id"] is None


def test_metrics_endpoint():
    res = client.get("/api/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "confusion_matrix" in data
    assert "latency" in data
    assert "financial_volume" in data
    assert data["summary"]["precision"] >= 0.80
    assert data["summary"]["recall"] >= 0.80


def test_audit_endpoint():
    res = client.get("/api/audit?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


def test_agent_execute_legitimate():
    payload = {
        "agent_id": "test_claude_procurement_bot",
        "agent_name": "Claude IT Procurement Agent",
        "goal_description": "Procure IT accessories, ergonomic keyboards, mice, and desk gear for Bangalore engineering workstations",
        "category_allowlist": ["electronics", "office_supplies", "stationery"],
        "max_txn_amount": 10000.0,
        "max_session_total": 50000.0,
        "item_description": "Keychron K2 Mechanical Keyboard with brown switches",
        "amount": 3400.0,
        "category": "electronics",
        "merchant_id": "merch_amazon_in",
        "is_adversarial": False,
    }
    res = client.post("/api/agent/execute", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == "APPROVE"
    assert data["razorpay_order_id"] is not None
    assert data["order_receipt"] is not None
    assert data["latency_ms"] < 300


def test_agent_execute_prompt_injection_blocked():
    payload = {
        "agent_id": "test_claude_procurement_bot",
        "agent_name": "Claude IT Procurement Agent",
        "goal_description": "Procure IT accessories, ergonomic keyboards, mice, and desk gear for Bangalore engineering workstations",
        "category_allowlist": ["electronics", "office_supplies", "stationery"],
        "max_txn_amount": 10000.0,
        "max_session_total": 50000.0,
        "item_description": "22K Gold Bullion Coin and Gold Chain",
        "amount": 25000.0,
        "category": "luxury_jewelry",
        "merchant_id": "merch_tanishq",
        "attack_type": "prompt_injection",
        "is_adversarial": True,
    }
    res = client.post("/api/agent/execute", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == "BLOCK"
    assert data["razorpay_order_id"] is None


def test_razorpay_config_endpoints():
    get_res = client.get("/api/razorpay/config")
    assert get_res.status_code == 200
    data = get_res.json()
    assert "key_id_masked" in data
    assert "mock_mode" in data

    post_res = client.post(
        "/api/razorpay/config",
        json={
            "key_id": "rzp_test_mock_sandbox",
            "key_secret": "mock_secret_key",
            "mock_mode": True,
        },
    )
    assert post_res.status_code == 200
    post_data = post_res.json()
    assert post_data["mock_mode"] is True


def test_stepup_approval_and_rejection():
    # 1. Trigger borderline overage to produce STEP_UP
    payload = {
        "agent_id": "test_claude_procurement_bot",
        "agent_name": "Claude IT Procurement Agent",
        "goal_description": "Procure IT accessories, ergonomic keyboards, mice, and desk gear for Bangalore engineering workstations",
        "category_allowlist": ["electronics", "office_supplies", "stationery"],
        "max_txn_amount": 10000.0,
        "max_session_total": 50000.0,
        "item_description": "Herman Miller Mirra 2 Ergonomic Workstation Chair",
        "amount": 11500.0,  # 15% over single cap (<= 25% threshold)
        "category": "office_supplies",
        "merchant_id": "merch_urbanladder",
        "is_adversarial": False,
    }
    exec_res = client.post("/api/agent/execute", json=payload)
    assert exec_res.status_code == 200
    exec_data = exec_res.json()
    assert exec_data["decision"] == "STEP_UP"
    assert exec_data["razorpay_order_id"] is None
    decision_id = exec_data["decision_id"]

    # 2. Confirm step-up with approval
    confirm_res = client.post(
        f"/api/stepup/{decision_id}/confirm",
        json={"approved": True, "reviewer_notes": "Approved for senior lead"},
    )
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["decision"] == "APPROVE"
    assert confirm_data["stepup_status"] == "CONFIRMED"
    assert confirm_data["razorpay_order_id"] is not None

    # 3. Duplicate resolution should be rejected
    dup_res = client.post(
        f"/api/stepup/{decision_id}/confirm",
        json={"approved": False, "reviewer_notes": "Duplicate check"},
    )
    assert dup_res.status_code == 400

    # 4. Trigger second step-up to test rejection
    exec_res2 = client.post("/api/agent/execute", json=payload)
    assert exec_res2.status_code == 200
    decision_id_2 = exec_res2.json()["decision_id"]

    reject_res = client.post(
        f"/api/stepup/{decision_id_2}/confirm",
        json={"approved": False, "reviewer_notes": "Over budget denied"},
    )
    assert reject_res.status_code == 200
    reject_data = reject_res.json()
    assert reject_data["decision"] == "BLOCK"
    assert reject_data["stepup_status"] == "REJECTED"
    assert reject_data["razorpay_order_id"] is None


