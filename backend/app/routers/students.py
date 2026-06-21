from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional, List
from math import ceil
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import require_roles
from app.repositories.student import StudentRepository
from app.services.student import StudentService
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse, StudentListResponse, StudentListResponsePagination, ClassCreate
from app.models.tenant import Class, AcademicYear

router = APIRouter(prefix="/students", tags=["Students"])

class ClassListResponse(BaseModel):
    id: UUID
    name: str
    section: str

    class Config:
        from_attributes = True

class AcademicYearResponse(BaseModel):
    id: UUID
    name: str
    is_current: bool

    class Config:
        from_attributes = True

@router.get("/academic-years", response_model=List[AcademicYearResponse])
async def list_academic_years(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles(["school_admin", "teacher"]))
):
    result = await db.execute(select(AcademicYear).where(AcademicYear.deleted_at.is_(None)))
    return list(result.scalars().all())

@router.get("/classes", response_model=List[ClassListResponse])
async def list_classes(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles(["school_admin", "teacher"]))
):
    result = await db.execute(select(Class).where(Class.deleted_at.is_(None)))
    return list(result.scalars().all())


@router.post("/classes", response_model=ClassListResponse, status_code=status.HTTP_201_CREATED)
async def create_class(
    data: ClassCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles(["school_admin"]))
):
    # Check if class already exists in the tenant
    result = await db.execute(
        select(Class).where(
            Class.name == data.name.strip(),
            Class.section == data.section.strip(),
            Class.academic_year_id == data.academic_year_id,
            Class.deleted_at.is_(None)
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Class {data.name} - Section {data.section} already exists for this academic year."
        )
        
    new_class = Class(
        name=data.name.strip(),
        section=data.section.strip(),
        academic_year_id=data.academic_year_id
    )
    db.add(new_class)
    await db.flush()
    return new_class


@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def admit_student(
    student_data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles(["school_admin"]))
):
    repo = StudentRepository(db)
    service = StudentService(repo)
    student = await service.admit_student(student_data, school_id=current_user.school_id)
    
    return StudentResponse(
        data=student,
        message="Student admitted successfully"
    )

@router.get("/", response_model=StudentListResponse)
async def list_students(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    class_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles(["school_admin", "teacher"]))
):
    repo = StudentRepository(db)
    service = StudentService(repo)
    students, total = await service.list_students(
        page=page,
        per_page=per_page,
        class_id=class_id,
        status=status,
        search=search
    )
    
    pages = ceil(total / per_page) if total > 0 else 1
    
    return StudentListResponse(
        data=students,
        pagination=StudentListResponsePagination(
            page=page,
            per_page=per_page,
            total=total,
            pages=pages
        )
    )

@router.get("/{student_id}", response_model=StudentResponse)
async def get_student_profile(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles(["school_admin", "teacher", "parent"]))
):
    repo = StudentRepository(db)
    service = StudentService(repo)
    student = await service.get_student_profile(student_id)
    
    return StudentResponse(data=student)

@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: UUID,
    student_data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles(["school_admin"]))
):
    repo = StudentRepository(db)
    service = StudentService(repo)
    student = await service.update_student(student_id, student_data)
    
    return StudentResponse(
        data=student,
        message="Student record updated successfully"
    )

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles(["school_admin"]))
):
    repo = StudentRepository(db)
    service = StudentService(repo)
    await service.delete_student(student_id)
