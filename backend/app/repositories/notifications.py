from uuid import UUID
from typing import List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.models.tenant import NotificationTemplate, NotificationLog
from app.models.public import User

class NotificationsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- Notification Templates ---
    async def get_template_by_id(self, template_id: UUID) -> Optional[NotificationTemplate]:
        result = await self.db.execute(
            select(NotificationTemplate).where(
                NotificationTemplate.id == template_id,
                NotificationTemplate.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def list_templates(self) -> List[NotificationTemplate]:
        result = await self.db.execute(
            select(NotificationTemplate)
            .where(NotificationTemplate.deleted_at.is_(None))
            .order_by(NotificationTemplate.name)
        )
        return list(result.scalars().all())

    async def create_template(self, template: NotificationTemplate) -> NotificationTemplate:
        self.db.add(template)
        await self.db.flush()
        return template

    async def delete_template(self, template: NotificationTemplate) -> None:
        template.deleted_at = datetime.utcnow()
        await self.db.flush()

    # --- Notification Logs ---
    async def get_log_by_id(self, log_id: UUID) -> Optional[NotificationLog]:
        result = await self.db.execute(
            select(NotificationLog).where(
                NotificationLog.id == log_id,
                NotificationLog.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def list_logs(self, page: int, per_page: int, status: Optional[str] = None) -> Tuple[List[dict], int]:
        # Build select query with join to users to get sender name
        query = (
            select(
                NotificationLog,
                User.first_name,
                User.last_name
            )
            .outerjoin(User, NotificationLog.sender_id == User.id)
            .where(NotificationLog.deleted_at.is_(None))
        )

        if status:
            query = query.where(NotificationLog.status == status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query) or 0

        # Apply pagination
        offset = (page - 1) * per_page
        query = query.order_by(NotificationLog.created_at.desc()).offset(offset).limit(per_page)

        result = await self.db.execute(query)
        rows = result.all()

        logs_data = []
        for log, first_name, last_name in rows:
            sender_name = f"{first_name} {last_name}".strip() if first_name else None
            logs_data.append({
                "id": log.id,
                "sender_id": log.sender_id,
                "sender_name": sender_name,
                "recipient_name": log.recipient_name,
                "recipient_phone": log.recipient_phone,
                "message_body": log.message_body,
                "channel": log.channel,
                "status": log.status,
                "error_message": log.error_message,
                "created_at": log.created_at
            })

        return logs_data, total

    async def create_log(self, log: NotificationLog) -> NotificationLog:
        self.db.add(log)
        await self.db.flush()
        return log

    async def create_logs_bulk(self, logs: List[NotificationLog]) -> None:
        self.db.add_all(logs)
        await self.db.flush()
