from fastapi import APIRouter, Depends, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import require_roles
from app.repositories.fees import FeesRepository
from app.services.fees import FeesService
from app.schemas.fees import (
    FeeHeadCreate, FeeHeadResponse,
    FeeStructureCreate, FeeStructureResponse,
    StudentFeeAccountResponse, StudentFeeAccountDetailResponse,
    FeeTransactionCreate, FeeTransactionResponse,
    FeeDefaulterResponse, FeeSummaryResponse
)
from app.models.public import User
from pydantic import BaseModel

router = APIRouter(prefix="/fees", tags=["Fees Management"])

class AssignStructureRequest(BaseModel):
    student_id: UUID
    fee_structure_id: UUID

@router.get("/heads", response_model=List[FeeHeadResponse])
async def list_fee_heads(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "accountant"]))
):
    repo = FeesRepository(db)
    service = FeesService(repo)
    return await service.get_fee_heads()

@router.post("/heads", response_model=FeeHeadResponse, status_code=status.HTTP_201_CREATED)
async def create_fee_head(
    data: FeeHeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = FeesRepository(db)
    service = FeesService(repo)
    return await service.create_fee_head(name=data.name, description=data.description)

@router.get("/structures", response_model=List[FeeStructureResponse])
async def list_fee_structures(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "accountant", "teacher"]))
):
    repo = FeesRepository(db)
    service = FeesService(repo)
    return await service.get_fee_structures()

@router.post("/structures", response_model=FeeStructureResponse, status_code=status.HTTP_201_CREATED)
async def create_fee_structure(
    data: FeeStructureCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin"]))
):
    repo = FeesRepository(db)
    service = FeesService(repo)
    return await service.create_fee_structure(data)

@router.post("/accounts/assign", response_model=StudentFeeAccountResponse)
async def assign_student_fee_structure(
    request: AssignStructureRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "accountant"]))
):
    repo = FeesRepository(db)
    service = FeesService(repo)
    return await service.assign_student_fee_structure(
        student_id=request.student_id,
        fee_structure_id=request.fee_structure_id
    )

class StudentAccountDetails(BaseModel):
    account: Optional[StudentFeeAccountDetailResponse] = None
    transactions: List[FeeTransactionResponse] = []

@router.get("/accounts/student/{student_id}", response_model=StudentAccountDetails)
async def get_student_fee_details(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "accountant", "teacher", "parent"]))
):
    repo = FeesRepository(db)
    service = FeesService(repo)
    
    # 1. Fetch account
    account_obj = await repo.get_student_fee_account(student_id)
    account_data = None
    if account_obj:
        # Load structure
        structure_obj = await repo.get_fee_structure(account_obj.fee_structure_id)
        account_data = StudentFeeAccountDetailResponse(
            id=account_obj.id,
            student_id=account_obj.student_id,
            fee_structure_id=account_obj.fee_structure_id,
            total_applicable=account_obj.total_applicable,
            total_paid=account_obj.total_paid,
            total_discount=account_obj.total_discount,
            outstanding_balance=max(0.0, account_obj.total_applicable - account_obj.total_paid - account_obj.total_discount),
            fee_structure=structure_obj
        )

    # 2. Fetch transaction logs
    txns = await repo.get_student_transactions(student_id)
    
    return StudentAccountDetails(
        account=account_data,
        transactions=txns
    )

@router.post("/transactions", response_model=FeeTransactionResponse, status_code=status.HTTP_201_CREATED)
async def record_payment(
    data: FeeTransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "accountant"]))
):
    repo = FeesRepository(db)
    service = FeesService(repo)
    return await service.collect_payment(data)

@router.get("/defaulters", response_model=List[FeeDefaulterResponse])
async def list_defaulters(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "accountant"]))
):
    repo = FeesRepository(db)
    service = FeesService(repo)
    return await service.get_defaulters()

@router.get("/summary", response_model=FeeSummaryResponse)
async def get_ledger_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "accountant"]))
):
    repo = FeesRepository(db)
    service = FeesService(repo)
    return await service.get_ledger_summary()

@router.get("/transactions/{transaction_id}/receipt")
async def download_receipt(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "accountant", "parent"]))
):
    repo = FeesRepository(db)
    service = FeesService(repo)
    content_bytes, mime_type = await service.generate_receipt_pdf(transaction_id)
    
    # Return binary response with correct header (weasyprint PDF or HTML fallback)
    return Response(
        content=content_bytes,
        media_type=mime_type,
        headers={
            "Content-Disposition": f"inline; filename=receipt_{transaction_id}.{'pdf' if mime_type == 'application/pdf' else 'html'}"
        }
    )

