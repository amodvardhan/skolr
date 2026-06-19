from uuid import UUID
from typing import List, Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tenant import Subject, Homework, HomeworkSubmission, Student, Class, Employee

class AcademicsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- Subject Master ---
    async def get_subject_by_id(self, subject_id: UUID) -> Optional[Subject]:
        result = await self.db.execute(
            select(Subject).where(Subject.id == subject_id, Subject.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_subject_by_code(self, code: str) -> Optional[Subject]:
        result = await self.db.execute(
            select(Subject).where(Subject.code == code, Subject.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list_subjects(self) -> List[Subject]:
        result = await self.db.execute(
            select(Subject).where(Subject.deleted_at.is_(None)).order_by(Subject.name)
        )
        return list(result.scalars().all())

    async def create_subject(self, subject: Subject) -> Subject:
        self.db.add(subject)
        await self.db.flush()
        return subject

    async def delete_subject(self, subject: Subject) -> None:
        # Soft delete
        from datetime import datetime
        subject.deleted_at = datetime.utcnow()
        await self.db.flush()

    # --- Homework Management ---
    async def get_homework_by_id(self, homework_id: UUID) -> Optional[Homework]:
        result = await self.db.execute(
            select(Homework)
            .options(
                selectinload(Homework.class_),
                selectinload(Homework.subject),
                selectinload(Homework.teacher)
            )
            .where(Homework.id == homework_id, Homework.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list_homework(
        self, 
        class_id: Optional[UUID] = None, 
        subject_id: Optional[UUID] = None
    ) -> List[Homework]:
        query = select(Homework).options(
            selectinload(Homework.class_),
            selectinload(Homework.subject),
            selectinload(Homework.teacher)
        ).where(Homework.deleted_at.is_(None))
        
        if class_id:
            query = query.where(Homework.class_id == class_id)
        if subject_id:
            query = query.where(Homework.subject_id == subject_id)
            
        query = query.order_by(Homework.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_homework(self, homework: Homework) -> Homework:
        self.db.add(homework)
        await self.db.flush()
        return homework

    async def delete_homework(self, homework: Homework) -> None:
        from datetime import datetime
        homework.deleted_at = datetime.utcnow()
        await self.db.flush()

    # --- Homework Submissions ---
    async def get_submission(self, homework_id: UUID, student_id: UUID) -> Optional[HomeworkSubmission]:
        result = await self.db.execute(
            select(HomeworkSubmission)
            .where(
                HomeworkSubmission.homework_id == homework_id,
                HomeworkSubmission.student_id == student_id,
                HomeworkSubmission.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def get_submission_by_id(self, submission_id: UUID) -> Optional[HomeworkSubmission]:
        result = await self.db.execute(
            select(HomeworkSubmission)
            .options(selectinload(HomeworkSubmission.student))
            .where(HomeworkSubmission.id == submission_id, HomeworkSubmission.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list_submissions_for_homework(self, homework_id: UUID) -> List[HomeworkSubmission]:
        result = await self.db.execute(
            select(HomeworkSubmission)
            .options(selectinload(HomeworkSubmission.student))
            .where(HomeworkSubmission.homework_id == homework_id, HomeworkSubmission.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def get_students_for_class(self, class_id: UUID) -> List[Student]:
        result = await self.db.execute(
            select(Student)
            .where(Student.class_id == class_id, Student.status == "active", Student.deleted_at.is_(None))
            .order_by(Student.roll_number, Student.first_name)
        )
        return list(result.scalars().all())

    async def create_submission(self, submission: HomeworkSubmission) -> HomeworkSubmission:
        self.db.add(submission)
        await self.db.flush()
        return submission

    async def update_submission(self, submission: HomeworkSubmission) -> HomeworkSubmission:
        await self.db.flush()
        return submission
