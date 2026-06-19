from uuid import UUID
from typing import List, Optional, Tuple, Dict, Any
from fastapi import HTTPException, status
from datetime import datetime
from weasyprint import HTML
import tempfile
import os

from app.repositories.exams import ExamsRepository
from app.models.tenant import Exam, ExamSchedule, ExamMark, GradeScale, Student
from app.schemas.exams import (
    ExamCreate, ExamUpdate, ExamScheduleCreate,
    ExamMarkCreate, GradeScaleCreate, ExamMarkResponseData
)

# Phase: 1

class ExamsService:
    def __init__(self, repo: ExamsRepository):
        self.repo = repo

    # --- Exams ---
    async def create_exam(self, data: ExamCreate) -> Exam:
        exam = Exam(
            name=data.name.strip(),
            academic_year_id=data.academic_year_id,
            status="draft"
        )
        return await self.repo.create_exam(exam)

    async def list_exams(self, academic_year_id: Optional[UUID] = None) -> List[Exam]:
        return await self.repo.list_exams(academic_year_id)

    async def get_exam(self, exam_id: UUID) -> Exam:
        exam = await self.repo.get_exam_by_id(exam_id)
        if not exam:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")
        return exam

    async def update_exam(self, exam_id: UUID, data: ExamUpdate) -> Exam:
        exam = await self.get_exam(exam_id)
        if data.name:
            exam.name = data.name.strip()
        if data.status:
            exam.status = data.status
        return await self.repo.update_exam(exam)

    async def delete_exam(self, exam_id: UUID) -> None:
        exam = await self.get_exam(exam_id)
        await self.repo.delete_exam(exam)

    # --- Exam Schedules ---
    async def create_schedule(self, data: ExamScheduleCreate) -> ExamSchedule:
        # Check if subject is already scheduled under this exam for this class
        existing = await self.repo.get_schedule_by_exam_subject_class(
            exam_id=data.exam_id,
            subject_id=data.subject_id,
            class_id=data.class_id
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This subject is already scheduled for this class in this exam."
            )
            
        schedule = ExamSchedule(
            exam_id=data.exam_id,
            subject_id=data.subject_id,
            class_id=data.class_id,
            exam_date=data.exam_date,
            max_marks=data.max_marks,
            passing_marks=data.passing_marks
        )
        created = await self.repo.create_schedule(schedule)
        return await self.repo.get_schedule_by_id(created.id)

    async def list_schedules(self, exam_id: UUID, class_id: Optional[UUID] = None) -> List[ExamSchedule]:
        return await self.repo.list_schedules_for_exam(exam_id, class_id)

    async def delete_schedule(self, sched_id: UUID) -> None:
        sched = await self.repo.get_schedule_by_id(sched_id)
        if not sched:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found.")
        await self.repo.delete_schedule(sched)

    # --- Exam Marks ---
    async def get_marks_roster(self, sched_id: UUID) -> List[ExamMarkResponseData]:
        schedule = await self.repo.get_schedule_by_id(sched_id)
        if not schedule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam schedule not found.")
            
        students = await self.repo.get_students_for_class(schedule.class_id)
        marks = await self.repo.list_marks_for_schedule(sched_id)
        
        marks_map = {m.student_id: m for m in marks}
        
        roster = []
        for stud in students:
            m = marks_map.get(stud.id)
            if m:
                roster.append(ExamMarkResponseData(
                    id=m.id,
                    exam_schedule_id=sched_id,
                    student_id=stud.id,
                    student_name=f"{stud.first_name} {stud.last_name}",
                    roll_number=stud.roll_number,
                    marks_obtained=m.marks_obtained,
                    remarks=m.remarks,
                    created_at=m.created_at,
                    updated_at=m.updated_at
                ))
            else:
                roster.append(ExamMarkResponseData(
                    id=stud.id, # Fallback ID for missing
                    exam_schedule_id=sched_id,
                    student_id=stud.id,
                    student_name=f"{stud.first_name} {stud.last_name}",
                    roll_number=stud.roll_number,
                    marks_obtained=None,
                    remarks=None,
                    created_at=None,
                    updated_at=None
                ))
        return roster

    async def save_marks_ledger(self, sched_id: UUID, marks_list: List[ExamMarkCreate]) -> None:
        schedule = await self.repo.get_schedule_by_id(sched_id)
        if not schedule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam schedule not found.")
            
        for m_entry in marks_list:
            if m_entry.marks_obtained > schedule.max_marks:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Marks obtained ({m_entry.marks_obtained}) exceeds maximum allowed ({schedule.max_marks}) for this exam paper."
                )
                
            mark = await self.repo.get_mark(sched_id, m_entry.student_id)
            if mark:
                mark.marks_obtained = m_entry.marks_obtained
                mark.remarks = m_entry.remarks
                await self.repo.update_mark(mark)
            else:
                new_mark = ExamMark(
                    exam_schedule_id=sched_id,
                    student_id=m_entry.student_id,
                    marks_obtained=m_entry.marks_obtained,
                    remarks=m_entry.remarks
                )
                await self.repo.create_mark(new_mark)

    # --- Grade Scales ---
    async def list_grade_scales(self) -> List[GradeScale]:
        scales = await self.repo.list_grade_scales()
        if not scales:
            # Seed default grade scales if empty
            default_scales = [
                GradeScale(min_percentage=90.0, max_percentage=100.0, grade_name="A+", description="Outstanding"),
                GradeScale(min_percentage=80.0, max_percentage=89.99, grade_name="A", description="Excellent"),
                GradeScale(min_percentage=70.0, max_percentage=79.99, grade_name="B", description="Very Good"),
                GradeScale(min_percentage=60.0, max_percentage=69.99, grade_name="C", description="Good"),
                GradeScale(min_percentage=50.0, max_percentage=59.99, grade_name="D", description="Satisfactory"),
                GradeScale(min_percentage=35.0, max_percentage=49.99, grade_name="E", description="Pass"),
                GradeScale(min_percentage=0.0, max_percentage=34.99, grade_name="F", description="Fail"),
            ]
            for s in default_scales:
                await self.repo.create_grade_scale(s)
            scales = await self.repo.list_grade_scales()
        return scales

    async def create_grade_scale(self, data: GradeScaleCreate) -> GradeScale:
        scale = GradeScale(
            min_percentage=data.min_percentage,
            max_percentage=data.max_percentage,
            grade_name=data.grade_name.strip(),
            description=data.description.strip() if data.description else None
        )
        return await self.repo.create_grade_scale(scale)

    async def delete_grade_scale(self, scale_id: UUID) -> None:
        scale = await self.repo.get_grade_scale_by_id(scale_id)
        if not scale:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade scale not found.")
        await self.repo.delete_grade_scale(scale)

    async def get_grade_for_percentage(self, pct: float) -> str:
        scales = await self.list_grade_scales()
        for s in scales:
            if s.min_percentage <= pct <= s.max_percentage:
                return s.grade_name
        return "F"

    # --- Report Cards (WeasyPrint PDF) ---
    async def generate_report_card_pdf(self, student_id: UUID, exam_id: UUID, school_name: str) -> bytes:
        """
        Gathers exam marks, performs rank/topper analytics, and outputs binary PDF report card.
        """
        # Fetch Student
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        res_student = await self.repo.db.execute(
            select(Student).options(selectinload(Student.current_class)).where(Student.id == student_id)
        )
        student = res_student.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
            
        exam = await self.get_exam(exam_id)
        schedules = await self.repo.list_schedules_for_exam(exam_id, student.class_id)
        
        # Calculate Rank and Topper
        rank, total_students, topper_pct = await self.get_class_rank_and_topper(exam_id, student.class_id, student_id)

        subject_results = []
        total_max = 0.0
        total_obtained = 0.0
        has_failed_subject = False

        for sched in schedules:
            mark = await self.repo.get_mark(sched.id, student_id)
            obtained = mark.marks_obtained if mark else 0.0
            total_max += sched.max_marks
            total_obtained += obtained
            
            sub_pct = (obtained / sched.max_marks * 100.0) if sched.max_marks > 0 else 0.0
            grade = await self.get_grade_for_percentage(sub_pct)
            
            is_pass = obtained >= sched.passing_marks
            if not is_pass:
                has_failed_subject = True

            subject_results.append({
                "subject_name": sched.subject.name if sched.subject else "Unknown",
                "max_marks": sched.max_marks,
                "passing_marks": sched.passing_marks,
                "obtained": obtained,
                "grade": grade,
                "status": "PASS" if is_pass else "FAIL"
            })

        overall_pct = (total_obtained / total_max * 100.0) if total_max > 0 else 0.0
        overall_grade = await self.get_grade_for_percentage(overall_pct)
        overall_status = "FAIL" if (has_failed_subject or overall_pct < 35.0) else "PASS"

        # Build context for template
        context = {
            "school_name": school_name,
            "exam_name": exam.name,
            "student_name": f"{student.first_name} {student.last_name}",
            "admission_number": student.admission_number,
            "roll_number": student.roll_number,
            "class_name": f"{student.current_class.name}-{student.current_class.section}" if student.current_class else "Unknown",
            "subjects": subject_results,
            "total_max": total_max,
            "total_obtained": total_obtained,
            "percentage": round(overall_pct, 2),
            "grade": overall_grade,
            "status": overall_status,
            "rank": rank,
            "total_students": total_students,
            "topper_percentage": round(topper_pct, 2),
            "print_date": datetime.now().strftime("%B %d, %Y")
        }

        # Render HTML template using Jinja2
        # Since we run inside FastAPI, we can load Jinja template
        from jinja2 import Environment, FileSystemLoader
        # App templates folder
        template_dir = "/Users/amod/Documents/Products/Skolr/backend/app/templates"
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("report_card.html")
        html_content = template.render(**context)

        # Render PDF bytes using WeasyPrint
        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes

    async def get_class_rank_and_topper(self, exam_id: UUID, class_id: UUID, student_id: UUID) -> Tuple[int, int, float]:
        students = await self.repo.get_students_for_class(class_id)
        schedules = await self.repo.list_schedules_for_exam(exam_id, class_id)
        
        percentages = []
        for stud in students:
            total_max = 0.0
            total_obtained = 0.0
            for sched in schedules:
                mark = await self.repo.get_mark(sched.id, stud.id)
                total_max += sched.max_marks
                if mark:
                    total_obtained += mark.marks_obtained
            
            pct = (total_obtained / total_max * 100.0) if total_max > 0 else 0.0
            percentages.append((stud.id, pct))
            
        percentages.sort(key=lambda x: x[1], reverse=True)
        
        rank = 1
        for idx, (sid, pct) in enumerate(percentages):
            if sid == student_id:
                rank = idx + 1
                break
                
        topper_pct = percentages[0][1] if percentages else 0.0
        return rank, len(students), topper_pct