@router.post("/defaulters/{student_id}/remind")
async def send_fee_reminder(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "accountant"]))
):
    repo = FeesRepository(db)
    service = FeesService(repo)
    return await service.send_whatsapp_reminder(student_id)

@router.post("/accounts/student/{student_id}/payment-link")
async def generate_payment_link(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["school_admin", "accountant"]))
):
    repo = FeesRepository(db)
    service = FeesService(repo)
    payment_url = await service.generate_payment_link(student_id, str(current_user.school_id))
    return {"success": True, "payment_url": payment_url}

@router.post("/webhook")
async def razorpay_webhook(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Public webhook endpoint called by Razorpay.
    Note: X-School-ID is not present on third-party webhook requests;
    we switch context schemas on-the-fly inside the service based on notes.
    """
    repo = FeesRepository(db)
    service = FeesService(repo)
    return await service.process_webhook_payment(payload)

@router.get("/mock-checkout")
async def mock_checkout(
    student_id: UUID,
    amount: float,
    student_name: str,
    parent_mobile: str,
    school_id: UUID
):
    """
    Serves a simple HTML page simulating a checkout experience in development/sandbox mode.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Skolr | Razorpay Sandbox Simulator</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; padding: 40px; display: flex; justify-content: center; }}
            .box {{ background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; padding: 32px; width: 100%; max-width: 480px; text-align: center; }}
            .badge {{ background: #fee2e2; color: #ef4444; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 8px; border-radius: 9999px; letter-spacing: 0.05em; display: inline-block; margin-bottom: 16px; }}
            h2 {{ margin: 0 0 8px 0; color: #1e3a8a; font-weight: 800; }}
            p {{ color: #64748b; font-size: 14px; margin: 0 0 24px 0; }}
            .details {{ background: #f1f5f9; border-radius: 12px; padding: 16px; text-align: left; margin-bottom: 24px; font-size: 13px; }}
            .row {{ display: flex; justify-content: space-between; margin-bottom: 8px; }}
            .row:last-child {{ margin-bottom: 0; border-top: 1px dashed #cbd5e1; padding-top: 8px; font-weight: 750; }}
            .btn {{ background: #1e40af; color: white; border: none; border-radius: 8px; padding: 12px 24px; font-weight: 600; font-size: 14px; width: 100%; cursor: pointer; transition: background 0.2s; }}
            .btn:hover {{ background: #1d4ed8; }}
            .success-box {{ display: none; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 16px; border-radius: 12px; font-size: 14px; margin-bottom: 24px; }}
        </style>
    </head>
    <body>
        <div class="box">
            <span class="badge">Razorpay Sandbox Simulator</span>
            <h2>Secure Gateway Portal</h2>
            <p>You are in Skolr's offline development sandbox mode. Confirm the payment below to simulate a successful transactions cycle.</p>
            
            <div id="successMessage" class="success-box">
                <strong>Payment Confirmed!</strong> Hook trigger dispatched to system. You can close this window now.
            </div>

            <div class="details">
                <div class="row"><span>Ward Name</span><strong>{student_name}</strong></div>
                <div class="row"><span>Parent Contact</span><strong>{parent_mobile}</strong></div>
                <div class="row"><span>Tenant ID</span><strong style="font-size:10px; font-family:monospace;">{school_id}</strong></div>
                <div class="row"><span>Dues Amount</span><strong style="color: #ef4444;">₹{amount:.2f}</strong></div>
            </div>
            
            <button id="payBtn" class="btn" onclick="triggerPayment()">Simulate Payment Success</button>
        </div>

        <script>
            async function triggerPayment() {{
                const btn = document.getElementById('payBtn');
                btn.disabled = true;
                btn.innerText = 'Processing simulated payment...';
                
                const payload = {{
                    "event": "payment_link.paid",
                    "notes": {{
                        "student_id": "{student_id}",
                        "school_id": "{school_id}"
                    }},
                    "payment_id": "pay_mock_" + Math.random().toString(36).substring(2, 12),
                    "payment_method": "upi",
                    "amount": {amount}
                }};
                
                try {{
                    const response = await fetch('/api/v1/fees/webhook', {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json'
                        }},
                        body: JSON.stringify(payload)
                    }});
                    
                    if (response.ok) {{
                        document.getElementById('successMessage').style.display = 'block';
                        btn.style.display = 'none';
                    }} else {{
                        const data = await response.json();
                        alert('Simulation error: ' + (data.detail || 'Webhook returned status ' + response.status));
                        btn.disabled = false;
                        btn.innerText = 'Simulate Payment Success';
                    }}
                }} catch (err) {{
                    alert('Connection failure: ' + err.message);
                    btn.disabled = false;
                    btn.innerText = 'Simulate Payment Success';
                }}
            }}
        </script>
    </body>
    </html>
    """
    return Response(content=html_content, media_type="text/html")

