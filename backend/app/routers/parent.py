from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from uuid import UUID
from typing import List, Dict, Any

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.public import User
from app.models.tenant import Student, StudentParent, AttendanceSession, StudentAttendance, Homework, ExamSchedule, ExamMark, Class
from app.services.attendance import AttendanceService
from app.repositories.attendance import AttendanceRepository
from app.schemas.student import StudentResponseData

router = APIRouter(prefix="/parent", tags=["Parent Portal"])

# Helper to convert student model to schema format
def map_student_to_schema(student) -> Dict[str, Any]:
    parents_list = []
    for p in student.parents:
        parents_list.append({
            "id": str(p.id),
            "student_id": str(p.student_id),
            "parent_type": p.parent_type,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "mobile": p.mobile,
            "email": p.email,
            "occupation": p.occupation,
            "created_at": p.created_at,
            "updated_at": p.updated_at
        })
    return {
        "id": str(student.id),
        "first_name": student.first_name,
        "last_name": student.last_name,
        "admission_number": student.admission_number,
        "date_of_birth": student.date_of_birth,
        "gender": student.gender,
        "roll_number": student.roll_number,
        "admission_date": student.admission_date,
        "class_id": str(student.class_id),
        "status": student.status,
        "parents": parents_list,
        "class_name": f"{student.current_class.name} - {student.current_class.section}" if student.current_class else "N/A",
        "created_at": student.created_at,
        "updated_at": student.updated_at
    }

async def verify_parent_child_link(student_id: UUID, parent_user_id: UUID, db: AsyncSession) -> Student:
    # Query StudentParent to verify link
    link_res = await db.execute(
        select(StudentParent)
        .where(and_(StudentParent.student_id == student_id, StudentParent.user_id == parent_user_id))
    )
    link = link_res.scalar_one_or_none()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. This student is not linked to your parent profile."
        )
    
    # Return student with relationships loaded
    student_res = await db.execute(
        select(Student)
        .options(selectinload(Student.parents), selectinload(Student.current_class))
        .where(Student.id == student_id, Student.deleted_at.is_(None))
    )
    student = student_res.scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found"
        )
    return student

@router.get("/students")
async def get_linked_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["parent"]))
):
    """
    List children students associated with the parent user
    """
    result = await db.execute(
        select(Student)
        .join(StudentParent, StudentParent.student_id == Student.id)
        .options(selectinload(Student.parents), selectinload(Student.current_class))
        .where(and_(StudentParent.user_id == current_user.id, Student.deleted_at.is_(None)))
        .order_by(Student.first_name)
    )
    students = result.scalars().all()
    return {
        "success": True,
        "data": [map_student_to_schema(s) for s in students]
    }

@router.get("/students/{student_id}/attendance")
async def get_child_attendance(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["parent"]))
):
    """
    Fetch child's attendance summaries and logs
    """
    await verify_parent_child_link(student_id, current_user.id, db)
    
    # 1. Fetch Summary
    repo = AttendanceRepository(db)
    service = AttendanceService(repo)
    summary = await service.get_student_summary(student_id)
    
    # 2. Fetch Logs
    logs_res = await db.execute(
        select(StudentAttendance, AttendanceSession)
        .join(AttendanceSession, AttendanceSession.id == StudentAttendance.session_id)
        .where(and_(StudentAttendance.student_id == student_id, StudentAttendance.deleted_at.is_(None)))
        .order_by(AttendanceSession.session_date.desc())
    )
    logs = logs_res.all()
    
    return {
        "success": True,
        "data": {
            "summary": summary,
            "logs": [
                {
                    "date": s.session_date.isoformat(),
                    "session_type": s.session_type,
                    "status": a.status,
                    "remarks": a.remarks
                }
                for a, s in logs
            ]
        }
    }

@router.get("/students/{student_id}/homework")
async def get_child_homework(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["parent"]))
):
    """
    Fetch child's active class homework lists
    """
    student = await verify_parent_child_link(student_id, current_user.id, db)
    
    result = await db.execute(
        select(Homework)
        .options(selectinload(Homework.subject), selectinload(Homework.teacher))
        .where(and_(Homework.class_id == student.class_id, Homework.deleted_at.is_(None)))
        .order_by(Homework.due_date.desc())
    )
    homework_items = result.scalars().all()
    
    return {
        "success": True,
        "data": [
            {
                "id": str(h.id),
                "title": h.title,
                "description": h.description,
                "due_date": h.due_date.isoformat(),
                "attachment_url": h.attachment_url,
                "subject_name": h.subject.name if h.subject else "N/A",
                "subject_code": h.subject.code if h.subject else "N/A",
                "teacher_name": f"{h.teacher.first_name} {h.teacher.last_name}" if h.teacher else "N/A"
            }
            for h in homework_items
        ]
    }

@router.get("/students/{student_id}/exams")
async def get_child_exams(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["parent"]))
):
    """
    Fetch child's exam schedules and graded marks
    """
    student = await verify_parent_child_link(student_id, current_user.id, db)
    
    # 1. Fetch schedules
    schedules_res = await db.execute(
        select(ExamSchedule)
        .options(selectinload(ExamSchedule.exam), selectinload(ExamSchedule.subject))
        .where(and_(ExamSchedule.class_id == student.class_id, ExamSchedule.deleted_at.is_(None)))
        .order_by(ExamSchedule.exam_date.desc())
    )
    schedules = schedules_res.scalars().all()
    
    # 2. Fetch marks
    marks_res = await db.execute(
        select(ExamMark)
        .options(selectinload(ExamMark.schedule).selectinload(ExamSchedule.exam), selectinload(ExamMark.schedule).selectinload(ExamSchedule.subject))
        .where(and_(ExamMark.student_id == student_id, ExamMark.deleted_at.is_(None)))
    )
    marks = marks_res.scalars().all()
    
    return {
        "success": True,
        "data": {
            "schedules": [
                {
                    "id": str(s.id),
                    "exam_name": s.exam.name if s.exam else "N/A",
                    "exam_id": str(s.exam_id),
                    "subject_name": s.subject.name if s.subject else "N/A",
                    "exam_date": s.exam_date.isoformat(),
                    "max_marks": s.max_marks,
                    "passing_marks": s.passing_marks
                }
                for s in schedules
            ],
            "marks": [
                {
                    "id": str(m.id),
                    "exam_name": m.schedule.exam.name if m.schedule and m.schedule.exam else "N/A",
                    "exam_id": str(m.schedule.exam_id) if m.schedule else "N/A",
                    "subject_name": m.schedule.subject.name if m.schedule and m.schedule.subject else "N/A",
                    "marks_obtained": m.marks_obtained,
                    "max_marks": m.schedule.max_marks if m.schedule else 100.0,
                    "remarks": m.remarks
                }
                for m in marks
            ]
        }
    }
