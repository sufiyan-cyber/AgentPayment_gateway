from typing import Dict, Any, Tuple
from app.config import settings
from app.services.anomaly_detector import anomaly_detector


class DecisionPolicyGate:
    """
    Policy gate that evaluates feature snapshots against hard rule boundaries,
    multi-signal ML risk scores, and tunable decision thresholds (T_stepup, T_block).
    Generates explainable human-readable audit reasons.
    """

    def __init__(
        self,
        t_stepup: float = None,
        t_block: float = None,
        w_semantic: float = None,
        w_anomaly: float = None,
        w_velocity: float = None,
        w_spend: float = None,
    ):
        self.t_stepup = t_stepup or settings.T_STEPUP
        self.t_block = t_block or settings.T_BLOCK
        self.w_semantic = w_semantic or settings.WEIGHT_SEMANTIC
        self.w_anomaly = w_anomaly or settings.WEIGHT_ANOMALY
        self.w_velocity = w_velocity or settings.WEIGHT_VELOCITY
        self.w_spend = w_spend or settings.WEIGHT_SPEND

    def evaluate(
        self,
        features: Dict[str, Any],
        max_txn_amount: float,
        max_session_total: float,
        category_allowlist: list,
        goal_description: str,
        item_description: str,
        category: str,
        amount: float,
    ) -> Tuple[str, float, str, Dict[str, float], bool]:
        """
        Evaluates the transaction and returns:
        - decision: "APPROVE" | "STEP_UP" | "BLOCK"
        - risk_score: float (0.0 to 1.0)
        - reason_text: human-readable explanation
        - top_contributing_factors: dict of feature risk weights
        - is_hard_block: bool
        """
        category_in_allowlist = features.get("category_in_allowlist", False)
        semantic_sim = features.get("semantic_similarity", 1.0)
        semantic_distance = 1.0 - semantic_sim
        
        # Anomaly score from Isolation Forest
        anomaly_score = anomaly_detector.compute_anomaly_score(features)
        
        velocity_zscore = min(3.0, features.get("velocity_zscore", 0.0)) / 3.0
        spend_overage_ratio = min(2.0, features.get("spend_overage_ratio", 0.0)) / 2.0
        single_overage_ratio = min(2.0, features.get("single_overage_ratio", 0.0)) / 2.0
        combined_spend_risk = max(spend_overage_ratio, single_overage_ratio)

        # 1. Hard Rule Checks
        hard_block_reasons = []
        is_minor_overage = False
        if amount > max_txn_amount:
            # If amount exceeds cap by <= 25% and category is allowed, route to human-in-the-loop STEP_UP
            if amount <= max_txn_amount * 1.25 and category_in_allowlist:
                is_minor_overage = True
            else:
                hard_block_reasons.append(
                    f"Requested amount ₹{amount:,.2f} exceeds max per-transaction cap ₹{max_txn_amount:,.2f}"
                )
        if not category_in_allowlist:
            hard_block_reasons.append(
                f"Category '{category}' is outside the authorized allowlist {category_allowlist}"
            )

        is_hard_block = len(hard_block_reasons) > 0

        # 2. Multi-Signal Weighted Risk Score
        raw_risk = (
            (self.w_semantic * semantic_distance)
            + (self.w_anomaly * anomaly_score)
            + (self.w_velocity * velocity_zscore)
            + (self.w_spend * combined_spend_risk)
        )

        if is_hard_block:
            risk_score = 1.0
        elif is_minor_overage:
            # Force into the STEP_UP threshold window [0.45, 0.70)
            risk_score = round(max(self.t_stepup + 0.08, min(self.t_block - 0.05, float(raw_risk))), 4)
        else:
            # Scale slightly based on extreme single signals
            if semantic_distance > 0.8:
                raw_risk = max(raw_risk, 0.78)
            if combined_spend_risk > 0.4:
                raw_risk = max(raw_risk, 0.72)
            if velocity_zscore > 0.75:
                raw_risk = max(raw_risk, 0.70)
            risk_score = max(0.0, min(1.0, float(raw_risk)))

        # Feature contribution breakdown for audit trail
        contributing_factors = {
            "semantic_distance": round(self.w_semantic * semantic_distance, 4),
            "anomaly_model_score": round(self.w_anomaly * anomaly_score, 4),
            "velocity_elevation": round(self.w_velocity * velocity_zscore, 4),
            "spend_cap_deviation": round(self.w_spend * combined_spend_risk, 4),
        }

        # 3. Decision Policy
        if is_hard_block or risk_score >= self.t_block:
            decision = "BLOCK"
        elif risk_score >= self.t_stepup:
            decision = "STEP_UP"
        else:
            decision = "APPROVE"

        # 4. Human-Readable Reason Synthesis
        if is_hard_block:
            reason_text = "BLOCKED by hard policy gate: " + "; ".join(hard_block_reasons) + "."
        elif decision == "BLOCK":
            # Identify dominant risk factor
            if semantic_distance >= 0.65:
                reason_text = (
                    f"BLOCKED due to severe semantic drift ({round(semantic_sim * 100, 1)}% match). "
                    f"Item '{item_description}' deviates from authorized mandate goal: '{goal_description}'."
                )
            elif combined_spend_risk >= 0.3:
                cumulative_spend = features.get("cumulative_spend", amount)
                reason_text = (
                    f"BLOCKED due to spend cap overage. Session cumulative spend ₹{cumulative_spend:,.2f} "
                    f"exceeds authorized total ₹{max_session_total:,.2f}."
                )
            elif velocity_zscore >= 0.6:
                reason_text = (
                    f"BLOCKED due to abnormal transaction velocity burst "
                    f"(z-score {features.get('velocity_zscore', 0):.1f}). Potential session hijack or automated replay."
                )
            else:
                reason_text = (
                    f"BLOCKED: Multi-factor behavioral risk score ({risk_score:.2f}) exceeds block threshold "
                    f"({self.t_block:.2f}) across statistical and mandate boundary models."
                )
        elif decision == "STEP_UP":
            if is_minor_overage:
                pct_over = int(round(((amount - max_txn_amount) / max_txn_amount) * 100))
                reason_text = (
                    f"STEP-UP required: Requested amount ₹{amount:,.2f} exceeds single-item cap "
                    f"₹{max_txn_amount:,.2f} by {pct_over}%. Borderline overage routed to operator verification."
                )
            elif semantic_distance >= 0.35:
                reason_text = (
                    f"STEP-UP required: Moderate semantic variance ({round(semantic_sim * 100, 1)}% match). "
                    f"Item '{item_description}' requires human verification against mandate goal: '{goal_description}'."
                )
            elif velocity_zscore >= 0.35:
                reason_text = (
                    f"STEP-UP required: Elevated request velocity detected ({features.get('velocity_rate', 0)} req/min). "
                    f"Confirmation needed before dispatching order."
                )
            else:
                reason_text = (
                    f"STEP-UP required: Borderline behavioral anomaly score ({risk_score:.2f}). "
                    f"Routed to merchant / human approver to prevent false rejection."
                )
        else:
            reason_text = (
                f"APPROVED: Transaction strictly conforms to declared mandate. "
                f"High semantic alignment ({round(semantic_sim * 100, 1)}%), within spend cap ₹{max_txn_amount:,.2f}, "
                f"category '{category}' authorized."
            )

        return decision, round(risk_score, 4), reason_text, contributing_factors, is_hard_block


policy_gate = DecisionPolicyGate()
