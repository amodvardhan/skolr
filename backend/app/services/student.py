from uuid import UUID
from typing import List, Tuple, Optional
from sqlalchemy import select
from fastapi import HTTPException, status
from datetime import datetime

from app.repositories.student import StudentRepository
from app.models.tenant import Student, StudentParent, Class, AcademicYear
from app.schemas.student import StudentCreate, StudentUpdate

class StudentService:
    def __init__(self, repo: StudentRepository):
        self.repo = repo

    async def admit_student(self, data: StudentCreate, school_id: Optional[UUID] = None) -> Student:
        # 1. Verify class allocation exists
        class_result = await self.repo.db.execute(
            select(Class).where(Class.id == data.class_id, Class.deleted_at.is_(None))
        )
        cls = class_result.scalar_one_or_none()
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target class with ID {data.class_id} not found"
            )

        # 2. Retrieve active academic year to prefix admission number
        ay_result = await self.repo.db.execute(
            select(AcademicYear).where(AcademicYear.id == cls.academic_year_id)
        )
        ay = ay_result.scalar_one_or_none()
        year_prefix = ay.name.split("-")[0] if ay else str(datetime.utcnow().year)

        # 3. Generate unique sequential admission number
        # Query all existing admission numbers matching the pattern to find the maximum serial
        prefix = f"ADM-{year_prefix}-"
        result = await self.repo.db.execute(
            select(Student.admission_number)
            .where(Student.admission_number.like(f"{prefix}%"))
        )
        existing_numbers = result.scalars().all()
        max_serial = 0
        for num in existing_numbers:
            try:
                serial_part = num.replace(prefix, "")
                val = int(serial_part)
                if val > max_serial:
                    max_serial = val
            except ValueError:
                pass
        
        # Fallback to checking the legacy/seeded format without hyphen, e.g. ADM2025001
        legacy_prefix = f"ADM{year_prefix}"
        result_legacy = await self.repo.db.execute(
            select(Student.admission_number)
            .where(Student.admission_number.like(f"{legacy_prefix}%"))
        )
        existing_legacy = result_legacy.scalars().all()
        for num in existing_legacy:
            try:
                serial_part = num.replace(legacy_prefix, "")
                val = int(serial_part)
                if val > max_serial:
                    max_serial = val
            except ValueError:
                pass

        serial = f"{max_serial + 1:04d}"
        admission_number = f"{prefix}{serial}"

        # 4. Construct Student model
        student = Student(
            admission_number=admission_number,
            first_name=data.first_name,
            last_name=data.last_name,
            date_of_birth=data.date_of_birth,
            gender=data.gender,
            roll_number=data.roll_number,
            admission_date=data.admission_date,
            class_id=data.class_id,
            status="active"
        )

        # 5. Add parent records and auto-provision users
        db_parents = []
        for p in data.parents:
            parent_user_id = None
            if p.email:
                from app.models.public import User
                from app.core.security import get_password_hash
                
                # Check if parent user already exists in public users
                user_res = await self.repo.db.execute(
                    select(User).where(User.email == p.email.strip().lower())
                )
                existing_user = user_res.scalar_one_or_none()
                if existing_user:
                    parent_user_id = existing_user.id
                else:
                    new_user = User(
                        email=p.email.strip().lower(),
                        hashed_password=get_password_hash("parent123"),
                        first_name=p.first_name,
                        last_name=p.last_name,
                        role="parent",
                        school_id=school_id,
                        is_active=True
                    )
                    self.repo.db.add(new_user)
                    await self.repo.db.flush()
                    parent_user_id = new_user.id

            parent = StudentParent(
                parent_type=p.parent_type,
                first_name=p.first_name,
                last_name=p.last_name,
                mobile=p.mobile,
                email=p.email,
                occupation=p.occupation,
                user_id=parent_user_id
            )
            db_parents.append(parent)
        
        student.parents = db_parents

        # 6. Save to repository
        return await self.repo.create(student)

    async def get_student_profile(self, student_id: UUID) -> Student:
        student = await self.repo.get_by_id(student_id)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student record not found"
            )
        return student

    async def list_students(
        self,
        page: int,
        per_page: int,
        class_id: Optional[UUID] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Student], int]:
        return await self.repo.list_paginated(
            page=page,
            per_page=per_page,
            class_id=class_id,
            status=status,
            search=search
        )

    async def update_student(self, student_id: UUID, data: StudentUpdate) -> Student:
        student = await self.repo.get_by_id(student_id)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student record not found"
            )

        # Update student fields
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(student, key, value)

        return await self.repo.update(student)

    async def delete_student(self, student_id: UUID) -> None:
        student = await self.repo.get_by_id(student_id)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student record not found"
            )
        await self.repo.soft_delete(student)
