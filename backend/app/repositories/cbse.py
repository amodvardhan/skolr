from uuid import UUID
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.models.tenant import CBSEProfile, Employee, Student, Class, Subject

class CBSERepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_cbse_profile(self) -> Optional[CBSEProfile]:
        result = await self.db.execute(
            select(CBSEProfile).where(CBSEProfile.deleted_at.is_(None)).limit(1)
        )
        return result.scalar_one_or_none()

    async def upsert_cbse_profile(self, data: Dict[str, Any]) -> CBSEProfile:
        existing = await self.get_cbse_profile()
        if existing:
            for key, val in data.items():
                setattr(existing, key, val)
            existing.updated_at = datetime.utcnow()
            await self.db.flush()
            return existing
        else:
            new_profile = CBSEProfile(**data)
            self.db.add(new_profile)
            await self.db.flush()
            return new_profile

    async def get_compliance_aggregates(self) -> Dict[str, Any]:
        # 1. Total Active Students
        student_count_query = select(func.count(Student.id)).where(
            Student.status == "active",
            Student.deleted_at.is_(None)
        )
        total_students = await self.db.scalar(student_count_query) or 0

        # 2. Total Active Teachers
        teacher_count_query = select(func.count(Employee.id)).where(
            Employee.status == "active",
            Employee.deleted_at.is_(None),
            or_(
                Employee.designation.ilike("%teacher%"),
                Employee.department.ilike("%academic%")
            )
        )
        total_teachers = await self.db.scalar(teacher_count_query) or 0

        # 3. Total Active Sections/Classes
        section_count_query = select(func.count(Class.id)).where(
            Class.deleted_at.is_(None)
        )
        total_sections = await self.db.scalar(section_count_query) or 0

        # 4. Sections student counts
        sections_query = (
            select(
                Class.id,
                Class.name,
                Class.section,
                func.count(Student.id).label("student_count")
            )
            .outerjoin(Student, Student.class_id == Class.id)
            .where(
                Class.deleted_at.is_(None),
                or_(Student.status == "active", Student.id.is_(None)),
                or_(Student.deleted_at.is_(None), Student.id.is_(None))
            )
            .group_by(Class.id, Class.name, Class.section)
        )
        sections_result = await self.db.execute(sections_query)
        sections_data = []
        for row in sections_result.all():
            sections_data.append({
                "id": row.id,
                "class_name": row.name,
                "section": row.section,
                "student_count": row.student_count
            })

        # 5. Subjects missing CBSE codes
        # We assume code is missing if it is empty, null, or is not set
        subjects_query = select(Subject).where(
            Subject.deleted_at.is_(None),
            or_(Subject.code.is_(None), Subject.code == "")
        )
        subjects_result = await self.db.execute(subjects_query)
        subjects_missing_codes = []
        for sub in subjects_result.scalars().all():
            subjects_missing_codes.append({
                "id": sub.id,
                "name": sub.name,
                "code": sub.code or "",
                "description": sub.description
            })

        # 6. Teachers missing qualifications
        teachers_query = select(Employee).where(
            Employee.status == "active",
            Employee.deleted_at.is_(None),
            or_(
                Employee.designation.ilike("%teacher%"),
                Employee.department.ilike("%academic%")
            ),
            or_(Employee.qualification.is_(None), Employee.qualification == "")
        )
        teachers_result = await self.db.execute(teachers_query)
        teachers_missing_qualifications = []
        for emp in teachers_result.scalars().all():
            teachers_missing_qualifications.append({
                "id": emp.id,
                "employee_code": emp.employee_code,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "designation": emp.designation,
                "qualification": emp.qualification
            })

        # 7. List of all active teachers for fact sheet report
        all_teachers_query = select(Employee).where(
            Employee.status == "active",
            Employee.deleted_at.is_(None),
            or_(
                Employee.designation.ilike("%teacher%"),
                Employee.department.ilike("%academic%")
            )
        ).order_by(Employee.first_name)
        all_teachers_result = await self.db.execute(all_teachers_query)
        all_teachers = []
        for emp in all_teachers_result.scalars().all():
            all_teachers.append({
                "id": emp.id,
                "employee_code": emp.employee_code,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "designation": emp.designation,
                "qualification": emp.qualification or "Not Configured",
                "date_of_joining": emp.date_of_joining,
                "employment_type": emp.employment_type
            })

        # 8. List of all subjects for fact sheet report
        all_subjects_query = select(Subject).where(Subject.deleted_at.is_(None)).order_by(Subject.name)
        all_subjects_result = await self.db.execute(all_subjects_query)
        all_subjects = []
        for sub in all_subjects_result.scalars().all():
            all_subjects.append({
                "name": sub.name,
                "code": sub.code or "Not Configured"
            })

        return {
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_sections": total_sections,
            "sections": sections_data,
            "subjects_missing_codes": subjects_missing_codes,
            "teachers_missing_qualifications": teachers_missing_qualifications,
            "all_teachers": all_teachers,
            "all_subjects": all_subjects
        }
