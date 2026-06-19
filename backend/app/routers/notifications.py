# Phase: 1
from fastapi import APIRouter, Depends, Query, status, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.public import User
from app.repositories.notifications import NotificationsRepository
from app.services.notifications import NotificationsService
from app.schemas.notifications import (
    NotificationTemplateCreate, NotificationTemplateResponse, NotificationTemplateListResponse,
    BroadcastRequest, NotificationLogListResponse, NotificationLogPagination
)

router = APIRouter(prefix="/notifications", tags=["Notification Management"])

@router.post("/templates", response_model=NotificationTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: NotificationTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = NotificationsRepository(db)
    service = NotificationsService(repo)
    template = await service.create_template(data)
    return NotificationTemplateResponse(success=True, data=template, message="Template created successfully.")

@router.get("/templates", response_model=NotificationTemplateListResponse)
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = NotificationsRepository(db)
    service = NotificationsService(repo)
    templates = await service.list_templates()
    return NotificationTemplateListResponse(success=True, data=templates, message="OK")

@router.delete("/templates/{template_id}", status_code=status.HTTP_200_OK)
async def delete_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = NotificationsRepository(db)
    service = NotificationsService(repo)
    await service.delete_template(template_id)
    return {"success": True, "message": "Template deleted successfully."}

@router.get("/logs", response_model=NotificationLogListResponse)
async def list_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = NotificationsRepository(db)
    service = NotificationsService(repo)
    logs, total = await service.list_logs(page=page, per_page=per_page, status_filter=status_filter)
    
    pages = (total + per_page - 1) // per_page
    
    pagination = NotificationLogPagination(
        page=page,
        per_page=per_page,
        total=total,
        pages=pages
    )
    
    return NotificationLogListResponse(
        success=True,
        data=logs,
        pagination=pagination,
        message="OK"
    )

@router.post("/broadcast", status_code=status.HTTP_202_ACCEPTED)
async def trigger_broadcast(
    request: BroadcastRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    if not current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a school"
        )
        
    repo = NotificationsRepository(db)
    service = NotificationsService(repo)
    
    await service.trigger_broadcast(
        request=request,
        sender_id=current_user.id,
        school_id=str(current_user.school_id),
        background_tasks=background_tasks
    )
    return {"success": True, "message": "Broadcast triggered successfully."}
