# Phase: 3
import logging
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
import httpx

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db, sanitize_schema_name
from app.core.deps import require_roles
from app.models.public import User, Tenant, CorporateAnalytics

logger = logging.getLogger("corporate_router")
router = APIRouter(prefix="/corporate", tags=["Corporate Analytics"])

# Schemas
class BranchAnalyticsResponse(BaseModel):
    school_id: UUID
    school_name: str
    subdomain: str
    chain_id: Optional[str] = None
    student_count: int
    teacher_count: int
    total_revenue: float
    avg_attendance_rate: float
    last_synced: datetime

    class Config:
        from_attributes = True

class CorporateStatsResponse(BaseModel):
    success: bool = True
    data: List[BranchAnalyticsResponse]
    message: str = "OK"

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    success: bool = True
    response: str

# Helper logic to run multi-tenant schema sync
async def run_sync_logic(db: AsyncSession, chain_id: Optional[str]) -> List[CorporateAnalytics]:
    # Fetch active tenants
    if chain_id:
        tenants_query = select(Tenant).where(Tenant.chain_id == chain_id, Tenant.status == "active")
    else:
        # Wildcard/All for super_admin
        tenants_query = select(Tenant).where(Tenant.status == "active")
        
    tenants_res = await db.execute(tenants_query)
    active_tenants = tenants_res.scalars().all()
    
    synced_records = []
    
    for tenant in active_tenants:
        schema_name = sanitize_schema_name(str(tenant.id))
        
        # Single efficient SQL scan in the tenant's schema
        query = text(f"""
            SELECT 
              (SELECT COUNT(*)::integer FROM {schema_name}.students WHERE status = 'active' AND deleted_at IS NULL) as student_count,
              (SELECT COUNT(*)::integer FROM {schema_name}.employees WHERE (LOWER(designation) = 'teacher' OR LOWER(department) = 'academics') AND status = 'active' AND deleted_at IS NULL) as teacher_count,
              COALESCE((SELECT SUM(amount_paid)::float FROM {schema_name}.fee_transactions WHERE deleted_at IS NULL), 0.0) as total_revenue,
              COALESCE(
                (SELECT COUNT(CASE WHEN status = 'P' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) 
                 FROM {schema_name}.student_attendance 
                 WHERE deleted_at IS NULL), 
                100.0
              )::float as avg_attendance_rate
        """)
        
        try:
            res = await db.execute(query)
            row = res.fetchone()
            student_count = row[0] if row else 0
            teacher_count = row[1] if row else 0
            total_revenue = row[2] if row else 0.0
            avg_attendance_rate = row[3] if row else 100.0
        except Exception as e:
            logger.warning(f"Error querying tenant schema {schema_name}: {str(e)}")
            student_count = 0
            teacher_count = 0
            total_revenue = 0.0
            avg_attendance_rate = 100.0
            
        # Ensure we write back in the public schema Context
        await db.execute(text("SET search_path TO public"))
        
        # Check if cache record already exists
        ca_query = select(CorporateAnalytics).where(CorporateAnalytics.school_id == tenant.id)
        ca_res = await db.execute(ca_query)
        ca = ca_res.scalar_one_or_none()
        
        if ca:
            ca.school_name = tenant.name
            ca.subdomain = tenant.subdomain
            ca.chain_id = tenant.chain_id
            ca.student_count = student_count
            ca.teacher_count = teacher_count
            ca.total_revenue = total_revenue
            ca.avg_attendance_rate = avg_attendance_rate
            ca.last_synced = datetime.now(timezone.utc)
        else:
            ca = CorporateAnalytics(
                school_id=tenant.id,
                school_name=tenant.name,
                subdomain=tenant.subdomain,
                chain_id=tenant.chain_id,
                student_count=student_count,
                teacher_count=teacher_count,
                total_revenue=total_revenue,
                avg_attendance_rate=avg_attendance_rate,
                last_synced=datetime.now(timezone.utc)
            )
            db.add(ca)
            
        synced_records.append(ca)
        
    await db.flush()
    return synced_records


