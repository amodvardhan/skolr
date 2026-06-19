from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional, List
from math import ceil

from app.core.database import get_db
from app.core.deps import require_roles
from app.repositories.employee import EmployeeRepository
from app.services.employee import EmployeeService
from app.models.public import User
from app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, 
    EmployeeListResponse, EmployeePagination, LinkUserRequest
)

router = APIRouter(prefix="/employees", tags=["Employee / HR Management"])

@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def onboard_employee(
    employee_data: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = EmployeeRepository(db)
    service = EmployeeService(repo)
    employee = await service.onboard_employee(employee_data)
    
    return EmployeeResponse(
        data=employee,
        message="Employee onboarded successfully"
    )

@router.get("/", response_model=EmployeeListResponse)
async def list_employees(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    department: Optional[str] = Query(None),
    designation: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = EmployeeRepository(db)
    service = EmployeeService(repo)
    employees, total = await service.list_employees(
        page=page,
        per_page=per_page,
        department=department,
        designation=designation,
        status_filter=status,
        search=search
    )
    
    pages = ceil(total / per_page) if total > 0 else 1
    
    return EmployeeListResponse(
        data=employees,
        pagination=EmployeePagination(
            page=page,
            per_page=per_page,
            total=total,
            pages=pages
        )
    )

@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee_profile(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher", "accountant"]))
):
    repo = EmployeeRepository(db)
    service = EmployeeService(repo)
    employee = await service.get_employee_profile(employee_id)
    
    # Eager validation: if teacher/accountant is calling, check if they are requesting their own record
    if current_user.role != "school_admin" and employee.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot access other employees profiles."
        )
        
    return EmployeeResponse(data=employee)

@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: UUID,
    employee_data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = EmployeeRepository(db)
    service = EmployeeService(repo)
    employee = await service.update_employee(employee_id, employee_data)
    
    return EmployeeResponse(
        data=employee,
        message="Employee record updated successfully"
    )

@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = EmployeeRepository(db)
    service = EmployeeService(repo)
    await service.delete_employee(employee_id)

@router.post("/{employee_id}/link-user", response_model=EmployeeResponse)
async def link_system_user(
    employee_id: UUID,
    link_data: LinkUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = EmployeeRepository(db)
    service = EmployeeService(repo)
    employee = await service.link_system_user(
        employee_id=employee_id,
        school_id=current_user.school_id,
        link_data=link_data
    )
    return EmployeeResponse(
        data=employee,
        message="System user mapped successfully to employee profile"
    )
