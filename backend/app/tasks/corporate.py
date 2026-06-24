# Phase: 3
import asyncio
import logging
from app.tasks.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.routers.corporate import run_sync_logic

logger = logging.getLogger("corporate_tasks")

def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    if loop.is_running():
        # Ensure execution is scheduled if loop is running
        return asyncio.ensure_future(coro)
    else:
        return loop.run_until_complete(coro)

@celery_app.task
def sync_corporate_data_task():
    logger.info("Executing Celery corporate analytics sync background job...")
    async def sync():
        async with AsyncSessionLocal() as db:
            # Syncing with None as chain_id aggregates stats globally across all tenants
            await run_sync_logic(db, chain_id=None)
            await db.commit()
            
    try:
        run_async(sync())
        logger.info("Nightly corporate analytics database synchronization completed successfully.")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to perform background corporate sync: {str(e)}")
        return {"status": "failed", "error": str(e)}
