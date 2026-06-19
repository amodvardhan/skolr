# Phase: 1
from fastapi import APIRouter, Depends, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List, Optional
from sqlalchemy import text, select

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.public import User, Tenant
from app.models.tenant import Exam, ExamSchedule, ExamMark, GradeScale
from app.repositories.exams import ExamsRepository
from app.services.exams import ExamsService
from app.schemas.exams import (
    ExamCreate, ExamUpdate, ExamResponse, ExamListResponse,
    ExamScheduleCreate, ExamScheduleResponse, ExamScheduleListResponse,
    ExamMarkCreate, ExamMarkListResponse, MarksEntryListRequest,
    GradeScaleCreate, GradeScaleResponse, GradeScaleListResponse
)

router = APIRouter(prefix="/exams", tags=["Exam Management"])

# --- Exams ---
@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    data: ExamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    exam = await service.create_exam(data)
    return ExamResponse(success=True, data=exam, message="Exam created successfully.")

@router.get("", response_model=ExamListResponse)
async def list_exams(
    academic_year_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    exams = await service.list_exams(academic_year_id)
    return ExamListResponse(success=True, data=exams, message="OK")

@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    exam = await service.get_exam(exam_id)
    return ExamResponse(success=True, data=exam, message="OK")

@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: UUID,
    data: ExamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    exam = await service.update_exam(exam_id, data)
    return ExamResponse(success=True, data=exam, message="Exam updated successfully.")

@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    await service.delete_exam(exam_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- Schedules ---
@router.post("/{exam_id}/schedule", response_model=ExamScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    exam_id: UUID,
    data: ExamScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    if exam_id != data.exam_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exam ID mismatch.")
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    schedule = await service.create_schedule(data)
    # Build proper response
    res_data = {
        "id": schedule.id,
        "exam_id": schedule.exam_id,
        "subject_id": schedule.subject_id,
        "class_id": schedule.class_id,
        "subject_name": schedule.subject.name if schedule.subject else None,
        "subject_code": schedule.subject.code if schedule.subject else None,
        "exam_date": schedule.exam_date,
        "max_marks": schedule.max_marks,
        "passing_marks": schedule.passing_marks,
        "created_at": schedule.created_at,
        "updated_at": schedule.updated_at
    }
    return ExamScheduleResponse(success=True, data=res_data, message="Exam schedule created successfully.")

@router.get("/{exam_id}/schedule", response_model=ExamScheduleListResponse)
async def list_schedules(
    exam_id: UUID,
    class_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    schedules = await service.list_schedules(exam_id, class_id)
    
    response_data = []
    for s in schedules:
        response_data.append({
            "id": s.id,
            "exam_id": s.exam_id,
            "subject_id": s.subject_id,
            "class_id": s.class_id,
            "subject_name": s.subject.name if s.subject else None,
            "subject_code": s.subject.code if s.subject else None,
            "exam_date": s.exam_date,
            "max_marks": s.max_marks,
            "passing_marks": s.passing_marks,
            "created_at": s.created_at,
            "updated_at": s.updated_at
        })
    return ExamScheduleListResponse(success=True, data=response_data, message="OK")

@router.delete("/schedule/{sched_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    sched_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    await service.delete_schedule(sched_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- Marks ---
@router.get("/schedule/{sched_id}/marks", response_model=ExamMarkListResponse)
async def list_marks_roster(
    sched_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    roster = await service.get_marks_roster(sched_id)
    return ExamMarkListResponse(success=True, data=roster, message="OK")

@router.post("/schedule/{sched_id}/marks", status_code=status.HTTP_200_OK)
async def save_marks_ledger(
    sched_id: UUID,
    data: MarksEntryListRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    await service.save_marks_ledger(sched_id, data.marks)
    return {"success": True, "message": "Marks updated successfully."}

# --- Grade Scales ---
@router.get("/grade-scales", response_model=GradeScaleListResponse)
async def list_grade_scales(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    scales = await service.list_grade_scales()
    return GradeScaleListResponse(success=True, data=scales, message="OK")

@router.post("/grade-scales", response_model=GradeScaleResponse, status_code=status.HTTP_201_CREATED)
async def create_grade_scale(
    data: GradeScaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    scale = await service.create_grade_scale(data)
    return GradeScaleResponse(success=True, data=scale, message="Grade scale created successfully.")

@router.delete("/grade-scales/{scale_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade_scale(
    scale_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    await service.delete_grade_scale(scale_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- Report Cards ---
@router.get("/student/{student_id}/report-card", response_class=Response)
async def get_report_card(
    student_id: UUID,
    exam_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher", "parent"]))
):
    repo = ExamsRepository(db)
    service = ExamsService(repo)
    
    # Resolve school name dynamically using public tenant lookup
    school_name = "Prestige Public School"
    try:
        schema_res = await db.execute(text("SELECT current_schema()"))
        current_schema = schema_res.scalar() or ""
        if current_schema.startswith("school_"):
            tenant_id_str = current_schema.replace("school_", "").replace("_", "-")
            tenant_res = await db.execute(
                select(Tenant).where(Tenant.id == tenant_id_str)
            )
            tenant = tenant_res.scalar_one_or_none()
            if tenant:
                school_name = tenant.name
    except Exception:
        pass
        
    pdf_bytes = await service.generate_report_card_pdf(
        student_id=student_id,
        exam_id=exam_id,
        school_name=school_name
    )
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="report-card-{student_id}.pdf"',
            "Content-Type": "application/pdf"
        }
    )
