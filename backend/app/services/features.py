from typing import Dict, Any, List, Optional
from app.services.semantic import semantic_engine
from app.services.state_tracker import state_tracker


class FeatureExtractionService:
    """
    Extracts multi-dimensional risk features for incoming agent purchase requests.
    Calculates semantic similarity, financial ratios, category compliance,
    velocity z-scores, and novelty indicators in <5ms.
    """

    def extract_features(
        self,
        session_id: str,
        goal_description: str,
        category_allowlist: List[str],
        max_txn_amount: float,
        max_session_total: float,
        expected_request_count: int,
        amount: float,
        category: str,
        merchant_id: str,
        item_description: str,
        timestamp: Optional[float] = None,
    ) -> Dict[str, Any]:
        # 1. Category Compliance
        norm_allowlist = [c.strip().lower() for c in category_allowlist]
        norm_category = category.strip().lower()
        category_in_allowlist = norm_category in norm_allowlist

        # 2. Semantic Similarity to Mandate Goal
        semantic_sim = semantic_engine.compute_similarity(
            session_id=session_id,
            goal_description=goal_description,
            item_description=item_description,
        )

        # 3. State Tracking (Cumulative Spend & Velocity)
        (
            cumulative_spend,
            window_count,
            velocity_rate,
            category_is_new,
            merchant_is_new,
        ) = state_tracker.record_request(
            session_id=session_id,
            amount=amount,
            category=norm_category,
            merchant_id=merchant_id,
            timestamp=timestamp,
        )

        # 4. Financial Ratios
        single_txn_ratio = amount / max(1.0, max_txn_amount)
        cumulative_session_spend_ratio = cumulative_spend / max(1.0, max_session_total)
        
        # Expected amount baseline
        expected_avg_amount = max_session_total / max(1, expected_request_count)
        amount_delta_from_expected = (amount - expected_avg_amount) / max(1.0, expected_avg_amount)

        # 5. Velocity Z-Score Baseline
        expected_rate_per_min = max(0.5, expected_request_count / 10.0)
        velocity_zscore = max(0.0, (velocity_rate - expected_rate_per_min) / max(0.5, (expected_rate_per_min ** 0.5)))

        # 6. Novelty Score (0.0 to 1.0)
        novelty_score = (0.5 if category_is_new else 0.0) + (0.5 if merchant_is_new else 0.0)

        # 7. Spend Overage Ratio
        spend_overage_ratio = max(0.0, cumulative_session_spend_ratio - 1.0)
        single_overage_ratio = max(0.0, single_txn_ratio - 1.0)

        feature_dict = {
            "amount": amount,
            "single_txn_ratio": round(single_txn_ratio, 4),
            "single_overage_ratio": round(single_overage_ratio, 4),
            "amount_delta_from_expected": round(amount_delta_from_expected, 4),
            "category_in_allowlist": bool(category_in_allowlist),
            "cumulative_spend": round(cumulative_spend, 2),
            "cumulative_session_spend_ratio": round(cumulative_session_spend_ratio, 4),
            "spend_overage_ratio": round(spend_overage_ratio, 4),
            "window_request_count": window_count,
            "velocity_rate": round(velocity_rate, 2),
            "velocity_zscore": round(velocity_zscore, 4),
            "semantic_similarity": round(semantic_sim, 4),
            "semantic_distance": round(1.0 - semantic_sim, 4),
            "novelty_score": round(novelty_score, 2),
            "category_is_new": category_is_new,
            "merchant_is_new": merchant_is_new,
        }

        return feature_dict


feature_extractor = FeatureExtractionService()
