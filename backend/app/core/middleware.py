import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("skolr")

class TenantLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        
        # Capture school/tenant ID from request header
        school_id = request.headers.get("X-School-ID", "platform")
        request.state.school_id = school_id
        
        response = await call_next(request)
        
        # Add latency header and school ID verification
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        response.headers["X-School-ID"] = school_id
        
        logger.info(
            f"Request: {request.method} {request.url.path} | "
            f"Tenant: {school_id} | Status: {response.status_code} | "
            f"Latency: {process_time:.4f}s"
        )
        
        return response
