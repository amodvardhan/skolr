from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import logging

from app.core.config import settings
from app.core.database import get_db
from app.core.middleware import TenantLoggingMiddleware
from app.routers import auth, tenants, students, attendance, fees, dashboard, employee, academics, exams, notifications, cbse

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("skolr")

app = FastAPI(
    title="Skolr API",
    description="School ERP + CMS SaaS Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
# In production, this should be locked down to tenant domains and the admin dashboard domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Custom Logging & Tenant Middleware
app.add_middleware(TenantLoggingMiddleware)

# Register Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tenants.router, prefix="/api/v1")
app.include_router(students.router, prefix="/api/v1")
app.include_router(attendance.router, prefix="/api/v1")
app.include_router(fees.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(employee.router, prefix="/api/v1")
app.include_router(academics.router, prefix="/api/v1")
app.include_router(exams.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(cbse.router, prefix="/api/v1")

@app.get("/api/v1/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        # Verify db is responsive
        await db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Health check DB error: {str(e)}")
        db_status = f"unhealthy: {str(e)}"

    return {
        "success": True,
        "status": "ok",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
