import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "skolr_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
)

# Load tasks
celery_app.autodiscover_tasks(["app.tasks"])

# Scheduled beat configuration (Sync all corporate statistics nightly at 00:00 midnight)
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    "nightly-corporate-sync": {
        "task": "app.tasks.corporate.sync_corporate_data_task",
        "schedule": crontab(hour=0, minute=0),
    }
}
