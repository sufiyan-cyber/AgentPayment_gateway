import numpy as np
import math
from sklearn.ensemble import IsolationForest
from typing import Dict, Any, List, Optional
import pickle
import os


class AnomalyDetector:
    """
    Isolation Forest anomaly detection model for agent behavioral features.
    Trained strictly on clean baseline distributions.
    Outputs calibrated anomaly scores in [0.0, 1.0].
    """

    FEATURE_KEYS = [
        "single_txn_ratio",
        "amount_delta_from_expected",
        "cumulative_session_spend_ratio",
        "velocity_zscore",
        "semantic_similarity",
        "novelty_score",
    ]

    def __init__(self):
        self.model: Optional[IsolationForest] = None
        self.is_fitted: bool = False
        self._init_default_baseline()

    def _extract_vector(self, feature_dict: Dict[str, Any]) -> List[float]:
        return [float(feature_dict.get(k, 0.0)) for k in self.FEATURE_KEYS]

    def _init_default_baseline(self):
        """Initializes a reasonable baseline IsolationForest with synthetic clean distribution."""
        np.random.seed(42)
        n_samples = 500
        clean_features = np.column_stack([
            np.random.uniform(0.15, 0.75, n_samples),   # single_txn_ratio
            np.random.normal(0.0, 0.3, n_samples),      # amount_delta_from_expected
            np.random.uniform(0.15, 0.80, n_samples),   # cumulative_session_spend_ratio
            np.random.exponential(0.3, n_samples),      # velocity_zscore
            np.random.uniform(0.70, 0.98, n_samples),   # semantic_similarity
            np.random.choice([0.0, 0.5], n_samples, p=[0.75, 0.25]),  # novelty
        ])
        
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.03,
            random_state=42,
        )
        self.model.fit(clean_features)
        self.is_fitted = True

    def train_on_clean_features(self, feature_list: List[Dict[str, Any]]) -> None:
        """Fits the Isolation Forest on extracted clean training features."""
        if not feature_list or len(feature_list) < 10:
            return

        matrix = np.array([self._extract_vector(f) for f in feature_list])
        self.model = IsolationForest(
            n_estimators=120,
            contamination=0.02,
            random_state=42,
        )
        self.model.fit(matrix)
        self.is_fitted = True

    def compute_anomaly_score(self, feature_dict: Dict[str, Any]) -> float:
        """
        Computes calibrated anomaly score between 0.0 (normal) and 1.0 (anomalous)
        using logistic sigmoid mapping on IsolationForest decision function.
        """
        if not self.model or not self.is_fitted:
            return 0.15

        vec = np.array([self._extract_vector(feature_dict)])
        raw_score = self.model.decision_function(vec)[0]

        # Logistic sigmoid: raw_score > 0.1 => ~0.10, raw_score < -0.1 => ~0.85
        scaled = -8.0 * (raw_score - 0.05)
        anomaly_score = 1.0 / (1.0 + math.exp(min(15.0, max(-15.0, scaled))))
        return max(0.0, min(1.0, float(anomaly_score)))

    def save(self, filepath: str) -> None:
        if self.model and self.is_fitted:
            with open(filepath, "wb") as f:
                pickle.dump(self.model, f)

    def load(self, filepath: str) -> None:
        if os.path.exists(filepath):
            with open(filepath, "rb") as f:
                self.model = pickle.load(f)
                self.is_fitted = True


anomaly_detector = AnomalyDetector()
