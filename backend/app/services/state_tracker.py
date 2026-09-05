import time
from typing import Dict, List, Set, Tuple, Optional
import redis
from app.config import settings


class StateTracker:
    """
    Tracks session velocity, rolling window counters, cumulative spend,
    and novelty (seen merchants/categories) using Redis with In-Memory fallback.
    Supports both real-time wall clock and simulated timestamp streams.
    """

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self._in_memory_spend: Dict[str, float] = {}
        self._in_memory_timestamps: Dict[str, List[float]] = {}
        self._in_memory_categories: Dict[str, Set[str]] = {}
        self._in_memory_merchants: Dict[str, Set[str]] = {}

        if settings.REDIS_URL:
            try:
                client = redis.from_url(
                    settings.REDIS_URL,
                    socket_connect_timeout=0.2,
                    socket_timeout=0.2,
                    decode_responses=True,
                )
                client.ping()
                self.redis_client = client
            except Exception:
                self.redis_client = None

    def record_request(
        self,
        session_id: str,
        amount: float,
        category: str,
        merchant_id: str,
        timestamp: Optional[float] = None,
    ) -> Tuple[float, int, float, bool, bool]:
        """
        Records a transaction request and returns:
        - cumulative_spend: float (including this transaction)
        - window_request_count: int (requests in last 60 seconds)
        - velocity_rate: float (requests per minute rate)
        - category_is_new: bool
        - merchant_is_new: bool
        """
        now = timestamp if timestamp is not None else time.time()
        window_seconds = 60.0

        if self.redis_client and timestamp is None:
            try:
                pipe = self.redis_client.pipeline()
                spend_key = f"session:{session_id}:spend"
                ts_key = f"session:{session_id}:timestamps"
                cat_key = f"session:{session_id}:categories"
                merch_key = f"session:{session_id}:merchants"

                pipe.sismember(cat_key, category)
                pipe.sismember(merch_key, merchant_id)
                pipe.sadd(cat_key, category)
                pipe.sadd(merch_key, merchant_id)
                pipe.incrbyfloat(spend_key, amount)
                pipe.zadd(ts_key, {str(now): now})
                pipe.zremrangebyscore(ts_key, 0, now - window_seconds)
                pipe.zcard(ts_key)
                pipe.expire(spend_key, 86400)
                pipe.expire(ts_key, 86400)
                pipe.expire(cat_key, 86400)
                pipe.expire(merch_key, 86400)

                results = pipe.execute()
                cat_seen_before = bool(results[0])
                merch_seen_before = bool(results[1])
                cumulative_spend = float(results[4])
                window_count = int(results[6])

                return (
                    cumulative_spend,
                    window_count,
                    float(window_count),
                    not cat_seen_before,
                    not merch_seen_before,
                )
            except Exception:
                self.redis_client = None

        # In-memory implementation (sub-microsecond)
        prev_spend = self._in_memory_spend.get(session_id, 0.0)
        cumulative_spend = prev_spend + amount
        self._in_memory_spend[session_id] = cumulative_spend

        timestamps = self._in_memory_timestamps.setdefault(session_id, [])
        timestamps.append(now)
        cutoff = now - window_seconds
        self._in_memory_timestamps[session_id] = [t for t in timestamps if t >= cutoff]
        window_count = len(self._in_memory_timestamps[session_id])

        cats = self._in_memory_categories.setdefault(session_id, set())
        category_is_new = category not in cats
        cats.add(category)

        merchs = self._in_memory_merchants.setdefault(session_id, set())
        merchant_is_new = merchant_id not in merchs
        merchs.add(merchant_id)

        return (
            cumulative_spend,
            window_count,
            float(window_count),
            category_is_new,
            merchant_is_new,
        )

    def get_session_stats(self, session_id: str) -> Dict[str, float]:
        if self.redis_client:
            try:
                spend = self.redis_client.get(f"session:{session_id}:spend")
                ts_count = self.redis_client.zcard(f"session:{session_id}:timestamps")
                return {
                    "cumulative_spend": float(spend) if spend else 0.0,
                    "active_request_count": int(ts_count) if ts_count else 0,
                }
            except Exception:
                self.redis_client = None

        return {
            "cumulative_spend": self._in_memory_spend.get(session_id, 0.0),
            "active_request_count": len(self._in_memory_timestamps.get(session_id, [])),
        }

    def reset_session(self, session_id: str) -> None:
        if self.redis_client:
            try:
                self.redis_client.delete(
                    f"session:{session_id}:spend",
                    f"session:{session_id}:timestamps",
                    f"session:{session_id}:categories",
                    f"session:{session_id}:merchants",
                )
            except Exception:
                self.redis_client = None
        self._in_memory_spend.pop(session_id, None)
        self._in_memory_timestamps.pop(session_id, None)
        self._in_memory_categories.pop(session_id, None)
        self._in_memory_merchants.pop(session_id, None)

    def clear_all(self) -> None:
        self._in_memory_spend.clear()
        self._in_memory_timestamps.clear()
        self._in_memory_categories.clear()
        self._in_memory_merchants.clear()


state_tracker = StateTracker()
