from uuid import UUID
from datetime import date, datetime
from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant import AttendanceSession, StudentAttendance, Student

class AttendanceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_session_by_date_and_class(
        self,
        class_id: UUID,
        session_date: date,
        session_type: str
    ) -> Optional[AttendanceSession]:
        result = await self.db.execute(
            select(AttendanceSession).where(
                and_(
                    AttendanceSession.class_id == class_id,
                    AttendanceSession.session_date == session_date,
                    AttendanceSession.session_type == session_type
                )
            )
        )
        return result.scalar_one_or_none()

    async def create_session(self, session: AttendanceSession) -> AttendanceSession:
        self.db.add(session)
        await self.db.flush()
        return session

    async def add_attendance_records(self, records: List[StudentAttendance]) -> None:
        self.db.add_all(records)
        await self.db.flush()

    async def delete_records_by_session_id(self, session_id: UUID) -> None:
        # Delete existing records to overwrite them during attendance updates
        from sqlalchemy import delete
        await self.db.execute(
            delete(StudentAttendance).where(StudentAttendance.session_id == session_id)
        )

    async def get_session_records(self, session_id: UUID) -> List[StudentAttendance]:
        result = await self.db.execute(
            select(StudentAttendance).where(StudentAttendance.session_id == session_id)
        )
        return list(result.scalars().all())

    async def get_student_summary(self, student_id: UUID) -> Tuple[int, int, int, int]:
        """
        Returns (present_days, absent_days, late_days, total_days) for a student.
        """
        query = (
            select(
                func.count().filter(StudentAttendance.status == 'P'),
                func.count().filter(StudentAttendance.status == 'A'),
                func.count().filter(StudentAttendance.status == 'L'),
                func.count()
            )
            .where(StudentAttendance.student_id == student_id)
        )
        result = await self.db.execute(query)
        row = result.fetchone()
        return row if row else (0, 0, 0, 0)

    async def get_class_summary_by_date_range(
        self,
        class_id: UUID,
        start_date: date,
        end_date: date
    ) -> List[Tuple[date, int, int, int, int]]:
        """
        Returns list of (session_date, present_count, absent_count, late_count, total_count)
        """
        query = (
            select(
                AttendanceSession.session_date,
                func.count().filter(StudentAttendance.status == 'P'),
                func.count().filter(StudentAttendance.status == 'A'),
                func.count().filter(StudentAttendance.status == 'L'),
                func.count()
            )
            .join(StudentAttendance, StudentAttendance.session_id == AttendanceSession.id)
            .where(
                and_(
                    AttendanceSession.class_id == class_id,
                    AttendanceSession.session_date >= start_date,
                    AttendanceSession.session_date <= end_date
                )
            )
            .group_by(AttendanceSession.session_date)
            .order_by(AttendanceSession.session_date)
        )
        result = await self.db.execute(query)
        return list(result.all())
