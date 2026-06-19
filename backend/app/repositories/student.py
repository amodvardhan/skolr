from uuid import UUID
from typing import List, Tuple, Optional
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.models.tenant import Student, StudentParent

class StudentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, student_id: UUID) -> Optional[Student]:
        """
        Retrieves a student by ID, eager loading parents.
        """
        result = await self.db.execute(
            select(Student)
            .where(Student.id == student_id, Student.deleted_at.is_(None))
            .options(selectinload(Student.parents))
        )
        return result.scalar_one_or_none()

    async def get_by_admission_number(self, admission_number: str) -> Optional[Student]:
        """
        Retrieves a student by admission number.
        """
        result = await self.db.execute(
            select(Student)
            .where(Student.admission_number == admission_number, Student.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list_paginated(
        self,
        page: int = 1,
        per_page: int = 20,
        class_id: Optional[UUID] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Student], int]:
        """
        Lists students with pagination, filtering, and search.
        Returns a tuple of (students list, total count).
        """
        query = select(Student).where(Student.deleted_at.is_(None)).options(selectinload(Student.parents))

        # Apply filters
        if class_id:
            query = query.where(Student.class_id == class_id)
        if status:
            query = query.where(Student.status == status)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Student.first_name.ilike(search_filter),
                    Student.last_name.ilike(search_filter),
                    Student.admission_number.ilike(search_filter)
                )
            )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query) or 0

        # Apply pagination limit and offset
        offset = (page - 1) * per_page
        result = await self.db.execute(query.order_by(Student.first_name).offset(offset).limit(per_page))
        students = result.scalars().all()
        
        return list(students), total

    async def create(self, student: Student) -> Student:
        self.db.add(student)
        await self.db.flush() # flush to populate ID and relationships
        return student

    async def update(self, student: Student) -> Student:
        await self.db.flush()
        return student

    async def soft_delete(self, student: Student) -> None:
        student.deleted_at = datetime.utcnow()
        await self.db.flush()

    async def get_count(self) -> int:
        """
        Returns active students count for dashboard.
        """
        query = select(func.count(Student.id)).where(Student.deleted_at.is_(None), Student.status == "active")
        result = await self.db.execute(query)
        return result.scalar() or 0
