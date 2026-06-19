import re
import uuid
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID

from app.core.database import get_db, engine, SkolrBase
from app.core.security import get_password_hash
from app.models.public import Tenant, User, Plan
from app.models.tenant import AcademicYear, FeeHead, Class, Employee

router = APIRouter(prefix="/tenants", tags=["Tenants"])

class TenantResolveData(BaseModel):
    id: UUID
    name: str
    subdomain: str
    status: str

    class Config:
        from_attributes = True

class TenantResolveResponse(BaseModel):
    success: bool = True
    data: TenantResolveData
    message: str = "OK"

@router.get("/resolve", response_model=TenantResolveResponse)
async def resolve_tenant(
    subdomain: str = Query(..., description="The subdomain to resolve (e.g. 'default')"),
    db: AsyncSession = Depends(get_db)
):
    # Query database in public schema
    result = await db.execute(select(Tenant).where(Tenant.subdomain == subdomain, Tenant.status == "active"))
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found or inactive"
        )
        
    return TenantResolveResponse(
        data=TenantResolveData(
            id=tenant.id,
            name=tenant.name,
            subdomain=tenant.subdomain,
            status=tenant.status
        )
    )


class TenantOnboardRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    subdomain: str = Field(..., min_length=2, max_length=30)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=6)
    admin_first_name: str = Field(..., min_length=2, max_length=50)
    admin_last_name: str = Field(..., min_length=2, max_length=50)
    plan_code: str = Field("pro", description="starter, growth, pro")

class TenantOnboardResponse(BaseModel):
    success: bool = True
    message: str = "School onboarded successfully"
    school_id: UUID
    subdomain: str

@router.post("/onboard", response_model=TenantOnboardResponse, status_code=status.HTTP_201_CREATED)
async def onboard_school(
    request: TenantOnboardRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Sanitize and validate subdomain
    subdomain = request.subdomain.lower().strip()
    if not re.match(r"^[a-zA-Z0-9\-]+$", subdomain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subdomain must contain only alphanumeric characters and dashes"
        )
    if subdomain in ["www", "admin", "platform", "api", "default"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This subdomain name is reserved"
        )

    # 2. Check if subdomain already exists
    res = await db.execute(select(Tenant).where(Tenant.subdomain == subdomain))
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subdomain is already taken"
        )

    # 3. Check if admin email already exists
    res = await db.execute(select(User).where(User.email == request.admin_email))
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered"
        )

    # 4. Get plan
    res = await db.execute(select(Plan).where(Plan.code == request.plan_code))
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subscription plan tier '{request.plan_code}' not found"
        )

    # 5. Create Tenant in public schema
    tenant_id = uuid.uuid4()
    tenant = Tenant(
        name=request.name,
        subdomain=subdomain,
        custom_domain=None,
        status="active",
        plan_id=plan.id
    )
    tenant.id = tenant_id
    db.add(tenant)

    # 6. Create Admin User in public schema
    admin_user = User(
        email=request.admin_email,
        hashed_password=get_password_hash(request.admin_password),
        first_name=request.admin_first_name,
        last_name=request.admin_last_name,
        role="school_admin",
        school_id=tenant_id,
        is_active=True
    )
    db.add(admin_user)
    
    # Flush public objects to generate user and plan mappings
    await db.flush()

    # 7. Dynamically create database schema for the school
    schema_name = f"school_{str(tenant_id).replace('-', '_')}"
    await db.execute(text(f"CREATE SCHEMA {schema_name}"))
    
    # 8. Create all schema tables dynamically using metadata
    # Use the session's connection to execute in the same transaction and avoid lock conflicts
    conn = await db.connection()
    await conn.execute(text(f"SET search_path TO {schema_name}, public"))
    await conn.run_sync(SkolrBase.metadata.create_all)

    # 9. Seed default tenant data inside the new schema
    await db.execute(text(f"SET search_path TO {schema_name}, public"))
    
    # A. Initial Academic Year
    ay = AcademicYear(
        name="2025-26",
        start_date=date(2025, 6, 1),
        end_date=date(2026, 4, 30),
        is_current=True
    )
    db.add(ay)
    await db.flush()

    # B. Default Classes & Sections
    default_classes = [
        Class(name="Class 1", section="A", academic_year_id=ay.id),
        Class(name="Class 2", section="A", academic_year_id=ay.id),
        Class(name="Class 5", section="A", academic_year_id=ay.id)
    ]
    db.add_all(default_classes)

    # C. Default Fee Heads
    fh_tuition = FeeHead(name="Tuition Fee", description="Standard monthly academic instruction fee")
    fh_transport = FeeHead(name="Transport Fee", description="Standard bus transportation charges")
    db.add_all([fh_tuition, fh_transport])

    # D. Link admin to Employee record inside the new schema
    emp = Employee(
        employee_code="EMP001",
        first_name=request.admin_first_name,
        last_name=request.admin_last_name,
        designation="Principal",
        department="Administration",
        date_of_joining=date.today(),
        employment_type="permanent",
        mobile="0000000000",
        email=request.admin_email,
        status="active",
        user_id=admin_user.id
    )
    db.add(emp)
    
    # Commit changes
    await db.commit()

    return TenantOnboardResponse(
        school_id=tenant_id,
        subdomain=subdomain
    )
