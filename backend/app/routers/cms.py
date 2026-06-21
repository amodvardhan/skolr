from fastapi import APIRouter, Depends, Query, status, HTTPException, File, UploadFile, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from uuid import UUID
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.public import User
from app.repositories.cms import CMSRepository
from app.services.cms import CMSService
from app.schemas.cms import (
    CMSSiteResponse, CMSSiteUpdate, CMSSiteResponseData,
    CMSPageResponse, CMSPageCreate, CMSPageUpdate, CMSPageListResponse, CMSPageResponseData,
    PublishResponse, PublishResponseData,
    CMSInquiryCreate, CMSInquiryResponse, CMSInquiryResponseData, CMSInquiryListResponse,
    CMSInquiryNoteCreate
)

router = APIRouter(prefix="/cms", tags=["CMS & Website Builder"])

# Helper helper to convert DB models to schema response shapes
def map_site_to_schema(site) -> CMSSiteResponseData:
    return CMSSiteResponseData(
        id=site.id,
        template_id=site.template_id,
        color_scheme=site.color_scheme,
        is_published=site.is_published,
        published_at=site.published_at,
        settings=site.settings or {}
    )

def map_page_to_schema(page) -> CMSPageResponseData:
    return CMSPageResponseData(
        id=page.id,
        slug=page.slug,
        title=page.title,
        sections=page.sections or [],
        is_published=page.is_published,
        seo_title=page.seo_title,
        seo_description=page.seo_description,
        created_at=page.created_at,
        updated_at=page.updated_at
    )

# --- Site Endpoints ---
@router.get("/site", response_model=CMSSiteResponse)
async def get_site_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = CMSRepository(db)
    service = CMSService(repo)
    site = await service.get_site()
    return CMSSiteResponse(data=map_site_to_schema(site))

@router.put("/site", response_model=CMSSiteResponse)
async def update_site_settings(
    site_data: CMSSiteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = CMSRepository(db)
    service = CMSService(repo)
    site = await service.update_site(site_data)
    await db.commit()
    await db.refresh(site)
    return CMSSiteResponse(data=map_site_to_schema(site), message="Website settings updated successfully")


# --- Pages Endpoints ---
@router.get("/pages", response_model=CMSPageListResponse)
async def list_pages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = CMSRepository(db)
    service = CMSService(repo)
    pages = await service.list_pages()
    return CMSPageListResponse(data=[map_page_to_schema(p) for p in pages])

@router.get("/pages/{page_id}", response_model=CMSPageResponse)
async def get_page_details(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = CMSRepository(db)
    service = CMSService(repo)
    page = await service.get_page(page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return CMSPageResponse(data=map_page_to_schema(page))

@router.post("/pages", response_model=CMSPageResponse, status_code=status.HTTP_201_CREATED)
async def create_new_page(
    page_data: CMSPageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = CMSRepository(db)
    service = CMSService(repo)
    
    # Check if slug unique
    existing = await service.get_page_by_slug(page_data.slug)
    if existing:
        raise HTTPException(status_code=400, detail="A page with this slug already exists")
        
    page = await service.create_page(page_data)
    await db.commit()
    await db.refresh(page)
    return CMSPageResponse(data=map_page_to_schema(page), message="Page created successfully")

@router.patch("/pages/{page_id}", response_model=CMSPageResponse)
async def update_page_content(
    page_id: UUID,
    page_data: CMSPageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = CMSRepository(db)
    service = CMSService(repo)
    
    if page_data.slug:
        existing = await service.get_page_by_slug(page_data.slug)
        if existing and existing.id != page_id:
            raise HTTPException(status_code=400, detail="A page with this slug already exists")
            
    page = await service.update_page(page_id, page_data)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    await db.commit()
    await db.refresh(page)
    return CMSPageResponse(data=map_page_to_schema(page), message="Page content saved successfully")

@router.delete("/pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page_record(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = CMSRepository(db)
    service = CMSService(repo)
    page = await service.get_page(page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
        
    if page.slug == "home":
        raise HTTPException(status_code=400, detail="You cannot delete the root 'home' page")
        
    await service.delete_page(page_id)
    await db.commit()


# --- Public Preview & Publishing ---
@router.get("/preview/{slug}", response_class=HTMLResponse)
async def preview_page_html(
    slug: str,
    response: Response,
    school_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db)
):
    # Set headers to prevent iframe browser caching
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    # Manually configure tenant schema context (no auth validation needed for previews)
    from app.core.database import sanitize_schema_name
    schema_name = sanitize_schema_name(str(school_id))
    await db.execute(text(f"SET search_path TO {schema_name}, public"))
    
    repo = CMSRepository(db)
    service = CMSService(repo)
    html_content = await service.render_preview_html(slug, school_id)
    return html_content

@router.post("/publish", response_model=PublishResponse)
async def publish_website(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User account is not associated with any active school tenant")
        
    repo = CMSRepository(db)
    service = CMSService(repo)
    
    success, public_url = await service.publish_site(current_user.school_id)
    if not success:
        raise HTTPException(status_code=500, detail="Static site compilation failed")
        
    return PublishResponse(
        data=PublishResponseData(
            success=True,
            url=public_url,
            published_at=datetime.utcnow()
        ),
        message="Your website is now live!"
    )


import uuid
import os
import shutil

@router.post("/upload")
async def upload_custom_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User account is not associated with any active school tenant")
        
    allowed_types = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]
    is_image = file.content_type.startswith("image/")
    is_allowed_doc = file.content_type in allowed_types
    if not (is_image or is_allowed_doc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not supported. Allowed: Images, PDF, Word, Excel"
        )
        
    # Security check: Whitelist allowed file extensions to prevent RCE or script uploads
    file_ext = os.path.splitext(file.filename)[1].lower()
    safe_extensions = {
        ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"
    }
    if file_ext not in safe_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File extension not allowed. Only standard images and documents are supported."
        )
        
    school_id_str = str(current_user.school_id)
    upload_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), f"../static/published/uploads/{school_id_str}")
    )
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    if not file_ext:
        file_ext = ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    dest_path = os.path.join(upload_dir, unique_filename)
    
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {str(e)}"
        )
        
    return {
        "success": True,
        "url": f"/published/uploads/{school_id_str}/{unique_filename}"
    }


@router.get("/uploads")
async def list_uploaded_files(
    current_user: User = Depends(require_roles(["school_admin"]))
):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="User account is not associated with any active school tenant")
        
    school_id_str = str(current_user.school_id)
    upload_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), f"../static/published/uploads/{school_id_str}")
    )
    
    files_list = []
    if os.path.exists(upload_dir):
        for filename in os.listdir(upload_dir):
            file_path = os.path.join(upload_dir, filename)
            if os.path.isfile(file_path):
                stat_info = os.stat(file_path)
                file_ext = os.path.splitext(filename)[1].lower()
                
                # Simple type classification
                file_type = "image"
                if file_ext in [".pdf", ".doc", ".docx", ".xls", ".xlsx"]:
                    file_type = "document"
                    
                files_list.append({
                    "name": filename,
                    "url": f"/published/uploads/{school_id_str}/{filename}",
                    "size": stat_info.st_size,
                    "type": file_type,
                    "uploaded_at": datetime.fromtimestamp(stat_info.st_mtime).isoformat()
                })
                
    # Sort by uploaded_at descending
    files_list.sort(key=lambda x: x["uploaded_at"], reverse=True)
    return {
        "success": True,
        "data": files_list
    }