@router.get("/stats", response_model=CorporateStatsResponse)
async def get_corporate_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "chain_admin"]))
):
    await db.execute(text("SET search_path TO public"))
    
    if current_user.role == "super_admin":
        # super_admin can see all cached analytics
        query = select(CorporateAnalytics).order_by(CorporateAnalytics.school_name)
    else:
        # chain_admin is partitioned by their chain_id
        if not current_user.chain_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User role is chain_admin but no chain_id is configured."
            )
        query = select(CorporateAnalytics).where(
            CorporateAnalytics.chain_id == current_user.chain_id
        ).order_by(CorporateAnalytics.school_name)
        
    res = await db.execute(query)
    records = res.scalars().all()
    
    return CorporateStatsResponse(data=records)


@router.post("/sync", response_model=CorporateStatsResponse)
async def trigger_corporate_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "chain_admin"]))
):
    chain_id = None if current_user.role == "super_admin" else current_user.chain_id
    if current_user.role == "chain_admin" and not chain_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User role is chain_admin but no chain_id is configured."
        )
        
    # Execute full synchronous schema sync
    await run_sync_logic(db, chain_id)
    
    # Reload matching cached stats
    await db.execute(text("SET search_path TO public"))
    if current_user.role == "super_admin":
        query = select(CorporateAnalytics).order_by(CorporateAnalytics.school_name)
    else:
        query = select(CorporateAnalytics).where(
            CorporateAnalytics.chain_id == chain_id
        ).order_by(CorporateAnalytics.school_name)
        
    res = await db.execute(query)
    records = res.scalars().all()
    
    return CorporateStatsResponse(data=records)


@router.post("/chat", response_model=ChatResponse)
async def query_ai_analytics(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "chain_admin"]))
):
    # Verify Gemini API Key exists
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GEMINI_API_KEY_MISSING"
        )
        
    # Fetch cached stats matching authorization
    await db.execute(text("SET search_path TO public"))
    if current_user.role == "super_admin":
        query = select(CorporateAnalytics).order_by(CorporateAnalytics.school_name)
    else:
        query = select(CorporateAnalytics).where(
            CorporateAnalytics.chain_id == current_user.chain_id
        ).order_by(CorporateAnalytics.school_name)
        
    res = await db.execute(query)
    records = res.scalars().all()
    
    if not records:
        return ChatResponse(
            response="There are currently no synchronized branch statistics. Please trigger a branch sync first."
        )
        
    # Format current stats table as prompt context
    stats_str = ""
    for r in records:
        stats_str += (
            f"- Branch: {r.school_name} (Subdomain: {r.subdomain}), "
            f"Students: {r.student_count}, "
            f"Teachers: {r.teacher_count}, "
            f"Total Revenue: INR {r.total_revenue:.2f}, "
            f"Attendance Rate: {r.avg_attendance_rate:.1f}%\n"
        )
        
    prompt = f"""You are Skolr AI, a specialized corporate school intelligence assistant.
Below is the aggregated real-time metrics data for the active school branches under your chain:

{stats_str}

Answer the user's natural language question about these branches. Follow these guidelines:
1. Provide accurate numerical comparisons based strictly on the metrics table above.
2. Be professional, concise, and direct in your analysis.
3. If the question is unrelated to these schools or their data, politely redirect the user back to school analytics.
4. Format your response cleanly using Markdown lists or tables where appropriate.

User Question: {request.message}
Answer:"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code != 200:
                logger.error(f"Gemini API Error: {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Error communicating with the Gemini AI engine."
                )
                
            data = response.json()
            ai_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return ChatResponse(response=ai_text.strip())
    except Exception as e:
        logger.error(f"AI Analytics chat failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Engine query failed: {str(e)}"
        )
