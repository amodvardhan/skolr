from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import logging

from app.core.config import settings
from app.core.database import get_db
from app.core.middleware import TenantLoggingMiddleware
from app.routers import auth, tenants, students, attendance, fees, dashboard, employee, academics, exams, notifications, cbse, cms, parent, corporate

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

@app.on_event("startup")
async def startup_db_init():
    from app.core.database import engine, SkolrBase
    async with engine.begin() as conn:
        logger.info("Initializing public tables...")
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
        
        # Dynamically add chain_id to existing tables if they exist
        try:
            await conn.execute(text("ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS chain_id VARCHAR(50)"))
            await conn.execute(text("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS chain_id VARCHAR(50)"))
        except Exception as e:
            logger.warning(f"Could not dynamically alter tables on startup: {str(e)}")

        # Filter metadata tables to only create public tables
        public_tables = [table for table in SkolrBase.metadata.tables.values() if table.schema == "public"]
        await conn.run_sync(lambda connection: SkolrBase.metadata.create_all(connection, tables=public_tables))

        
        # Apply Row Level Security as additional security tier
        try:
            await conn.execute(text("ALTER TABLE public.corporate_analytics ENABLE ROW LEVEL SECURITY"))
            await conn.execute(text("ALTER TABLE public.corporate_analytics FORCE ROW LEVEL SECURITY"))
            await conn.execute(text("DROP POLICY IF EXISTS corporate_analytics_policy ON public.corporate_analytics"))
            await conn.execute(text("""
                CREATE POLICY corporate_analytics_policy ON public.corporate_analytics
                USING (
                    current_setting('app.current_role', true) = 'super_admin'
                    OR chain_id = current_setting('app.current_chain_id', true)
                )
            """))
            logger.info("RLS database policy successfully applied to corporate_analytics.")
        except Exception as e:
            logger.warning(f"Could not apply database RLS policies (non-Postgres environment or limited privileges): {str(e)}")


# Configure CORS
# In production, this should be locked down to tenant domains and the admin dashboard domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://[::1]:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
    ],
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
app.include_router(cms.router, prefix="/api/v1")
app.include_router(parent.router, prefix="/api/v1")
app.include_router(corporate.router, prefix="/api/v1")


# Mount Static Files for Published School Websites
from fastapi.staticfiles import StaticFiles
import os
os.makedirs("app/static/published", exist_ok=True)
app.mount("/published", StaticFiles(directory="app/static/published"), name="published")

# Mount template asset source directory for live customizer previews
templates_static_dir = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../cms-templates")
)
app.mount("/templates", StaticFiles(directory=templates_static_dir), name="templates")

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
