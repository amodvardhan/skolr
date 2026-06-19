from uuid import UUID
from typing import List, Tuple, Optional
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.models.tenant import Employee

class EmployeeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, employee_id: UUID) -> Optional[Employee]:
        """
        Retrieves an employee by ID.
        """
        result = await self.db.execute(
            select(Employee)
            .where(Employee.id == employee_id, Employee.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_employee_code(self, employee_code: str) -> Optional[Employee]:
        """
        Retrieves an employee by their unique employee code.
        """
        result = await self.db.execute(
            select(Employee)
            .where(Employee.employee_code == employee_code, Employee.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[Employee]:
        """
        Retrieves an employee by their email.
        """
        result = await self.db.execute(
            select(Employee)
            .where(Employee.email == email, Employee.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list_paginated(
        self,
        page: int = 1,
        per_page: int = 20,
        department: Optional[str] = None,
        designation: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Employee], int]:
        """
        Lists employees with pagination, filtering, and search.
        Returns a tuple of (employees list, total count).
        """
        query = select(Employee).where(Employee.deleted_at.is_(None))

        # Apply filters
        if department:
            query = query.where(Employee.department == department)
        if designation:
            query = query.where(Employee.designation == designation)
        if status:
            query = query.where(Employee.status == status)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Employee.first_name.ilike(search_filter),
                    Employee.last_name.ilike(search_filter),
                    Employee.employee_code.ilike(search_filter),
                    Employee.email.ilike(search_filter)
                )
            )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query) or 0

        # Apply pagination limit and offset
        offset = (page - 1) * per_page
        result = await self.db.execute(
            query.order_by(Employee.first_name).offset(offset).limit(per_page)
        )
        employees = result.scalars().all()
        
        return list(employees), total

    async def create(self, employee: Employee) -> Employee:
        self.db.add(employee)
        await self.db.flush()
        return employee

    async def update(self, employee: Employee) -> Employee:
        await self.db.flush()
        return employee

    async def soft_delete(self, employee: Employee) -> None:
        employee.deleted_at = datetime.utcnow()
        employee.status = "inactive"
        await self.db.flush()

    async def get_count(self) -> int:
        """
        Returns active employees count for dashboard.
        """
        query = select(func.count(Employee.id)).where(Employee.deleted_at.is_(None), Employee.status == "active")
        result = await self.db.execute(query)
        return result.scalar() or 0
