import logging
import httpx
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("razorpay")

class RazorpayClient:
    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        self.base_url = "https://api.razorpay.com/v1/payment_links"

    @property
    def is_mock(self) -> bool:
        return (
            not self.key_id 
            or not self.key_secret 
            or self.key_id == "mock-razorpay-key" 
            or self.key_secret == "mock-razorpay-secret"
        )

    async def create_payment_link(
        self,
        amount: float,
        student_id: str,
        student_name: str,
        parent_mobile: str,
        school_id: str,
        description: str
    ) -> Optional[str]:
        """
        Generates a Razorpay payment link. In development/mock mode,
        generates a simulated payment link that redirects to a mock checkout.
        """
        # 1. Development Mock Check
        if self.is_mock:
            logger.info("Razorpay credentials not set or set to mock. Generating simulated payment link.")
            # Point to the local mock checkout endpoint
            # In production, we'd use the school's configured URL or base URL,
            # but for local dev uvicorn runs on port 8000.
            import urllib.parse
            params = urllib.parse.urlencode({
                "student_id": student_id,
                "amount": f"{amount:.2f}",
                "student_name": student_name,
                "parent_mobile": parent_mobile,
                "school_id": school_id
            })
            return f"http://localhost:8000/api/v1/fees/mock-checkout?{params}"

        # 2. Live API Call
        amount_paise = int(amount * 100) # Convert INR to paise
        
        # Standardize contact format
        contact = parent_mobile.strip().replace(" ", "").replace("-", "")
        if len(contact) == 10:
            contact = f"+91{contact}"

        payload = {
            "amount": amount_paise,
            "currency": "INR",
            "accept_partial": False,
            "description": description,
            "customer": {
                "name": student_name,
                "contact": contact
            },
            "notify": {
                "sms": False,
                "email": False
            },
            "reminder_enable": False,
            "notes": {
                "student_id": student_id,
                "school_id": school_id
            }
        }

        auth = (self.key_id, self.key_secret)

        logger.info(f"Creating live Razorpay payment link for {student_name} (amount: ₹{amount:.2f}, school: {school_id})...")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.base_url,
                    json=payload,
                    auth=auth,
                    headers={"Content-Type": "application/json"},
                    timeout=10.0
                )
                
                response_data = response.json()
                if response.status_code in (200, 201):
                    short_url = response_data.get("short_url")
                    logger.info(f"Razorpay payment link created: {short_url}")
                    return short_url
                else:
                    error_msg = response_data.get("error", {}).get("description", "Unknown API error")
                    logger.error(f"Razorpay API Error (HTTP {response.status_code}): {error_msg}")
                    return None
            except Exception as e:
                logger.error(f"Failed to connect to Razorpay API: {str(e)}")
                return None

# Global Razorpay Client instance
razorpay_client = RazorpayClient()
