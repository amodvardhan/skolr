from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import datetime
from typing import List, Optional

from app.models.tenant import CMSSite, CMSPage
from app.schemas.cms import CMSSiteUpdate, CMSPageCreate, CMSPageUpdate

class CMSRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_site(self) -> CMSSite:
        # Check if CMSSite exists
        result = await self.db.execute(
            select(CMSSite).where(CMSSite.deleted_at.is_(None)).limit(1)
        )
        site = result.scalar_one_or_none()
        if not site:
            # Create a default one if none exists
            site = CMSSite(
                template_id="template-001-prestige",
                color_scheme="Navy & Gold",
                is_published=False,
                settings={
                    "admissions_open": True,
                    "phone": "+91 98765 43210",
                    "email": "info@prestigeschool.edu.in",
                    "address": "12, Educational Avenue, Knowledge Park, Pune, Maharashtra",
                    "facebook_url": "https://facebook.com/prestigeschool",
                    "instagram_url": "https://instagram.com/prestigeschool",
                    "twitter_url": "",
                    "linkedin_url": ""
                }
            )
            self.db.add(site)
            await self.db.flush()
        return site

    async def update_site(self, data: CMSSiteUpdate) -> CMSSite:
        site = await self.get_site()
        if data.template_id is not None:
            site.template_id = data.template_id
        if data.color_scheme is not None:
            site.color_scheme = data.color_scheme
        if data.is_published is not None:
            site.is_published = data.is_published
            if data.is_published:
                site.published_at = datetime.utcnow()
        if data.settings is not None:
            # Merge settings
            current_settings = dict(site.settings or {})
            current_settings.update(data.settings)
            site.settings = current_settings
            
        await self.db.flush()
        return site

    async def list_pages(self) -> List[CMSPage]:
        result = await self.db.execute(
            select(CMSPage)
            .where(CMSPage.deleted_at.is_(None))
            .order_by(CMSPage.slug)
        )
        return list(result.scalars().all())

    async def get_page_by_id(self, page_id: UUID) -> Optional[CMSPage]:
        result = await self.db.execute(
            select(CMSPage).where(
                and_(CMSPage.id == page_id, CMSPage.deleted_at.is_(None))
            )
        )
        return result.scalar_one_or_none()

    async def get_page_by_slug(self, slug: str) -> Optional[CMSPage]:
        result = await self.db.execute(
            select(CMSPage).where(
                and_(CMSPage.slug == slug, CMSPage.deleted_at.is_(None))
            )
        )
        return result.scalar_one_or_none()

    async def create_page(self, data: CMSPageCreate) -> CMSPage:
        page = CMSPage(
            slug=data.slug.lower().strip(),
            title=data.title.strip(),
            sections=data.sections or [],
            is_published=data.is_published if data.is_published is not None else True,
            seo_title=data.seo_title,
            seo_description=data.seo_description
        )
        self.db.add(page)
        await self.db.flush()
        return page

    async def update_page(self, page_id: UUID, data: CMSPageUpdate) -> Optional[CMSPage]:
        page = await self.get_page_by_id(page_id)
        if not page:
            return None
        
        if data.slug is not None:
            page.slug = data.slug.lower().strip()
        if data.title is not None:
            page.title = data.title.strip()
        if data.sections is not None:
            page.sections = data.sections
        if data.is_published is not None:
            page.is_published = data.is_published
        if data.seo_title is not None:
            page.seo_title = data.seo_title
        if data.seo_description is not None:
            page.seo_description = data.seo_description

        await self.db.flush()
        return page

    async def delete_page(self, page_id: UUID) -> bool:
        page = await self.get_page_by_id(page_id)
        if not page:
            return False
        page.deleted_at = datetime.utcnow()
        await self.db.flush()
        return True
