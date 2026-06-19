from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.public import User
from app.models.tenant import Student, Employee, FeeTransaction, AcademicYear

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

class DashboardStatsResponse(BaseModel):
    success: bool = True
    total_students: int
    active_employees: int
    total_fees_collected: float
    current_term: str

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "teacher", "parent", "accountant"]))
):
    # 1. Total Enrolled Students
    student_count_query = select(func.count(Student.id)).where(
        and_(Student.status == "active", Student.deleted_at.is_(None))
    )
    student_count_res = await db.execute(student_count_query)
    total_students = student_count_res.scalar() or 0

    # 2. Active Employees
    employee_count_query = select(func.count(Employee.id)).where(
        and_(Employee.status == "active", Employee.deleted_at.is_(None))
    )
    employee_count_res = await db.execute(employee_count_query)
    active_employees = employee_count_res.scalar() or 0

    # 3. Total Fees Collected
    fees_collected_query = select(func.sum(FeeTransaction.amount_paid)).where(
        FeeTransaction.deleted_at.is_(None)
    )
    fees_collected_res = await db.execute(fees_collected_query)
    total_fees_collected = float(fees_collected_res.scalar() or 0.0)

    # 4. Current Term / Academic Year
    ay_query = select(AcademicYear.name).where(
        and_(AcademicYear.is_current == True, AcademicYear.deleted_at.is_(None))
    )
    ay_res = await db.execute(ay_query)
    current_term = ay_res.scalar() or "N/A"

    return DashboardStatsResponse(
        total_students=total_students,
        active_employees=active_employees,
        total_fees_collected=total_fees_collected,
        current_term=current_term
    )
