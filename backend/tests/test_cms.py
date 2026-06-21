import asyncio
import os
import shutil
import sys
import traceback
import pytest
from uuid import UUID
from sqlalchemy import select, text

sys.path.append("/Users/amod/Documents/Products/Skolr/backend")

from app.core.database import AsyncSessionLocal
from app.models.tenant import CMSSite, CMSPage
from app.models.public import Tenant
from app.repositories.cms import CMSRepository
from app.services.cms import CMSService
from app.schemas.cms import CMSSiteUpdate, CMSPageCreate, CMSPageUpdate

DEFAULT_SCHOOL_ID = "11111111-1111-1111-1111-111111111111"

@pytest.mark.asyncio
async def test_cms_flow():
    print("Starting CMS & Website Builder integration test...")
    async with AsyncSessionLocal() as db:
        repo = CMSRepository(db)
        service = CMSService(repo)
        
        # 1. Fetch first tenant
        result = await db.execute(select(Tenant).limit(1))
        tenant = result.scalar_one_or_none()
        if not tenant:
            print("No tenants found. Can't run test.")
            return
            
        tenant_id = tenant.id
        print(f"Testing with Tenant: {tenant.name} ({tenant_id})")
        
        # Switch search path to tenant schema
        from app.core.database import sanitize_schema_name, SkolrBase
        schema_name = sanitize_schema_name(str(tenant_id))
        await db.execute(text(f"SET search_path TO {schema_name}, public"))
        
        # Ensure all tables (including newly added CMS tables) exist in this schema
        conn = await db.connection()
        await conn.execute(text(f"SET search_path TO {schema_name}, public"))
        await conn.run_sync(SkolrBase.metadata.create_all)
        
        # 2. Get Site (triggers default pages initialization)
        print("\n--- Getting Site (and seeding default pages) ---")
        site = await service.get_site()
        site = await service.update_site(CMSSiteUpdate(template_id="template-001-prestige", color_scheme="Navy & Gold"))
        await db.commit()
        print(f"Site Loaded. Template: {site.template_id}, Color Scheme: {site.color_scheme}")
        assert site.template_id == "template-001-prestige"
        
        pages = await service.list_pages()
        print(f"Total pages initialized: {len(pages)}")
        for p in pages:
            print(f"  Page: {p.title} (slug: {p.slug}, sections: {len(p.sections)})")
        assert len(pages) >= 5
        assert any(p.slug == "home" for p in pages)
        assert any(p.slug == "about" for p in pages)
        
        # 3. Create a new custom page
        print("\n--- Creating a new custom page ---")
        custom_slug = "test-facilities"
        # Delete if exists
        existing = await service.get_page_by_slug(custom_slug)
        if existing:
            await service.delete_page(existing.id)
            await db.commit()
            
        new_page_data = CMSPageCreate(
            slug=custom_slug,
            title="Modern Labs & Sports Complex",
            sections=[
                {
                    "id": "sec_labs_hero",
                    "type": "hero",
                    "order": 1,
                    "visible": True,
                    "content": {
                        "tagline": "Campus tour",
                        "headline": "Modern Chemistry Lab",
                        "subheadline": "Equipped with latest standard equipment for secondary grades."
                    }
                }
            ]
        )
        custom_page = await service.create_page(new_page_data)
        await db.commit()
        print(f"Created custom page: {custom_page.title} (ID: {custom_page.id})")
        assert custom_page.slug == custom_slug
        
        # 4. Update the page
        print("\n--- Updating custom page ---")
        update_data = CMSPageUpdate(
            title="Labs, Library & Complex",
            sections=[
                {
                    "id": "sec_labs_hero",
                    "type": "hero",
                    "order": 1,
                    "visible": True,
                    "content": {
                        "tagline": "Campus tour",
                        "headline": "Updated Labs & Library",
                        "subheadline": "Equipped with latest standard equipment."
                    }
                },
                {
                    "id": "sec_stats_custom",
                    "type": "stats",
                    "order": 2,
                    "visible": True,
                    "content": {
                        "items": [
                            {"label": "Research Labs", "value": "5"},
                            {"label": "Total Volumes", "value": "15,000+"}
                        ]
                    }
                }
            ]
        )
        updated_page = await service.update_page(custom_page.id, update_data)
        await db.commit()
        print(f"Updated page: {updated_page.title}, total sections: {len(updated_page.sections)}")
        assert len(updated_page.sections) == 2
        assert updated_page.sections[1]["type"] == "stats"
        
        # 5. Test Live HTML Preview rendering
        print("\n--- Testing render_preview_html ---")
        html_preview = await service.render_preview_html(custom_slug, tenant_id)
        print(f"Rendered Preview Length: {len(html_preview)}")
        if "Updated Labs & Library" not in html_preview:
            print(f"DEBUG - Rendered Preview HTML: {html_preview}")
        # Check that sections are rendered in HTML
        assert "Updated Labs &amp; Library" in html_preview
        assert "Research Labs" in html_preview
        assert "Total Volumes" in html_preview
        print("SUCCESS: Preview HTML renders sections successfully!")
        
        # 6. Test Publishing Site
        print("\n--- Testing publish_site ---")
        published_dir = os.path.abspath(
            os.path.join(
                os.path.dirname(__file__),
                f"../app/static/published/{str(tenant_id)}"
            )
        )
        # Clear existing published folder if any
        # Ensure all pages are published for the test to succeed
        all_pages_to_pub = await service.list_pages()
        for p in all_pages_to_pub:
            await service.update_page(p.id, CMSPageUpdate(is_published=True))
        await db.commit()

        if os.path.exists(published_dir):
            shutil.rmtree(published_dir)
            
        success, url = await service.publish_site(tenant_id)
        print(f"Publish result: success={success}, url={url}")
        assert success
        assert os.path.exists(published_dir)
        
        # Verify files are generated
        pages_to_check = ["home.html", "index.html", "about.html", "admissions.html", "contact.html", "gallery.html", f"{custom_slug}.html"]
        for filename in pages_to_check:
            filepath = os.path.join(published_dir, filename)
            print(f"Checking filepath: {filepath} (exists: {os.path.exists(filepath)})")
            assert os.path.exists(filepath)
            print(f"  Verified static file exists: {filename}")
            
        # Verify CSS stylesheet directories
        assert os.path.exists(os.path.join(published_dir, "styles", "main.css"))
        assert os.path.exists(os.path.join(published_dir, "styles", "variables.css"))
        print("  Verified stylesheet assets copied.")
        
        # 7. Clean up custom page & published files
        print("\n--- Cleaning up test records & files ---")
        await service.delete_page(custom_page.id)
        # Reset is_published back to false
        await service.update_site(CMSSiteUpdate(is_published=False))
        await db.commit()
        
        if os.path.exists(published_dir):
            shutil.rmtree(published_dir)
            
        print("SUCCESS: Cleaned up DB records and static folders.")
        print("\nSUCCESS: All CMS integration tests passed!")

if __name__ == "__main__":
    asyncio.run(test_cms_flow())
