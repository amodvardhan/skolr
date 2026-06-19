from uuid import UUID
from datetime import date
from typing import List, Optional, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tenant import (
    FeeHead, FeeStructure, FeeStructureItem, 
    StudentFeeAccount, FeeDiscount, FeeTransaction, 
    Student, Class, StudentParent
)

class FeesRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Fee Heads
    async def get_fee_heads(self) -> List[FeeHead]:
        result = await self.db.execute(select(FeeHead).order_by(FeeHead.name))
        return list(result.scalars().all())

    async def create_fee_head(self, name: str, description: Optional[str] = None) -> FeeHead:
        fh = FeeHead(name=name, description=description)
        self.db.add(fh)
        await self.db.flush()
        return fh

    async def get_fee_head(self, id: UUID) -> Optional[FeeHead]:
        result = await self.db.execute(select(FeeHead).where(FeeHead.id == id))
        return result.scalar_one_or_none()

    # Fee Structures
    async def get_fee_structures(self) -> List[FeeStructure]:
        result = await self.db.execute(
            select(FeeStructure)
            .options(selectinload(FeeStructure.items).selectinload(FeeStructureItem.fee_head))
            .order_by(FeeStructure.name)
        )
        return list(result.scalars().all())

    async def get_fee_structure(self, id: UUID) -> Optional[FeeStructure]:
        result = await self.db.execute(
            select(FeeStructure)
            .options(selectinload(FeeStructure.items).selectinload(FeeStructureItem.fee_head))
            .where(FeeStructure.id == id)
        )
        return result.scalar_one_or_none()

    async def create_fee_structure(self, name: str, academic_year_id: UUID) -> FeeStructure:
        fs = FeeStructure(name=name, academic_year_id=academic_year_id)
        self.db.add(fs)
        await self.db.flush()
        return fs

    async def add_structure_items(self, items: List[FeeStructureItem]) -> None:
        self.db.add_all(items)
        await self.db.flush()

    # Student Fee Accounts
    async def get_student_fee_account(self, student_id: UUID) -> Optional[StudentFeeAccount]:
        result = await self.db.execute(
            select(StudentFeeAccount)
            .where(StudentFeeAccount.student_id == student_id)
        )
        return result.scalar_one_or_none()

    async def create_or_update_student_account(
        self, 
        student_id: UUID, 
        fee_structure_id: UUID, 
        total_applicable: float,
        total_discount: float = 0.0
    ) -> StudentFeeAccount:
        account = await self.get_student_fee_account(student_id)
        if account:
            account.fee_structure_id = fee_structure_id
            account.total_applicable = total_applicable
            account.total_discount = total_discount
        else:
            account = StudentFeeAccount(
                student_id=student_id,
                fee_structure_id=fee_structure_id,
                total_applicable=total_applicable,
                total_paid=0.0,
                total_discount=total_discount
            )
            self.db.add(account)
        await self.db.flush()
        return account

    # Transactions / Payments
    async def create_transaction(self, txn: FeeTransaction) -> FeeTransaction:
        self.db.add(txn)
        await self.db.flush()
        
        # Update paid amount on student account
        account = await self.get_student_fee_account(txn.student_id)
        if account:
            account.total_paid += txn.amount_paid
            await self.db.flush()
            
        return txn

    async def get_student_transactions(self, student_id: UUID) -> List[FeeTransaction]:
        result = await self.db.execute(
            select(FeeTransaction)
            .where(FeeTransaction.student_id == student_id)
            .order_by(FeeTransaction.payment_date.desc(), FeeTransaction.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_next_receipt_number(self) -> str:
        # Generate a unique receipt number using sequence count or time-based unique code
        result = await self.db.execute(select(func.count(FeeTransaction.id)))
        count = result.scalar() or 0
        current_year = date.today().year
        return f"REC-{current_year}-{count + 1:04d}"

    # Defaulters list
    async def get_defaulters(self) -> List[Tuple[Student, Class, StudentFeeAccount, Optional[str]]]:
        """
        Retrieves all active students with outstanding fee balances,
        including their class information, fee account, and parent mobile number.
        """
        # Select active students with outstanding balance > 0
        query = (
            select(
                Student,
                Class,
                StudentFeeAccount,
                # Subquery to fetch first parent's mobile
                select(StudentParent.mobile)
                .where(
                    and_(
                        StudentParent.student_id == Student.id,
                        StudentParent.parent_type.in_(["father", "guardian"])
                    )
                )
                .limit(1)
                .scalar_subquery()
            )
            .join(Class, Student.class_id == Class.id)
            .join(StudentFeeAccount, StudentFeeAccount.student_id == Student.id)
            .where(
                and_(
                    Student.status == 'active',
                    (StudentFeeAccount.total_applicable - StudentFeeAccount.total_paid - StudentFeeAccount.total_discount) > 0
                )
            )
            .order_by(Class.name, Student.first_name)
        )
        result = await self.db.execute(query)
        return list(result.all())

    # Overall Metrics Summary
    async def get_ledger_summary(self) -> dict:
        query = select(
            func.sum(StudentFeeAccount.total_applicable),
            func.sum(StudentFeeAccount.total_paid),
            func.sum(StudentFeeAccount.total_discount)
        )
        result = await self.db.execute(query)
        row = result.fetchone()
        
        applicable = row[0] or 0.0 if row else 0.0
        paid = row[1] or 0.0 if row else 0.0
        discount = row[2] or 0.0 if row else 0.0
        outstanding = max(0.0, applicable - paid - discount)
        
        return {
            "total_collected": paid,
            "total_outstanding": outstanding,
            "total_applicable": applicable,
            "collection_rate": round((paid / applicable * 100), 2) if applicable > 0 else 100.0
        }
