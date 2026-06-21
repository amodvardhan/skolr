import os
import shutil
from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from app.models.tenant import CMSSite, CMSPage, Employee, FeeStructure, FeeStructureItem, CMSInquiry
from app.repositories.cms import CMSRepository
from app.schemas.cms import CMSSiteUpdate, CMSPageCreate, CMSPageUpdate, CMSInquiryCreate

DEFAULT_PAGES_SEED = [
    {
        "slug": "home",
        "title": "Home",
        "sections": [
            {
                "id": "sec_hero",
                "type": "hero",
                "order": 1,
                "visible": True,
                "content": {
                    "tagline": "Empowering Minds, Shaping Futures",
                    "headline": "Welcome to Prestige Public School",
                    "subheadline": "Affiliated to CBSE | Pune's Premier Co-Educational Institution",
                    "cta_primary_label": "Apply Now",
                    "cta_primary_url": "/admissions",
                    "cta_secondary_label": "Explore Campus",
                    "cta_secondary_url": "/gallery",
                    "overlay_opacity": 0.4
                }
            },
            {
                "id": "sec_stats",
                "type": "stats",
                "order": 2,
                "visible": True,
                "content": {
                    "items": [
                        {"label": "Students Enrolled", "value": "1,200+", "icon": "Users"},
                        {"label": "Expert Faculty", "value": "80+", "icon": "GraduationCap"},
                        {"label": "Years of Legacy", "value": "25+", "icon": "Calendar"},
                        {"label": "Success Rate", "value": "100%", "icon": "Trophy"}
                    ]
                }
            },
            {
                "id": "sec_about",
                "type": "about",
                "order": 3,
                "visible": True,
                "content": {
                    "heading": "Our Vision & Mission",
                    "text": "At Prestige Public School, we nurture young minds to become independent, creative, and socially responsible citizens. Our holistic curriculum blends rigorous academics with diverse co-curricular programs to foster critical thinking, moral integrity, and lifelong learning.",
                    "image_url": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=800"
                }
            },
            {
                "id": "sec_testimonials",
                "type": "testimonials",
                "order": 4,
                "visible": True,
                "content": {
                    "heading": "What Parents Say",
                    "items": [
                        {"name": "Rajesh Patel", "role": "Parent of Class 5 Student", "text": "Prestige Public School offers an outstanding environment. The teachers are dedicated and the focus on individual student growth is unmatched."},
                        {"name": "Ananya Sen", "role": "Parent of Class 12 Alumni", "text": "The school's academic rigor and CBSE preparation helped my daughter secure admission to a top engineering college."}
                    ]
                }
            },
            {
                "id": "sec_contact",
                "type": "contact",
                "order": 5,
                "visible": True,
                "content": {
                    "heading": "Visit Our Campus",
                    "phone": "+91 98765 43210",
                    "email": "info@prestigeschool.edu.in",
                    "address": "12, Educational Avenue, Pune, Maharashtra",
                    "maps_iframe": ""
                }
            }
        ]
    },
    {
        "slug": "about",
        "title": "About",
        "sections": [
            {
                "id": "sec_about_hero",
                "type": "hero",
                "order": 1,
                "visible": True,
                "content": {
                    "tagline": "Who We Are",
                    "headline": "Academic Excellence & Character",
                    "subheadline": "Learn more about our heritage, vision, and leadership.",
                    "cta_primary_label": "Meet Faculty",
                    "cta_primary_url": "#faculty",
                    "cta_secondary_label": "Contact Us",
                    "cta_secondary_url": "/contact"
                }
            },
            {
                "id": "sec_about_main",
                "type": "about",
                "order": 2,
                "visible": True,
                "content": {
                    "heading": "Principal's Address",
                    "text": "It is my privilege to welcome you to Prestige Public School. We believe that education is not just about loading minds with facts, but inspiring a spirit of inquiry and excellence. Our world-class infrastructure, qualified teachers, and safe campus ensure every student thrives.",
                    "image_url": "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800"
                }
            },
            {
                "id": "sec_faculty",
                "type": "faculty",
                "order": 3,
                "visible": True,
                "content": {
                    "heading": "Our Experienced Educators",
                    "description": "Meet our team of dedicated subject matter experts and support staff."
                }
            }
        ]
    },
    {
        "slug": "admissions",
        "title": "Admissions",
        "sections": [
            {
                "id": "sec_admissions_hero",
                "type": "hero",
                "order": 1,
                "visible": True,
                "content": {
                    "tagline": "Enroll Now",
                    "headline": "Admissions Open for AY 2026-27",
                    "subheadline": "Join our learning community. Simple online application and clear evaluation guidelines.",
                    "cta_primary_label": "Download Syllabus",
                    "cta_primary_url": "#",
                    "cta_secondary_label": "Fee Structure",
                    "cta_secondary_url": "#fees"
                }
            },
            {
                "id": "sec_admissions_main",
                "type": "about",
                "order": 2,
                "visible": True,
                "content": {
                    "heading": "How to Apply",
                    "text": "1. Online Registration: Fill out the application form on our portal.\n2. Document Submission: Upload Aadhaar, birth certificate, and previous marksheets.\n3. Interactive Evaluation: Attend a short interview/test at the campus.\n4. Admission Confirmation: Complete fee payment to lock the seat.",
                    "image_url": "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=800"
                }
            },
            {
                "id": "sec_admissions_fees",
                "type": "admissions",
                "order": 3,
                "visible": True,
                "content": {
                    "heading": "Fee Structures",
                    "description": "Annual/term fee guidelines configured by our finance division."
                }
            }
        ]
    },
    {
        "slug": "gallery",
        "title": "Gallery",
        "sections": [
            {
                "id": "sec_gallery_hero",
                "type": "hero",
                "order": 1,
                "visible": True,
                "content": {
                    "tagline": "Life at Prestige",
                    "headline": "Campus Life & Facilities",
                    "subheadline": "Explore our classrooms, laboratories, sports grounds, and activities."
                }
            },
            {
                "id": "sec_gallery_grid",
                "type": "gallery",
                "order": 2,
                "visible": True,
                "content": {
                    "heading": "Classroom & Science Labs",
                    "images": [
                        {"url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=600", "caption": "Smart Classrooms"},
                        {"url": "https://images.unsplash.com/photo-1564981797816-1043d01a17da?auto=format&fit=crop&q=80&w=600", "caption": "Science Laboratories"},
                        {"url": "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=600", "caption": "School Library"},
                        {"url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600", "caption": "Yoga & Fitness"},
                        {"url": "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=600", "caption": "Computer Science Lab"},
                        {"url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600", "caption": "Sports Ground"}
                    ]
                }
            }
        ]
    },
    {
        "slug": "contact",
        "title": "Contact",
        "sections": [
            {
                "id": "sec_contact_hero",
                "type": "hero",
                "order": 1,
                "visible": True,
                "content": {
                    "tagline": "Get in Touch",
                    "headline": "We'd Love to Hear From You",
                    "subheadline": "Have questions about admissions, fees, or curricula? Reach out to our helpdesk."
                }
            },
            {
                "id": "sec_contact_main",
                "type": "contact",
                "order": 2,
                "visible": True,
                "content": {
                    "heading": "Contact Details",
                    "phone": "+91 98765 43210",
                    "email": "info@prestigeschool.edu.in",
                    "address": "12, Educational Avenue, Pune, Maharashtra",
                    "maps_iframe": ""
                }
            }
        ]
    }
]

