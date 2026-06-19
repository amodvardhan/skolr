import logging
import httpx
from typing import List, Dict, Any
from app.core.config import settings

logger = logging.getLogger("whatsapp")

class WhatsAppClient:
    def __init__(self):
        self.api_token = settings.WHATSAPP_API_TOKEN
        self.phone_id = settings.WHATSAPP_PHONE_ID
        self.version = "v19.0"
        
        # Meta Graph API Base URL
        if self.phone_id:
            self.base_url = f"https://graph.facebook.com/{self.version}/{self.phone_id}/messages"
        else:
            self.base_url = None

    async def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "en",
        body_parameters: List[str] = None
    ) -> Dict[str, Any]:
        """
        Sends a WhatsApp template message using Meta Business Graph API.
        """
        if not self.api_token or not self.phone_id:
            logger.error("WhatsApp credentials not set in environment variables.")
            raise ValueError("WhatsApp Meta credentials not configured. Please set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_ID in .env")

        # Normalize phone numbers for India (prepend 91 if not present and length is 10)
        phone = to_phone.strip().replace(" ", "").replace("-", "")
        if len(phone) == 10:
            phone = f"91{phone}"
        elif phone.startswith("+"):
            phone = phone[1:]

        # Structure body parameters
        parameters_payload = []
        if body_parameters:
            for param in body_parameters:
                parameters_payload.append({
                    "type": "text",
                    "text": str(param)
                })

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": language_code
                }
            }
        }

        if parameters_payload:
            payload["template"]["components"] = [
                {
                    "type": "body",
                    "parameters": parameters_payload
                }
            ]

        logger.info(f"Sending WhatsApp Template [{template_name}] to {phone}...")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.base_url, json=payload, headers=headers, timeout=10.0)
                response_data = response.json()
                
                if response.status_code == 200:
                    logger.info(f"WhatsApp message sent successfully to {phone}. Message ID: {response_data.get('messages', [{}])[0].get('id')}")
                    return {"success": True, "data": response_data}
                else:
                    error_details = response_data.get("error", {})
                    logger.error(
                        f"WhatsApp Graph API failed with status {response.status_code}. "
                        f"Error: {error_details.get('message')} | Code: {error_details.get('code')}"
                    )
                    return {
                        "success": False, 
                        "error_code": error_details.get("code"),
                        "message": error_details.get("message")
                    }
            except Exception as e:
                logger.error(f"Failed to connect to Meta Graph API: {str(e)}")
                return {"success": False, "message": f"Connection failed: {str(e)}"}

# Global client instance
whatsapp_client = WhatsAppClient()
