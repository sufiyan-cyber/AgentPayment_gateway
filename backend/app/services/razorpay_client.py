import uuid
import time
from typing import Dict, Any, Optional
from app.config import settings

try:
    import razorpay
except ImportError:
    razorpay = None


class RazorpayService:
    """
    Razorpay Test-Mode Orders API Client.
    Dispatches approved agent transactions to Razorpay to generate real test-mode Orders.
    Includes mock fallback for offline or zero-key local review.
    """

    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        self.mock_mode = settings.RAZORPAY_MOCK_MODE
        self.client = None

        if not self.mock_mode and razorpay and self.key_id.startswith("rzp_test_") and not "mock" in self.key_id:
            try:
                self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
            except Exception:
                self.client = None
                self.mock_mode = True

    def get_masked_key(self) -> str:
        if not self.key_id:
            return "None"
        if "mock" in self.key_id.lower():
            return "rzp_test_mock_sandbox"
        if len(self.key_id) <= 12:
            return self.key_id
        return f"{self.key_id[:8]}...{self.key_id[-4:]}"

    def get_status(self) -> Dict[str, Any]:
        is_live = bool(self.client is not None and not self.mock_mode)
        return {
            "key_id_masked": self.get_masked_key(),
            "mock_mode": self.mock_mode or not is_live,
            "is_live_test_api": is_live,
            "message": "Connected to real Razorpay Test API" if is_live else "Active in simulated mock sandbox mode",
        }

    def configure(self, key_id: str, key_secret: str, mock_mode: bool = False) -> Dict[str, Any]:
        self.key_id = (key_id or "").strip()
        self.key_secret = (key_secret or "").strip()
        self.mock_mode = mock_mode

        if self.mock_mode or "mock" in self.key_id.lower() or not self.key_id:
            self.client = None
            self.mock_mode = True
            return {
                "success": True,
                "key_id_masked": self.get_masked_key(),
                "mock_mode": True,
                "is_live_test_api": False,
                "message": "Configured in simulated test sandbox mode.",
            }

        if razorpay and self.key_id.startswith("rzp_test_"):
            try:
                client = razorpay.Client(auth=(self.key_id, self.key_secret))
                # Validate credentials by listing orders (limit 1)
                client.order.all({"count": 1})
                self.client = client
                self.mock_mode = False
                return {
                    "success": True,
                    "key_id_masked": self.get_masked_key(),
                    "mock_mode": False,
                    "is_live_test_api": True,
                    "message": "Successfully authenticated and connected to Razorpay Test API!",
                }
            except Exception as e:
                self.client = None
                self.mock_mode = True
                return {
                    "success": False,
                    "key_id_masked": self.get_masked_key(),
                    "mock_mode": True,
                    "is_live_test_api": False,
                    "message": f"Razorpay API authentication failed: {str(e)}. Operating in fallback sandbox.",
                }
        else:
            self.client = None
            self.mock_mode = True
            return {
                "success": False,
                "key_id_masked": self.get_masked_key(),
                "mock_mode": True,
                "is_live_test_api": False,
                "message": "Invalid key format. Razorpay test key must start with 'rzp_test_'.",
            }

    def create_order(
        self,
        amount: float,
        session_id: str,
        item_description: str,
        merchant_id: str,
        currency: str = "INR",
    ) -> Dict[str, Any]:
        """
        Creates a Razorpay Test-Mode Order.
        Amount is converted to paise (INR * 100).
        """
        amount_in_paise = int(round(amount * 100))
        receipt_id = f"rcpt_ms_{uuid.uuid4().hex[:12]}"
        notes = {
            "session_id": str(session_id),
            "merchant_id": str(merchant_id),
            "item_description": str(item_description)[:60],
            "agent_gate": "MandateSentinel",
        }

        # If real Razorpay client is initialized
        if self.client and not self.mock_mode:
            try:
                order_data = {
                    "amount": amount_in_paise,
                    "currency": currency,
                    "receipt": receipt_id,
                    "notes": notes,
                }
                order = self.client.order.create(data=order_data)
                return {
                    "success": True,
                    "order_id": order.get("id"),
                    "amount": amount,
                    "currency": currency,
                    "status": order.get("status", "created"),
                    "receipt": receipt_id,
                    "raw_response": order,
                    "is_live_test_api": True,
                }
            except Exception as e:
                # Log error and fallback to simulated mock order
                print(f"[Razorpay API Error]: {e}, falling back to test order mock")

        # Mock / Realistic Test-Mode Order Generation
        simulated_order_id = f"order_{uuid.uuid4().hex[:14]}"
        return {
            "success": True,
            "order_id": simulated_order_id,
            "amount": amount,
            "currency": currency,
            "status": "created",
            "receipt": receipt_id,
            "raw_response": {
                "id": simulated_order_id,
                "entity": "order",
                "amount": amount_in_paise,
                "amount_paid": 0,
                "amount_due": amount_in_paise,
                "currency": currency,
                "receipt": receipt_id,
                "status": "created",
                "attempts": 0,
                "notes": notes,
                "created_at": int(time.time()),
            },
            "is_live_test_api": False,
        }


razorpay_service = RazorpayService()