class CMSService:
    def __init__(self, repo: CMSRepository):
        self.repo = repo
        # Configure Jinja2 Loader targeting the workspace templates root
        # Resolves template files from absolute workspace locations
        templates_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../../../cms-templates")
        )
        self.jinja_env = Environment(
            loader=FileSystemLoader(templates_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )

    async def ensure_inquiries_table(self):
        try:
            # 1. Create table with initial columns if not exists
            await self.repo.db.execute(text("""
                CREATE TABLE IF NOT EXISTS cms_inquiries (
                    id UUID PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(100) NOT NULL,
                    message VARCHAR(1000) NOT NULL,
                    status VARCHAR(30) DEFAULT 'new' NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    deleted_at TIMESTAMP WITH TIME ZONE
                )
            """))
            await self.repo.db.commit()
        except Exception:
            await self.repo.db.rollback()

        # Add each new column individually, catching errors so it works on any DB (Postgres/SQLite)
        cols = [
            ("phone", "VARCHAR(20) NULL"),
            ("student_name", "VARCHAR(100) NULL"),
            ("student_dob", "DATE NULL"),
            ("target_class_id", "UUID REFERENCES classes(id) ON DELETE SET NULL"),
            ("follow_up_notes", "JSONB DEFAULT '[]'::jsonb NOT NULL")
        ]
        for col_name, col_def in cols:
            try:
                await self.repo.db.execute(text(f"ALTER TABLE cms_inquiries ADD COLUMN {col_name} {col_def}"))
                await self.repo.db.commit()
            except Exception:
                await self.repo.db.rollback()

        # Alter status column type to support length 30
        try:
            await self.repo.db.execute(text("ALTER TABLE cms_inquiries ALTER COLUMN status TYPE VARCHAR(30)"))
            await self.repo.db.commit()
        except Exception:
            await self.repo.db.rollback()

    async def get_site(self) -> CMSSite:
        # Self-heal database schema if inquiries table is missing
        await self.ensure_inquiries_table()
        site = await self.repo.get_site()
        # Seed default pages if none exist in page repository
        pages = await self.repo.list_pages()
        if len(pages) == 0:
            for seed in DEFAULT_PAGES_SEED:
                await self.repo.create_page(CMSPageCreate(**seed))
            await self.repo.db.commit()
        return site

    async def update_site(self, data: CMSSiteUpdate) -> CMSSite:
        return await self.repo.update_site(data)

    async def list_pages(self) -> List[CMSPage]:
        # Trigger initialization check
        await self.get_site()
        return await self.repo.list_pages()

    async def get_page(self, page_id: UUID) -> Optional[CMSPage]:
        return await self.repo.get_page_by_id(page_id)

    async def get_page_by_slug(self, slug: str) -> Optional[CMSPage]:
        return await self.repo.get_page_by_slug(slug)

    async def create_page(self, data: CMSPageCreate) -> CMSPage:
        return await self.repo.create_page(data)

    async def update_page(self, page_id: UUID, data: CMSPageUpdate) -> Optional[CMSPage]:
        return await self.repo.update_page(page_id, data)

    async def delete_page(self, page_id: UUID) -> bool:
        return await self.repo.delete_page(page_id)

    async def get_live_erp_data(self) -> Dict[str, Any]:
        # Resolve active staff faculty details
        staff_res = await self.repo.db.execute(
            select(Employee)
            .where(Employee.deleted_at.is_(None), Employee.status == "active")
            .order_by(Employee.first_name)
        )
        staff = staff_res.scalars().all()
        faculty_list = []
        for s in staff:
            faculty_list.append({
                "name": f"{s.first_name} {s.last_name}",
                "designation": s.designation,
                "qualification": s.qualification or "Educator",
                "email": s.email
            })

        # Resolve academic fee structures
        fees_res = await self.repo.db.execute(
            select(FeeStructure).where(FeeStructure.deleted_at.is_(None))
        )
        structures = fees_res.scalars().all()
        fees_list = []
        for fs in structures:
            items_res = await self.repo.db.execute(
                select(FeeStructureItem).where(
                    FeeStructureItem.fee_structure_id == fs.id,
                    FeeStructureItem.deleted_at.is_(None)
                )
            )
            items = items_res.scalars().all()
            total_amount = sum(item.amount for item in items)
            fees_list.append({
                "name": fs.name,
                "total_amount": total_amount,
                "breakdown": [{"head": item.fee_head_id, "amount": item.amount} for item in items]
            })

        return {
            "faculty": faculty_list,
            "fees": fees_list
        }

    async def render_preview_html(self, slug: str, school_id: UUID) -> str:
        site = await self.get_site()
        page = await self.repo.get_page_by_slug(slug)
        if not page:
            page = await self.repo.get_page_by_slug("home")
            if not page:
                return "<html><body><h1>Site Under Construction</h1></body></html>"

        erp_data = await self.get_live_erp_data()
        all_pages = await self.repo.list_pages()

        # Build template context variables
        template_name = f"{site.template_id}/index.html"
        template_dir_path = os.path.join(self.jinja_env.loader.searchpath[0], site.template_id)
        active_template_id = site.template_id
        if not os.path.exists(template_dir_path):
            template_name = "template-001-prestige/index.html"
            active_template_id = "template-001-prestige"
        
        # Resolve active color scheme color settings
        color_theme = {
            "primary": "#1E3A5F",
            "accent": "#F5A623",
            "bg": "#FFFFFF",
            "neutral": "#0F172A"
        }
        if site.color_scheme == "Forest & Cream":
            color_theme = {
                "primary": "#1B4332",
                "accent": "#D4A853",
                "bg": "#FAFAF7",
                "neutral": "#1F2937"
            }
        elif site.color_scheme == "Earthy & Warm":
            color_theme = {
                "primary": "#78350F",
                "accent": "#D97706",
                "bg": "#FFFBEB",
                "neutral": "#451A03"
            }

        context = {
            "site": site,
            "page": page,
            "all_pages": all_pages,
            "theme": color_theme,
            "erp": erp_data,
            "preview_mode": True,
            "school_id": str(school_id),
            "active_template_id": active_template_id,
            "cache_bust": str(datetime.utcnow().timestamp())
        }

        try:
            template = self.jinja_env.get_template(template_name)
            return template.render(**context)
        except Exception as e:
            import traceback
            traceback.print_exc()
            # Fallback inline layout if template files are missing or syntax is wrong
            return f"<html><body><h1>Template Render Error</h1><p>{str(e)}</p></body></html>"

    async def publish_site(self, school_id: UUID) -> Tuple[bool, str]:
        site = await self.get_site()
        pages = await self.repo.list_pages()
        
        # Build local target directory
        published_dir = os.path.abspath(
            os.path.join(
                os.path.dirname(__file__),
                f"../static/published/{str(school_id)}"
            )
        )
        os.makedirs(published_dir, exist_ok=True)
        
        # Copy template assets (styles, preview elements)
        template_assets_dir = os.path.abspath(
            os.path.join(
                os.path.dirname(__file__),
                f"../../../cms-templates/{site.template_id}/styles"
            )
        )
        if not os.path.exists(template_assets_dir):
            template_assets_dir = os.path.abspath(
                os.path.join(
                    os.path.dirname(__file__),
                    "../../../cms-templates/template-001-prestige/styles"
                )
            )

        if os.path.exists(template_assets_dir):
            target_styles_dir = os.path.join(published_dir, "styles")
            os.makedirs(target_styles_dir, exist_ok=True)
            for f in os.listdir(template_assets_dir):
                shutil.copy2(
                    os.path.join(template_assets_dir, f),
                    os.path.join(target_styles_dir, f)
                )

        erp_data = await self.get_live_erp_data()
        
        # Resolve active color scheme color settings
        color_theme = {
            "primary": "#1E3A5F",
            "accent": "#F5A623",
            "bg": "#FFFFFF",
            "neutral": "#0F172A"
        }
        if site.color_scheme == "Forest & Cream":
            color_theme = {
                "primary": "#1B4332",
                "accent": "#D4A853",
                "bg": "#FAFAF7",
                "neutral": "#1F2937"
            }
        elif site.color_scheme == "Earthy & Warm":
            color_theme = {
                "primary": "#78350F",
                "accent": "#D97706",
                "bg": "#FFFBEB",
                "neutral": "#451A03"
            }

        # Statically render all pages
        template_name = f"{site.template_id}/index.html"
        template_dir_path = os.path.join(self.jinja_env.loader.searchpath[0], site.template_id)
        if not os.path.exists(template_dir_path):
            template_name = "template-001-prestige/index.html"

        for page in pages:
            if not page.is_published:
                continue
                
            context = {
                "site": site,
                "page": page,
                "all_pages": pages,
                "theme": color_theme,
                "erp": erp_data,
                "preview_mode": False,
                "school_id": str(school_id)
            }
            
            template = self.jinja_env.get_template(template_name)
            html_content = template.render(**context)
            
            # Write page file
            filename = f"{page.slug}.html"
            filepath = os.path.join(published_dir, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(html_content)
                
            # If home page, also write as index.html
            if page.slug == "home":
                index_filepath = os.path.join(published_dir, "index.html")
                with open(index_filepath, "w", encoding="utf-8") as f:
                    f.write(html_content)

        # Mark site as published
        await self.repo.update_site(CMSSiteUpdate(is_published=True))
        await self.repo.db.commit()

        # Return local browsing URL endpoint
        public_url = f"/published/{str(school_id)}/index.html"
        return True, public_url

    async def create_inquiry(self, data: CMSInquiryCreate) -> CMSInquiry:
        # Self-heal table schema if missing
        await self.ensure_inquiries_table()
        inquiry = CMSInquiry(
            name=data.name,
            email=data.email,
            message=data.message,
            phone=data.phone,
            student_name=data.student_name,
            student_dob=data.student_dob,
            target_class_id=data.target_class_id,
            status="new",
            follow_up_notes=[]
        )
        self.repo.db.add(inquiry)
        await self.repo.db.commit()
        await self.repo.db.refresh(inquiry)
        return inquiry

    async def list_inquiries(self) -> List[CMSInquiry]:
        await self.ensure_inquiries_table()
        result = await self.repo.db.execute(
            select(CMSInquiry)
            .where(CMSInquiry.deleted_at.is_(None))
            .options(selectinload(CMSInquiry.target_class))
            .order_by(CMSInquiry.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_inquiry_status(self, inquiry_id: UUID, status: str) -> Optional[CMSInquiry]:
        await self.ensure_inquiries_table()
        result = await self.repo.db.execute(
            select(CMSInquiry)
            .where(CMSInquiry.id == inquiry_id, CMSInquiry.deleted_at.is_(None))
            .options(selectinload(CMSInquiry.target_class))
        )
        inquiry = result.scalar_one_or_none()
        if not inquiry:
            return None
            
        inquiry.status = status
        inquiry.updated_at = datetime.utcnow()
        await self.repo.db.commit()
        await self.repo.db.refresh(inquiry)
        return inquiry

    async def add_follow_up_note(self, inquiry_id: UUID, note_text: str, author: str) -> Optional[CMSInquiry]:
        await self.ensure_inquiries_table()
        import uuid
        result = await self.repo.db.execute(
            select(CMSInquiry)
            .where(CMSInquiry.id == inquiry_id, CMSInquiry.deleted_at.is_(None))
            .options(selectinload(CMSInquiry.target_class))
        )
        inquiry = result.scalar_one_or_none()
        if not inquiry:
            return None
            
        # Copy to trigger SQLAlchemy update detection for JSONB
        notes = list(inquiry.follow_up_notes or [])
        notes.append({
            "id": str(uuid.uuid4()),
            "note": note_text,
            "author": author,
            "created_at": datetime.utcnow().isoformat()
        })
        inquiry.follow_up_notes = notes
        inquiry.updated_at = datetime.utcnow()
        await self.repo.db.commit()
        await self.repo.db.refresh(inquiry)
        return inquiry

    async def convert_inquiry_to_admission(self, inquiry_id: UUID) -> Optional[Dict[str, Any]]:
        await self.ensure_inquiries_table()
        result = await self.repo.db.execute(
            select(CMSInquiry)
            .where(CMSInquiry.id == inquiry_id, CMSInquiry.deleted_at.is_(None))
            .options(selectinload(CMSInquiry.target_class))
        )
        inquiry = result.scalar_one_or_none()
        if not inquiry:
            return None

        # Update status to admitted and log follow-up note
        inquiry.status = "admitted"
        import uuid
        notes = list(inquiry.follow_up_notes or [])
        notes.append({
            "id": str(uuid.uuid4()),
            "note": "Converted lead to ERP Admission profile.",
            "author": "System",
            "created_at": datetime.utcnow().isoformat()
        })
        inquiry.follow_up_notes = notes
        inquiry.updated_at = datetime.utcnow()
        await self.repo.db.commit()
        await self.repo.db.refresh(inquiry)

        # Parse parent name
        p_name = inquiry.name or ""
        p_parts = p_name.strip().split(None, 1)
        p_first = p_parts[0] if p_parts else "Parent"
        p_last = p_parts[1] if len(p_parts) > 1 else ""

        # Parse student name
        s_name = inquiry.student_name or ""
        s_parts = s_name.strip().split(None, 1)
        s_first = s_parts[0] if s_parts else "Student"
        s_last = s_parts[1] if len(s_parts) > 1 else ""

        from datetime import date
        prefill_data = {
            "first_name": s_first,
            "last_name": s_last,
            "date_of_birth": inquiry.student_dob.isoformat() if inquiry.student_dob else None,
            "gender": "M",
            "admission_date": date.today().isoformat(),
            "class_id": str(inquiry.target_class_id) if inquiry.target_class_id else None,
            "parents": [
                {
                    "parent_type": "guardian",
                    "first_name": p_first,
                    "last_name": p_last,
                    "mobile": inquiry.phone or "",
                    "email": inquiry.email,
                    "occupation": ""
                }
            ]
        }
        return prefill_data
