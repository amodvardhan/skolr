from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException, status
from datetime import datetime

from app.repositories.academics import AcademicsRepository
from app.models.tenant import Subject, Homework, HomeworkSubmission
from app.schemas.academics import (
    SubjectCreate, SubjectUpdate, HomeworkCreate, 
    SubmissionGradeRequest, SubmissionResponseData
)

# Phase: 1

class AcademicsService:
    def __init__(self, repo: AcademicsRepository):
        self.repo = repo

    # --- Subject Master ---
    async def create_subject(self, data: SubjectCreate) -> Subject:
        """
        Creates a new subject, validating that the code is unique.
        """
        existing = await self.repo.get_subject_by_code(data.code.strip())
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subject with code '{data.code}' already exists."
            )
            
        subject = Subject(
            name=data.name.strip(),
            code=data.code.strip().upper(),
            description=data.description.strip() if data.description else None
        )
        return await self.repo.create_subject(subject)

    async def list_subjects(self) -> List[Subject]:
        return await self.repo.list_subjects()

    async def delete_subject(self, subject_id: UUID) -> None:
        subject = await self.repo.get_subject_by_id(subject_id)
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found"
            )
        await self.repo.delete_subject(subject)

    # --- Homework Management ---
    async def create_homework(self, data: HomeworkCreate, teacher_id: UUID) -> Homework:
        """
        Creates a new homework task assigned by a teacher.
        """
        homework = Homework(
            title=data.title.strip(),
            description=data.description.strip(),
            due_date=data.due_date,
            attachment_url=data.attachment_url.strip() if data.attachment_url else None,
            class_id=data.class_id,
            subject_id=data.subject_id,
            created_by=teacher_id
        )
        created = await self.repo.create_homework(homework)
        
        # Load relationships for response schema
        return await self.repo.get_homework_by_id(created.id)

    async def get_homework(self, homework_id: UUID) -> Homework:
        homework = await self.repo.get_homework_by_id(homework_id)
        if not homework:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homework task not found."
            )
        return homework

    async def list_homework(
        self, 
        class_id: Optional[UUID] = None, 
        subject_id: Optional[UUID] = None
    ) -> List[Homework]:
        return await self.repo.list_homework(class_id=class_id, subject_id=subject_id)

    async def delete_homework(self, homework_id: UUID) -> None:
        homework = await self.repo.get_homework_by_id(homework_id)
        if not homework:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homework task not found."
            )
        await self.repo.delete_homework(homework)

    # --- Submissions & Roster ---
    async def get_submissions_roster(self, homework_id: UUID) -> List[SubmissionResponseData]:
        """
        Generates a list representing the entire class roster for a homework.
        If a student has not submitted yet, their status defaults to 'missing'.
        """
        homework = await self.repo.get_homework_by_id(homework_id)
        if not homework:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homework task not found."
            )

        students = await self.repo.get_students_for_class(homework.class_id)
        submissions = await self.repo.list_submissions_for_homework(homework_id)
        
        # Map student_id to submission record
        sub_map = {sub.student_id: sub for sub in submissions}
        
        roster = []
        for student in students:
            sub = sub_map.get(student.id)
            if sub:
                roster.append(SubmissionResponseData(
                    id=sub.id,
                    homework_id=homework_id,
                    student_id=student.id,
                    student_name=f"{student.first_name} {student.last_name}",
                    roll_number=student.roll_number,
                    submission_date=sub.submission_date,
                    attachment_url=sub.attachment_url,
                    status=sub.status,
                    remarks=sub.remarks,
                    grade=sub.grade,
                    created_at=sub.created_at,
                    updated_at=sub.updated_at
                ))
            else:
                roster.append(SubmissionResponseData(
                    id=student.id, # Fallback ID for missing
                    homework_id=homework_id,
                    student_id=student.id,
                    student_name=f"{student.first_name} {student.last_name}",
                    roll_number=student.roll_number,
                    submission_date=None,
                    attachment_url=None,
                    status="missing",
                    remarks=None,
                    grade=None,
                    created_at=None,
                    updated_at=None
                ))
                
        return roster

    async def grade_submission(
        self, 
        homework_id: UUID, 
        student_id: UUID, 
        grade_data: SubmissionGradeRequest
    ) -> HomeworkSubmission:
        """
        Grades or updates status of a student's homework.
        Creates a submission record if the student hasn't submitted digitally.
        """
        homework = await self.repo.get_homework_by_id(homework_id)
        if not homework:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homework task not found."
            )

        submission = await self.repo.get_submission(homework_id, student_id)
        if not submission:
            # Create a submission placeholder to hold grades/remarks
            submission = HomeworkSubmission(
                homework_id=homework_id,
                student_id=student_id,
                status=grade_data.status,
                remarks=grade_data.remarks,
                grade=grade_data.grade
            )
            return await self.repo.create_submission(submission)
        else:
            # Update existing submission
            submission.status = grade_data.status
            submission.remarks = grade_data.remarks
            submission.grade = grade_data.grade
            return await self.repo.update_submission(submission)
