from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional, List
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.public import User
from app.models.tenant import Employee
from app.repositories.academics import AcademicsRepository
from app.services.academics import AcademicsService
from app.schemas.academics import (
    SubjectCreate, SubjectResponse, SubjectListResponse,
    HomeworkCreate, HomeworkResponse, HomeworkListResponse,
    SubmissionGradeRequest, SubmissionResponse, HomeworkSubmissionsListResponse
)

router = APIRouter(prefix="/academics", tags=["Academics Management"])

# Helper helper to resolve employee ID from user login ID
async def get_current_employee(db: AsyncSession, user_id: UUID) -> Employee:
    result = await db.execute(
        select(Employee).where(Employee.user_id == user_id, Employee.deleted_at.is_(None))
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active employee record not found for this user account. Assign a staff profile first."
        )
    return employee

# --- Subjects Router ---
@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    subject_data: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = AcademicsRepository(db)
    service = AcademicsService(repo)
    subject = await service.create_subject(subject_data)
    return SubjectResponse(data=subject, message="Subject added successfully")

@router.get("/subjects", response_model=SubjectListResponse)
async def list_subjects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = AcademicsRepository(db)
    service = AcademicsService(repo)
    subjects = await service.list_subjects()
    return SubjectListResponse(data=subjects)

@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = AcademicsRepository(db)
    service = AcademicsService(repo)
    await service.delete_subject(subject_id)

# --- Homework Router ---
@router.post("/homework", response_model=HomeworkResponse, status_code=status.HTTP_201_CREATED)
async def create_homework(
    homework_data: HomeworkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["teacher", "school_admin"]))
):
    employee = await get_current_employee(db, current_user.id)
    repo = AcademicsRepository(db)
    service = AcademicsService(repo)
    homework = await service.create_homework(homework_data, employee.id)
    
    # Custom response mapping to populate nested name variables for frontend convenience
    return HomeworkResponse(
        data={
            "id": homework.id,
            "title": homework.title,
            "description": homework.description,
            "due_date": homework.due_date,
            "attachment_url": homework.attachment_url,
            "class_id": homework.class_id,
            "subject_id": homework.subject_id,
            "created_by": homework.created_by,
            "created_at": homework.created_at,
            "updated_at": homework.updated_at,
            "class_name": f"{homework.class_.name}-{homework.class_.section}" if homework.class_ else None,
            "subject_name": homework.subject.name if homework.subject else None,
            "teacher_name": f"{homework.teacher.first_name} {homework.teacher.last_name}" if homework.teacher else None
        },
        message="Homework task assigned successfully"
    )

@router.get("/homework", response_model=HomeworkListResponse)
async def list_homework(
    class_id: Optional[UUID] = Query(None),
    subject_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = AcademicsRepository(db)
    service = AcademicsService(repo)
    hw_list = await service.list_homework(class_id=class_id, subject_id=subject_id)
    
    # Map raw model lists to include resolved names
    mapped_hw = []
    for hw in hw_list:
        mapped_hw.append({
            "id": hw.id,
            "title": hw.title,
            "description": hw.description,
            "due_date": hw.due_date,
            "attachment_url": hw.attachment_url,
            "class_id": hw.class_id,
            "subject_id": hw.subject_id,
            "created_by": hw.created_by,
            "created_at": hw.created_at,
            "updated_at": hw.updated_at,
            "class_name": f"{hw.class_.name}-{hw.class_.section}" if hw.class_ else None,
            "subject_name": hw.subject.name if hw.subject else None,
            "teacher_name": f"{hw.teacher.first_name} {hw.teacher.last_name}" if hw.teacher else None
        })
    return HomeworkListResponse(data=mapped_hw)

@router.get("/homework/{homework_id}", response_model=HomeworkResponse)
async def get_homework(
    homework_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = AcademicsRepository(db)
    service = AcademicsService(repo)
    hw = await service.get_homework(homework_id)
    return HomeworkResponse(
        data={
            "id": hw.id,
            "title": hw.title,
            "description": hw.description,
            "due_date": hw.due_date,
            "attachment_url": hw.attachment_url,
            "class_id": hw.class_id,
            "subject_id": hw.subject_id,
            "created_by": hw.created_by,
            "created_at": hw.created_at,
            "updated_at": hw.updated_at,
            "class_name": f"{hw.class_.name}-{hw.class_.section}" if hw.class_ else None,
            "subject_name": hw.subject.name if hw.subject else None,
            "teacher_name": f"{hw.teacher.first_name} {hw.teacher.last_name}" if hw.teacher else None
        }
    )

@router.delete("/homework/{homework_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_homework(
    homework_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    # Verify ownership if teacher
    repo = AcademicsRepository(db)
    service = AcademicsService(repo)
    
    if current_user.role == "teacher":
        employee = await get_current_employee(db, current_user.id)
        hw = await service.get_homework(homework_id)
        if hw.created_by != employee.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: You cannot delete homework created by other teachers."
            )
            
    await service.delete_homework(homework_id)

# --- Submissions & Grading ---
@router.get("/homework/{homework_id}/submissions", response_model=HomeworkSubmissionsListResponse)
async def get_submissions_roster(
    homework_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = AcademicsRepository(db)
    service = AcademicsService(repo)
    roster = await service.get_submissions_roster(homework_id)
    return HomeworkSubmissionsListResponse(data=roster)

@router.post("/homework/{homework_id}/submissions/{student_id}/grade", response_model=SubmissionResponse)
async def grade_submission(
    homework_id: UUID,
    student_id: UUID,
    grade_data: SubmissionGradeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["teacher", "school_admin"]))
):
    repo = AcademicsRepository(db)
    service = AcademicsService(repo)
    submission = await service.grade_submission(
        homework_id=homework_id,
        student_id=student_id,
        grade_data=grade_data
    )
    
    # Reload submission to include student details
    submission_with_student = await repo.get_submission_by_id(submission.id)
    
    return SubmissionResponse(
        data={
            "id": submission_with_student.id,
            "homework_id": submission_with_student.homework_id,
            "student_id": submission_with_student.student_id,
            "student_name": f"{submission_with_student.student.first_name} {submission_with_student.student.last_name}" if submission_with_student.student else None,
            "roll_number": submission_with_student.student.roll_number if submission_with_student.student else None,
            "submission_date": submission_with_student.submission_date,
            "attachment_url": submission_with_student.attachment_url,
            "status": submission_with_student.status,
            "remarks": submission_with_student.remarks,
            "grade": submission_with_student.grade,
            "created_at": submission_with_student.created_at,
            "updated_at": submission_with_student.updated_at
        },
        message="Student submission graded/marked successfully."
    )
