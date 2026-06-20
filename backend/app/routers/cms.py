from fastapi import APIRouter, Depends, Query, status, HTTPException
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
    PublishResponse, PublishResponseData
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


# --- Public Preview & Publishing ---
@router.get("/preview/{slug}", response_class=HTMLResponse)
async def preview_page_html(
    slug: str,
    school_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db)
):
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
