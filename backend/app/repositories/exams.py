from uuid import UUID
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tenant import Exam, ExamSchedule, ExamMark, GradeScale, Student

class ExamsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- Exams ---
    async def get_exam_by_id(self, exam_id: UUID) -> Optional[Exam]:
        result = await self.db.execute(
            select(Exam).where(Exam.id == exam_id, Exam.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list_exams(self, academic_year_id: Optional[UUID] = None) -> List[Exam]:
        query = select(Exam).where(Exam.deleted_at.is_(None))
        if academic_year_id:
            query = query.where(Exam.academic_year_id == academic_year_id)
        query = query.order_by(Exam.name)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_exam(self, exam: Exam) -> Exam:
        self.db.add(exam)
        await self.db.flush()
        return exam

    async def update_exam(self, exam: Exam) -> Exam:
        await self.db.flush()
        return exam

    async def delete_exam(self, exam: Exam) -> None:
        from datetime import datetime
        exam.deleted_at = datetime.utcnow()
        await self.db.flush()

    # --- Exam Schedules ---
    async def get_schedule_by_id(self, sched_id: UUID) -> Optional[ExamSchedule]:
        result = await self.db.execute(
            select(ExamSchedule)
            .options(
                selectinload(ExamSchedule.exam),
                selectinload(ExamSchedule.subject),
                selectinload(ExamSchedule.class_)
            )
            .where(ExamSchedule.id == sched_id, ExamSchedule.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list_schedules_for_exam(self, exam_id: UUID, class_id: Optional[UUID] = None) -> List[ExamSchedule]:
        query = select(ExamSchedule).options(
            selectinload(ExamSchedule.subject),
            selectinload(ExamSchedule.class_)
        ).where(ExamSchedule.exam_id == exam_id, ExamSchedule.deleted_at.is_(None))
        
        if class_id:
            query = query.where(ExamSchedule.class_id == class_id)
            
        query = query.order_by(ExamSchedule.exam_date)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_schedule_by_exam_subject_class(
        self, exam_id: UUID, subject_id: UUID, class_id: UUID
    ) -> Optional[ExamSchedule]:
        result = await self.db.execute(
            select(ExamSchedule).where(
                ExamSchedule.exam_id == exam_id,
                ExamSchedule.subject_id == subject_id,
                ExamSchedule.class_id == class_id,
                ExamSchedule.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def create_schedule(self, schedule: ExamSchedule) -> ExamSchedule:
        self.db.add(schedule)
        await self.db.flush()
        return schedule

    async def delete_schedule(self, schedule: ExamSchedule) -> None:
        from datetime import datetime
        schedule.deleted_at = datetime.utcnow()
        await self.db.flush()

    # --- Exam Marks ---
    async def get_mark(self, sched_id: UUID, student_id: UUID) -> Optional[ExamMark]:
        result = await self.db.execute(
            select(ExamMark)
            .where(
                ExamMark.exam_schedule_id == sched_id,
                ExamMark.student_id == student_id,
                ExamMark.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def list_marks_for_schedule(self, sched_id: UUID) -> List[ExamMark]:
        result = await self.db.execute(
            select(ExamMark)
            .options(selectinload(ExamMark.student))
            .where(ExamMark.exam_schedule_id == sched_id, ExamMark.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def create_mark(self, mark: ExamMark) -> ExamMark:
        self.db.add(mark)
        await self.db.flush()
        return mark

    async def update_mark(self, mark: ExamMark) -> ExamMark:
        await self.db.flush()
        return mark

    async def get_students_for_class(self, class_id: UUID) -> List[Student]:
        result = await self.db.execute(
            select(Student)
            .where(Student.class_id == class_id, Student.status == "active", Student.deleted_at.is_(None))
            .order_by(Student.roll_number, Student.first_name)
        )
        return list(result.scalars().all())

    # --- Grade Scales ---
    async def list_grade_scales(self) -> List[GradeScale]:
        result = await self.db.execute(
            select(GradeScale).where(GradeScale.deleted_at.is_(None)).order_by(GradeScale.min_percentage.desc())
        )
        return list(result.scalars().all())

    async def get_grade_scale_by_id(self, scale_id: UUID) -> Optional[GradeScale]:
        result = await self.db.execute(
            select(GradeScale).where(GradeScale.id == scale_id, GradeScale.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def create_grade_scale(self, scale: GradeScale) -> GradeScale:
        self.db.add(scale)
        await self.db.flush()
        return scale

    async def delete_grade_scale(self, scale: GradeScale) -> None:
        from datetime import datetime
        scale.deleted_at = datetime.utcnow()
        await self.db.flush()
