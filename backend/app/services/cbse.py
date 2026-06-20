# Phase: 1
import logging
from uuid import UUID
from typing import Dict, Any, List, Optional
from datetime import datetime
from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader

from app.repositories.cbse import CBSERepository
from app.models.tenant import CBSEProfile
from app.schemas.cbse import CBSEProfileCreate, CBSEComplianceStats, CBSESectionInfo, CBSESubjectInfo, CBSETeacherInfo

logger = logging.getLogger("cbse_service")

class CBSEService:
    def __init__(self, repo: CBSERepository):
        self.repo = repo

    async def get_profile(self) -> Optional[CBSEProfile]:
        return await self.repo.get_cbse_profile()

    async def update_profile(self, data: CBSEProfileCreate) -> CBSEProfile:
        profile_dict = data.model_dump()
        return await self.repo.upsert_cbse_profile(profile_dict)

    async def get_compliance_status(self) -> CBSEComplianceStats:
        aggregates = await self.repo.get_compliance_aggregates()
        
        total_students = aggregates["total_students"]
        total_teachers = aggregates["total_teachers"]
        total_sections = aggregates["total_sections"]
        sections = aggregates["sections"]
        subjects_missing_codes = aggregates["subjects_missing_codes"]
        teachers_missing_qualifications = aggregates["teachers_missing_qualifications"]
        all_teachers = aggregates.get("all_teachers", [])

        # Fetch CBSE Profile
        profile = await self.get_profile()
        if not profile:
            profile = CBSEProfile(
                affiliation_number=None,
                school_code=None,
                land_area_sq_mtrs=0.0,
                built_up_area_sq_mtrs=0.0,
                playground_area_sq_mtrs=0.0,
                classroom_count=0,
                composite_science_lab_count=0,
                math_lab_count=0,
                computer_lab_count=0,
                library_book_count=0,
                library_magazine_count=0,
                library_newspaper_count=0
            )

        # Calculate Student-Teacher Ratio
        if total_teachers > 0:
            student_teacher_ratio = total_students / total_teachers
        else:
            student_teacher_ratio = float(total_students)
        student_teacher_compliant = student_teacher_ratio <= 30.0

        # Calculate Teacher-Section Ratio
        if total_sections > 0:
            teacher_section_ratio = total_teachers / total_sections
        else:
            teacher_section_ratio = 0.0
        teacher_section_compliant = teacher_section_ratio >= 1.5

        # Check Overcapacity Sections (>40 students)
        sections_over_capacity_list = [
            CBSESectionInfo(
                id=s["id"],
                class_name=s["class_name"],
                section=s["section"],
                student_count=s["student_count"]
            )
            for s in sections if s["student_count"] > 40
        ]
        sections_over_capacity_compliant = len(sections_over_capacity_list) == 0

        # Check Subjects missing codes
        subjects_missing_list = [
            CBSESubjectInfo(
                id=sub["id"],
                name=sub["name"],
                code=sub["code"],
                description=sub["description"]
            )
            for sub in subjects_missing_codes
        ]
        subjects_compliant = len(subjects_missing_list) == 0

        # Check Teachers missing qualifications
        teachers_missing_list = [
            CBSETeacherInfo(
                id=t["id"],
                employee_code=t["employee_code"],
                first_name=t["first_name"],
                last_name=t["last_name"],
                designation=t["designation"],
                qualification=t["qualification"]
            )
            for t in teachers_missing_qualifications
        ]

        # Check Teachers missing professional teaching qualification (B.Ed/M.Ed/D.El.Ed/etc.)
        teachers_missing_professional_list = []
        for t in all_teachers:
            qual = t.get("qualification")
            if not qual or qual == "Not Configured":
                # Already tracked under missing qualifications
                continue
            
            q_lower = qual.lower().replace(".", "").replace(" ", "")
            keywords = ["bed", "med", "deled", "jbt", "ntt", "bped", "dped"]
            if not any(k in q_lower for k in keywords):
                teachers_missing_professional_list.append(
                    CBSETeacherInfo(
                        id=t["id"],
                        employee_code=t["employee_code"],
                        first_name=t["first_name"],
                        last_name=t["last_name"],
                        designation=t["designation"],
                        qualification=qual
                    )
                )

        # Land area compliance: CBSE standard is 4000 sq mtrs (or 6000 sq mtrs)
        land_area_required = 4000.0
        land_area_compliant = profile.land_area_sq_mtrs >= land_area_required

        # Library book compliance: CBSE standard is min 1500 books or 15 books per student, whichever is higher
        library_books_required = max(1500, 15 * total_students)
        library_books_compliant = profile.library_book_count >= library_books_required

        # Labs compliance: Composite science lab, math lab, computer lab must be >= 1
        missing_labs = []
        if profile.composite_science_lab_count < 1:
            missing_labs.append("Composite Science Laboratory")
        if profile.math_lab_count < 1:
            missing_labs.append("Mathematics Laboratory")
        if profile.computer_lab_count < 1:
            missing_labs.append("Computer Science Laboratory")
        labs_compliant = len(missing_labs) == 0

        return CBSEComplianceStats(
            total_students=total_students,
            total_teachers=total_teachers,
            student_teacher_ratio=round(student_teacher_ratio, 2),
            student_teacher_compliant=student_teacher_compliant,
            total_sections=total_sections,
            teacher_section_ratio=round(teacher_section_ratio, 2),
            teacher_section_compliant=teacher_section_compliant,
            sections_over_capacity=sections_over_capacity_list,
            sections_over_capacity_compliant=sections_over_capacity_compliant,
            subjects_missing_codes=subjects_missing_list,
            subjects_compliant=subjects_compliant,
            teachers_missing_qualifications=teachers_missing_list,
            teachers_missing_professional=teachers_missing_professional_list,
            land_area_compliant=land_area_compliant,
            land_area_required=land_area_required,
            library_books_compliant=library_books_compliant,
            library_books_required=library_books_required,
            labs_compliant=labs_compliant,
            missing_labs=missing_labs
        )

    async def generate_compliance_pdf(self, school_name: str, subdomain: str) -> bytes:
        profile = await self.get_profile()
        if not profile:
            # Fallback to an unconfigured model instances to avoid rendering errors
            profile = CBSEProfile(
                affiliation_number="Not Configured",
                school_code="Not Configured",
                land_area_sq_mtrs=0.0,
                built_up_area_sq_mtrs=0.0,
                playground_area_sq_mtrs=0.0,
                classroom_count=0,
                composite_science_lab_count=0,
                math_lab_count=0,
                computer_lab_count=0,
                library_book_count=0,
                library_magazine_count=0,
                library_newspaper_count=0
            )

        stats = await self.get_compliance_status()
        aggregates = await self.repo.get_compliance_aggregates()

        context = {
            "school_name": school_name,
            "subdomain": subdomain,
            "profile": profile,
            "stats": stats,
            "teachers": aggregates["all_teachers"],
            "subjects": aggregates["all_subjects"],
            "current_date": datetime.now().strftime("%B %d, %Y")
        }

        # Render HTML template using Jinja2
        template_dir = "/Users/amod/Documents/Products/Skolr/backend/app/templates"
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("cbse_fact_sheet.html")
        html_content = template.render(**context)

        # Render PDF bytes using WeasyPrint
        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes
