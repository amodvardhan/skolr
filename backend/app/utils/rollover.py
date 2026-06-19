import asyncio
import logging
import re
from datetime import date, datetime, timedelta
from uuid import UUID
from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.core.config import settings
from app.models.tenant import AcademicYear, Class, Student

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rollover")

def get_next_academic_year_name(current_name: str) -> str:
    # Matches "2025-26" or "2025-2026"
    match = re.match(r"(\d{4})-(\d{2,4})", current_name)
    if match:
        start_year = int(match.group(1))
        end_year = int(match.group(2))
        
        new_start = start_year + 1
        new_end = end_year + 1
        # preserve digit length of end year
        end_len = len(match.group(2))
        if end_len == 2:
            new_end = new_end % 100
            
        return f"{new_start}-{new_end:02d}"
    return f"{date.today().year}-{date.today().year + 1}"

def get_next_class_name(class_name: str) -> str:
    # Try finding number in class name (e.g. "Class 5" -> "Class 6")
    match = re.search(r"(\d+)", class_name)
    if match:
        num = int(match.group(1))
        return class_name.replace(str(num), str(num + 1))
    return class_name

async def execute_rollover(schema_name: str):
    logger.info(f"Initiating academic rollover for schema: {schema_name}")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Set search path for session
        from sqlalchemy import text
        await session.execute(text(f"SET search_path TO {schema_name}, public"))
        
        # 1. Fetch current active academic year
        ay_result = await session.execute(
            select(AcademicYear).where(
                and_(AcademicYear.is_current == True, AcademicYear.deleted_at.is_(None))
            )
        )
        current_ay = ay_result.scalar_one_or_none()
        if not current_ay:
            logger.error("No active academic year found. Cannot perform rollover.")
            return

        # 2. Determine new year name and dates
        new_name = get_next_academic_year_name(current_ay.name)
        new_start = current_ay.start_date + timedelta(days=365)
        new_end = current_ay.end_date + timedelta(days=365)
        
        logger.info(f"Current Year: {current_ay.name} -> Next Year: {new_name}")
        
        # Check if next academic year already exists
        exists_result = await session.execute(
            select(AcademicYear).where(
                and_(AcademicYear.name == new_name, AcademicYear.deleted_at.is_(None))
            )
        )
        next_ay = exists_result.scalar_one_or_none()
        if next_ay:
            logger.warning(f"Academic year {new_name} already exists. Re-using it.")
        else:
            # Create new academic year
            next_ay = AcademicYear(
                name=new_name,
                start_date=new_start,
                end_date=new_end,
                is_current=False
            )
            session.add(next_ay)
            await session.commit()
            await session.refresh(next_ay)

        # 3. Create duplicate classes for new academic year
        logger.info("Migrating class templates to next academic year...")
        old_classes_result = await session.execute(
            select(Class).where(
                and_(Class.academic_year_id == current_ay.id, Class.deleted_at.is_(None))
            )
        )
        old_classes = old_classes_result.scalars().all()
        
        class_mapping = {} # maps old_class_id -> new_class_id
        new_classes_created = []

        for oc in old_classes:
            # Check if this class already exists in the new academic year
            c_exists = await session.execute(
                select(Class).where(
                    and_(
                        Class.name == oc.name,
                        Class.section == oc.section,
                        Class.academic_year_id == next_ay.id,
                        Class.deleted_at.is_(None)
                    )
                )
            )
            nc = c_exists.scalar_one_or_none()
            if not nc:
                nc = Class(
                    name=oc.name,
                    section=oc.section,
                    academic_year_id=next_ay.id,
                    class_teacher_id=oc.class_teacher_id
                )
                session.add(nc)
                new_classes_created.append(nc)
            class_mapping[oc.id] = nc

        if new_classes_created:
            await session.commit()
            # refresh mapping references
            for oc_id, nc in class_mapping.items():
                await session.refresh(nc)

        # 4. Promote students
        logger.info("Promoting active student roster...")
        students_result = await session.execute(
            select(Student).where(
                and_(Student.status == 'active', Student.deleted_at.is_(None))
            )
        )
        students = students_result.scalars().all()
        
        promotions_count = 0
        alumni_count = 0

        for student in students:
            old_class = next((c for c in old_classes if c.id == student.class_id), None)
            if not old_class:
                continue

            next_class_name = get_next_class_name(old_class.name)
            
            # Find matching class and section in the new year
            target_class_result = await session.execute(
                select(Class).where(
                    and_(
                        Class.name == next_class_name,
                        Class.section == old_class.section,
                        Class.academic_year_id == next_ay.id,
                        Class.deleted_at.is_(None)
                    )
                )
            )
            target_class = target_class_result.scalar_one_or_none()
            
            if target_class:
                # Promote to new class
                student.class_id = target_class.id
                student.roll_number = None # reset roll number for re-allocation
                promotions_count += 1
            else:
                # No next class exists (e.g. student finished final grade). Set to alumni status.
                student.status = 'alumni'
                alumni_count += 1
                
        await session.commit()
        logger.info(f"Student promotions complete: Promoted: {promotions_count}, Graduated to Alumni: {alumni_count}")

        # 5. Flip is_current flag
        current_ay.is_current = False
        next_ay.is_current = True
        await session.commit()
        
        logger.info("Academic year rollover completed successfully!")
    await engine.dispose()

if __name__ == "__main__":
    import sys
    schema = sys.argv[1] if len(sys.argv) > 1 else "school_11111111_1111_1111_1111_111111111111"
    asyncio.run(execute_rollover(schema))
