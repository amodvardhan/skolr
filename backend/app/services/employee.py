from uuid import UUID
from typing import List, Tuple, Optional
from sqlalchemy import select
from fastapi import HTTPException, status
from datetime import datetime

from app.repositories.employee import EmployeeRepository
from app.models.tenant import Employee
from app.models.public import User
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, LinkUserRequest
from app.core.security import get_password_hash

# Phase: 1

class EmployeeService:
    def __init__(self, repo: EmployeeRepository):
        self.repo = repo

    async def onboard_employee(self, data: EmployeeCreate) -> Employee:
        """
        Onboards a new employee. Ensures employee_code and email are unique.
        """
        # 1. Check if employee code already exists in tenant
        existing_code = await self.repo.get_by_employee_code(data.employee_code)
        if existing_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with code '{data.employee_code}' already exists"
            )

        # 2. Check if email already exists in tenant
        existing_email = await self.repo.get_by_email(data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with email '{data.email}' already exists"
            )

        # 3. Create Employee
        employee = Employee(
            employee_code=data.employee_code,
            first_name=data.first_name,
            last_name=data.last_name,
            designation=data.designation,
            department=data.department,
            date_of_joining=data.date_of_joining,
            employment_type=data.employment_type,
            mobile=data.mobile,
            email=data.email,
            status="active"
        )

        return await self.repo.create(employee)

    async def get_employee_profile(self, employee_id: UUID) -> Employee:
        employee = await self.repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee record not found"
            )
        return employee

    async def list_employees(
        self,
        page: int,
        per_page: int,
        department: Optional[str] = None,
        designation: Optional[str] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Employee], int]:
        return await self.repo.list_paginated(
            page=page,
            per_page=per_page,
            department=department,
            designation=designation,
            status=status_filter,
            search=search
        )

    async def update_employee(self, employee_id: UUID, data: EmployeeUpdate) -> Employee:
        employee = await self.repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee record not found"
            )

        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(employee, key, value)

        return await self.repo.update(employee)

    async def delete_employee(self, employee_id: UUID) -> None:
        employee = await self.repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee record not found"
            )
        await self.repo.soft_delete(employee)

    async def link_system_user(self, employee_id: UUID, school_id: UUID, link_data: LinkUserRequest) -> Employee:
        """
        Creates a credentials user record in public.users schema and associates it with the employee.
        """
        employee = await self.repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee record not found"
            )

        if employee.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee is already mapped to a system user account."
            )

        # Verify email is not already used in public schema users table
        existing_user_res = await self.repo.db.execute(
            select(User).where(User.email == link_data.email)
        )
        existing_user = existing_user_res.scalar_one_or_none()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A system login account with this email is already registered."
            )

        # Create new User object in public schema
        user = User(
            email=link_data.email,
            hashed_password=get_password_hash(link_data.password),
            first_name=employee.first_name,
            last_name=employee.last_name,
            role=link_data.role,
            school_id=school_id,
            is_active=True
        )
        self.repo.db.add(user)
        await self.repo.db.flush()

        # Link user_id to employee in tenant schema
        employee.user_id = user.id
        await self.repo.update(employee)

        return employee
