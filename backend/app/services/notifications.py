# Phase: 1
import logging
from uuid import UUID
from typing import List, Tuple, Optional
from sqlalchemy import select, text
from fastapi import HTTPException, status
from datetime import datetime

from app.core.database import AsyncSessionLocal, sanitize_schema_name
from app.repositories.notifications import NotificationsRepository
from app.models.tenant import NotificationTemplate, NotificationLog, Student, Class
from app.utils.whatsapp import whatsapp_client
from app.schemas.notifications import NotificationTemplateCreate, BroadcastRequest

logger = logging.getLogger("notifications_service")

async def send_broadcast_background(
    school_id: str,
    sender_id: Optional[UUID],
    template_id: UUID,
    target_type: str,
    class_id: Optional[UUID],
    custom_phones: Optional[List[str]],
    variables: List[str]
):
    logger.info(f"Starting background broadcast for school {school_id}, template {template_id}")
    
    async with AsyncSessionLocal() as session:
        # Set tenant schema search path
        schema_name = sanitize_schema_name(school_id)
        await session.execute(text(f"SET search_path TO {schema_name}, public"))
        
        # Fetch template
        template_result = await session.execute(
            select(NotificationTemplate).where(
                NotificationTemplate.id == template_id,
                NotificationTemplate.deleted_at.is_(None)
            )
        )
        template = template_result.scalar_one_or_none()
        if not template:
            logger.error(f"Template {template_id} not found in background task")
            return
            
        # Resolve recipients
        recipients = []
        if target_type == "individual":
            if custom_phones:
                for phone in custom_phones:
                    cleaned_phone = phone.strip()
                    if not cleaned_phone:
                        continue
                    
                    # Try matching parent name if they exist in the DB
                    from app.models.tenant import StudentParent
                    parent_result = await session.execute(
                        select(StudentParent).where(StudentParent.mobile == cleaned_phone)
                    )
                    parent = parent_result.scalars().first()
                    name = f"{parent.first_name} {parent.last_name}".strip() if parent else "Recipient"
                    
                    recipients.append({"name": name, "phone": cleaned_phone})
        else:
            # Query active students and their parents
            from sqlalchemy.orm import selectinload
            student_query = select(Student).options(selectinload(Student.parents)).where(
                Student.status == "active",
                Student.deleted_at.is_(None)
            )
            if target_type == "class":
                student_query = student_query.where(Student.class_id == class_id)
                
            student_result = await session.execute(student_query)
            students = student_result.scalars().all()
            
            seen_phones = set()
            for student in students:
                for parent in student.parents:
                    phone = parent.mobile.strip() if parent.mobile else ""
                    if not phone:
                        continue
                    if phone in seen_phones:
                        continue
                    seen_phones.add(phone)
                    
                    recipients.append({
                        "name": f"{parent.first_name} {parent.last_name}".strip(),
                        "phone": phone
                    })
                    
        if not recipients:
            logger.warning("No recipients found for broadcast")
            return
            
        # Substitute variables in body format to generate full message
        message_body = template.body_format
        for i, val in enumerate(variables, 1):
            message_body = message_body.replace(f"{{{{{i}}}}}", str(val))
            
        # Process dispatches
        logs_to_create = []
        for recipient in recipients:
            status_val = "sent"
            error_msg = None
            
            try:
                # Call whatsapp client
                response = await whatsapp_client.send_template_message(
                    to_phone=recipient["phone"],
                    template_name=template.template_name,
                    body_parameters=variables
                )
                if not response.get("success", False):
                    status_val = "failed"
                    error_msg = response.get("message", "Unknown Meta API error")
            except ValueError as ve:
                status_val = "failed"
                error_msg = str(ve)
                logger.warning(f"Meta Graph API credentials missing: {str(ve)}")
            except Exception as e:
                status_val = "failed"
                error_msg = str(e)
                logger.error(f"Failed to send broadcast to {recipient['phone']}: {str(e)}")
                
            # Create log object
            log = NotificationLog(
                sender_id=sender_id,
                recipient_name=recipient["name"],
                recipient_phone=recipient["phone"],
                message_body=message_body,
                channel="whatsapp",
                status=status_val,
                error_message=error_msg[:255] if error_msg else None
            )
            logs_to_create.append(log)
            
        # Bulk save logs
        session.add_all(logs_to_create)
        await session.commit()
        logger.info(f"Broadcast complete. Created {len(logs_to_create)} notification log entries.")


class NotificationsService:
    def __init__(self, repo: NotificationsRepository):
        self.repo = repo

    async def create_template(self, data: NotificationTemplateCreate) -> NotificationTemplate:
        template = NotificationTemplate(
            name=data.name,
            template_name=data.template_name,
            body_format=data.body_format,
            category=data.category
        )
        return await self.repo.create_template(template)

    async def get_template(self, template_id: UUID) -> NotificationTemplate:
        template = await self.repo.get_template_by_id(template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification template not found"
            )
        return template

    async def list_templates(self) -> List[NotificationTemplate]:
        return await self.repo.list_templates()

    async def delete_template(self, template_id: UUID) -> None:
        template = await self.get_template(template_id)
        await self.repo.delete_template(template)

    async def list_logs(self, page: int, per_page: int, status_filter: Optional[str] = None) -> Tuple[List[dict], int]:
        return await self.repo.list_logs(page=page, per_page=per_page, status=status_filter)

    async def trigger_broadcast(
        self,
        request: BroadcastRequest,
        sender_id: Optional[UUID],
        school_id: str,
        background_tasks
    ) -> None:
        # 1. Verify template exists
        await self.get_template(request.template_id)
        
        # 2. If target is class, verify class exists
        if request.target_type == "class":
            if not request.class_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="class_id is required when target_type is class"
                )
            class_result = await self.repo.db.execute(
                select(Class).where(Class.id == request.class_id, Class.deleted_at.is_(None))
            )
            cls = class_result.scalar_one_or_none()
            if not cls:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Target class not found"
                )

        # 3. Add background task
        background_tasks.add_task(
            send_broadcast_background,
            school_id=school_id,
            sender_id=sender_id,
            template_id=request.template_id,
            target_type=request.target_type,
            class_id=request.class_id,
            custom_phones=request.custom_phones,
            variables=request.variables
        )
