# Phase: 1
from fastapi import APIRouter, Depends, status, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from typing import Optional

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.public import User, Tenant
from app.repositories.cbse import CBSERepository
from app.services.cbse import CBSEService
from app.schemas.cbse import CBSEProfileCreate, CBSEProfileResponse, CBSEComplianceResponse, CBSEProfileResponseData

router = APIRouter(prefix="/cbse", tags=["CBSE Compliance & Affiliation"])

@router.get("/profile", response_model=CBSEProfileResponse)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = CBSERepository(db)
    service = CBSEService(repo)
    profile = await service.get_profile()
    if profile:
        data = CBSEProfileResponseData.model_validate(profile)
        return CBSEProfileResponse(success=True, data=data, message="OK")
    return CBSEProfileResponse(success=True, data=None, message="No profile found")

@router.put("/profile", response_model=CBSEProfileResponse)
async def update_profile(
    data: CBSEProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = CBSERepository(db)
    service = CBSEService(repo)
    profile = await service.update_profile(data)
    data_res = CBSEProfileResponseData.model_validate(profile)
    return CBSEProfileResponse(success=True, data=data_res, message="Profile updated successfully.")

@router.get("/compliance", response_model=CBSEComplianceResponse)
async def get_compliance_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = CBSERepository(db)
    service = CBSEService(repo)
    stats = await service.get_compliance_status()
    return CBSEComplianceResponse(success=True, data=stats, message="OK")

@router.get("/export-pdf", response_class=Response)
async def export_compliance_pdf(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = CBSERepository(db)
    service = CBSEService(repo)
    
    # Resolve school name & subdomain dynamically using public tenant lookup
    school_name = "Prestige Public School"
    subdomain = "default"
    try:
        schema_res = await db.execute(text("SELECT current_schema()"))
        current_schema = schema_res.scalar() or ""
        if current_schema.startswith("school_"):
            tenant_id_str = current_schema.replace("school_", "").replace("_", "-")
            tenant_res = await db.execute(
                select(Tenant).where(Tenant.id == tenant_id_str)
            )
            tenant = tenant_res.scalar_one_or_none()
            if tenant:
                school_name = tenant.name
                subdomain = tenant.subdomain
    except Exception:
        pass
        
    pdf_bytes = await service.generate_compliance_pdf(
        school_name=school_name,
        subdomain=subdomain
    )
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="cbse-affiliation-fact-sheet.pdf"',
            "Content-Type": "application/pdf"
        }
    )