def map_inquiry_to_schema(inq) -> CMSInquiryResponseData:
    return CMSInquiryResponseData(
        id=inq.id,
        name=inq.name,
        email=inq.email,
        message=inq.message,
        status=inq.status,
        phone=getattr(inq, "phone", None),
        student_name=getattr(inq, "student_name", None),
        student_dob=getattr(inq, "student_dob", None),
        target_class_id=getattr(inq, "target_class_id", None),
        follow_up_notes=getattr(inq, "follow_up_notes", None) or [],
        target_class_name=f"{inq.target_class.name} - {inq.target_class.section}" if (getattr(inq, "target_class", None) and getattr(inq.target_class, "name", None)) else None,
        created_at=inq.created_at,
        updated_at=getattr(inq, "updated_at", inq.created_at)
    )

@router.get("/classes")
async def list_school_classes_public(
    school_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db)
):
    # Resolve school tenant schema context manually
    from app.core.database import sanitize_schema_name
    schema_name = sanitize_schema_name(str(school_id))
    await db.execute(text(f"SET search_path TO {schema_name}, public"))
    
    from app.models.tenant import Class
    result = await db.execute(
        select(Class).where(Class.deleted_at.is_(None)).order_by(Class.name)
    )
    classes = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": str(c.id),
                "name": c.name,
                "section": c.section
            }
            for c in classes
        ]
    }

@router.post("/inquiries", response_model=CMSInquiryResponse)
async def create_inquiry(
    inquiry_data: CMSInquiryCreate,
    school_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db)
):
    # Resolve school tenant schema context manually
    from app.core.database import sanitize_schema_name
    schema_name = sanitize_schema_name(str(school_id))
    await db.execute(text(f"SET search_path TO {schema_name}, public"))
    
    repo = CMSRepository(db)
    service = CMSService(repo)
    inquiry = await service.create_inquiry(inquiry_data)
    return CMSInquiryResponse(data=map_inquiry_to_schema(inquiry), message="Inquiry submitted successfully")

@router.get("/inquiries", response_model=CMSInquiryListResponse)
async def list_inquiries(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = CMSRepository(db)
    service = CMSService(repo)
    inquiries = await service.list_inquiries()
    return CMSInquiryListResponse(data=[map_inquiry_to_schema(inq) for inq in inquiries])

@router.patch("/inquiries/{inquiry_id}/status", response_model=CMSInquiryResponse)
async def update_inquiry_status(
    inquiry_id: UUID,
    status_val: str = Query(..., description="new, contacted, visit_scheduled, applied, admitted, archived, read, resolved"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    if status_val not in ["new", "contacted", "visit_scheduled", "applied", "admitted", "archived", "read", "resolved"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
        
    repo = CMSRepository(db)
    service = CMSService(repo)
    inquiry = await service.update_inquiry_status(inquiry_id, status_val)
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return CMSInquiryResponse(data=map_inquiry_to_schema(inquiry), message="Inquiry status updated")

@router.post("/inquiries/{inquiry_id}/notes", response_model=CMSInquiryResponse)
async def add_inquiry_note(
    inquiry_id: UUID,
    note_data: CMSInquiryNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = CMSRepository(db)
    service = CMSService(repo)
    inquiry = await service.add_follow_up_note(inquiry_id, note_data.note, note_data.author)
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return CMSInquiryResponse(data=map_inquiry_to_schema(inquiry), message="Note added successfully")

@router.post("/inquiries/{inquiry_id}/admit")
async def admit_inquiry(
    inquiry_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = CMSRepository(db)
    service = CMSService(repo)
    prefill_data = await service.convert_inquiry_to_admission(inquiry_id)
    if not prefill_data:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return {
        "success": True,
        "data": prefill_data,
        "message": "Lead converted successfully"
    }

