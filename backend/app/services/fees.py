import logging
from uuid import UUID
from datetime import date, datetime
from typing import List, Optional, Tuple
from fastapi import HTTPException, status

from app.repositories.fees import FeesRepository
from app.models.tenant import FeeStructureItem, StudentFeeAccount, FeeTransaction, Student
from app.models.public import Tenant
from app.schemas.fees import FeeStructureCreate, FeeTransactionCreate
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

logger = logging.getLogger("fees_service")

# Phase: 1

class FeesService:
    def __init__(self, repo: FeesRepository):
        self.repo = repo

    async def get_fee_heads(self):
        return await self.repo.get_fee_heads()

    async def create_fee_head(self, name: str, description: Optional[str] = None):
        return await self.repo.create_fee_head(name, description)

    async def get_fee_structures(self):
        return await self.repo.get_fee_structures()

    async def create_fee_structure(self, data: FeeStructureCreate):
        # 1. Create base structure record
        structure = await self.repo.create_fee_structure(data.name, data.academic_year_id)
        
        # 2. Add structural items
        db_items = []
        for item in data.items:
            db_item = FeeStructureItem(
                fee_structure_id=structure.id,
                fee_head_id=item.fee_head_id,
                amount=item.amount,
                frequency=item.frequency
            )
            db_items.append(db_item)
            
        await self.repo.add_structure_items(db_items)
        return await self.repo.get_fee_structure(structure.id)

    async def assign_student_fee_structure(self, student_id: UUID, fee_structure_id: UUID):
        # 1. Load the fee structure and its items to compute total applicable
        structure = await self.repo.get_fee_structure(fee_structure_id)
        if not structure:
            raise HTTPException(status_code=404, detail="Fee structure not found")
            
        total_applicable = sum(item.amount for item in structure.items)
        
        # 2. Update/create student fee account
        return await self.repo.create_or_update_student_account(
            student_id=student_id,
            fee_structure_id=fee_structure_id,
            total_applicable=total_applicable
        )

    async def collect_payment(self, data: FeeTransactionCreate) -> FeeTransaction:
        # 1. Verify student has a fee account
        account = await self.repo.get_student_fee_account(data.student_id)
        if not account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student does not have an active fee account structure assigned."
            )
            
        outstanding = account.total_applicable - account.total_paid - account.total_discount
        if data.amount_paid > outstanding:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Amount paid ({data.amount_paid}) exceeds outstanding balance ({outstanding})."
            )

        # 2. Generate new receipt number
        receipt_no = await self.repo.get_next_receipt_number()
        
        # 3. Create transaction
        txn = FeeTransaction(
            student_id=data.student_id,
            receipt_number=receipt_no,
            amount_paid=data.amount_paid,
            payment_mode=data.payment_mode,
            payment_date=date.today(),
            transaction_reference=data.transaction_reference,
            remarks=data.remarks
        )
        
        return await self.repo.create_transaction(txn)

    async def get_defaulters(self):
        rows = await self.repo.get_defaulters()
        return [
            {
                "student_id": row[0].id,
                "first_name": row[0].first_name,
                "last_name": row[0].last_name,
                "admission_number": row[0].admission_number,
                "class_name": row[1].name,
                "class_section": row[1].section,
                "parent_mobile": row[3] or "N/A",
                "total_applicable": row[2].total_applicable,
                "total_paid": row[2].total_paid,
                "total_discount": row[2].total_discount,
                "outstanding_balance": max(0.0, row[2].total_applicable - row[2].total_paid - row[2].total_discount)
            }
            for row in rows
        ]

    async def get_ledger_summary(self):
        return await self.repo.get_ledger_summary()

    async def generate_receipt_pdf(self, transaction_id: UUID) -> Tuple[bytes, str]:
        """
        Generates the PDF/HTML receipt for a payment transaction.
        If WeasyPrint is available, builds a PDF. Otherwise, returns HTML.
        Returns: Tuple[content_bytes, mime_type]
        """
        # Load transaction, student, class, and fee structure details
        result = await self.repo.db.execute(
            select(FeeTransaction)
            .options(selectinload(FeeTransaction.student).selectinload(Student.current_class))
            .where(FeeTransaction.id == transaction_id)
        )
        txn = result.scalar_one_or_none()
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")

        student = txn.student
        cls = student.current_class
        
        # Fetch school details (using public tenant lookup helper)
        # We can dynamically get the name. We'll default to 'Prestige Public School' if lookup fails.
        school_name = "Prestige Public School"
        try:
            schema_res = await self.repo.db.execute(text("SELECT current_schema()"))
            current_schema = schema_res.scalar() or ""
            if current_schema.startswith("school_"):
                tenant_id_str = current_schema.replace("school_", "").replace("_", "-")
                tenant_res = await self.repo.db.execute(
                    select(Tenant).where(Tenant.id == tenant_id_str)
                )
                tenant = tenant_res.scalar_one_or_none()
                if tenant:
                    school_name = tenant.name
        except Exception as e:
            logger.error(f"Failed to resolve tenant name dynamically: {str(e)}")

        # Generate HTML template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Fee Payment Receipt - {txn.receipt_number}</title>
            <style>
                body {{
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    color: #1e293b;
                    margin: 0;
                    padding: 40px;
                    line-height: 1.5;
                }}
                .receipt-box {{
                    max-width: 800px;
                    margin: auto;
                    padding: 30px;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }}
                .header {{
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-b: 2px solid #3b82f6;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }}
                .school-title {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #1e3a8a;
                }}
                .receipt-title {{
                    font-size: 20px;
                    font-weight: bold;
                    color: #f59e0b;
                    text-transform: uppercase;
                }}
                .grid {{
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 30px;
                }}
                .details-block h4 {{
                    margin: 0 0 8px 0;
                    color: #64748b;
                    text-transform: uppercase;
                    font-size: 11px;
                    letter-spacing: 0.05em;
                }}
                .details-block p {{
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 40px;
                }}
                th {{
                    background-color: #f8fafc;
                    border-bottom: 2px solid #e2e8f0;
                    text-align: left;
                    padding: 12px;
                    font-size: 12px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                }}
                td {{
                    border-bottom: 1px solid #e2e8f0;
                    padding: 14px 12px;
                    font-size: 14px;
                }}
                .total-row {{
                    font-weight: bold;
                    background-color: #f8fafc;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 50px;
                    font-size: 12px;
                    color: #94a3b8;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 20px;
                }}
                .signature-block {{
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 40px;
                }}
                .signature-line {{
                    border-top: 1px solid #94a3b8;
                    width: 200px;
                    text-align: center;
                    font-size: 12px;
                    padding-top: 8px;
                    color: #64748b;
                }}
            </style>
        </head>
        <body>
            <div class="receipt-box">
                <div class="header">
                    <div>
                        <div class="school-title">{school_name}</div>
                        <div style="font-size: 12px; color: #64748b;">Official Fee Payment Receipt</div>
                    </div>
                    <div class="receipt-title">Receipt</div>
                </div>
                
                <div class="grid">
                    <div class="details-block">
                        <h4>Issued To</h4>
                        <p>{student.first_name} {student.last_name}</p>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                            Admission No: <strong>{student.admission_number}</strong><br>
                            Class: {cls.name} (Sec {cls.section})
                        </div>
                    </div>
                    
                    <div class="details-block" style="text-align: right;">
                        <h4>Receipt Details</h4>
                        <p style="color: #1e3a8a;">{txn.receipt_number}</p>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                            Date: {txn.payment_date.strftime('%B %d, %Y')}<br>
                            Method: {txn.payment_mode.upper()}
                            {f'<br>Ref: {txn.transaction_reference}' if txn.transaction_reference else ''}
                        </div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="text-align: right;">Amount Paid</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>School Fee Payment installment ({txn.remarks or 'Standard school fee term payment'})</td>
                            <td style="text-align: right; font-weight: 600;">₹{txn.amount_paid:,.2f}</td>
                        </tr>
                        <tr class="total-row">
                            <td>Total Account Credit</td>
                            <td style="text-align: right; color: #10b981; font-size: 16px;">₹{txn.amount_paid:,.2f}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="signature-block">
                    <div>
                        <div style="height: 50px;"></div>
                        <div class="signature-line">Authorized Signatory</div>
                    </div>
                </div>

                <div class="footer">
                    Thank you for your payment. For queries, write to accounts@{school_name.lower().replace(' ', '')}.edu.in
                </div>
            </div>
        </body>
        </html>
        """

        try:
            import weasyprint
            logger.info("Compiling receipt PDF using WeasyPrint...")
            pdf_bytes = weasyprint.HTML(string=html_content).write_pdf()
            return pdf_bytes, "application/pdf"
        except Exception as e:
            logger.warning(f"WeasyPrint PDF rendering not available (system dependencies might be missing: {str(e)}). Falling back to HTML.")
            # Return raw HTML bytes
            return html_content.encode('utf-8'), "text/html"

    async def send_whatsapp_reminder(self, student_id: UUID) -> dict:
        # 1. Fetch Student, Parent, and Fee Account details
        from app.models.tenant import Student, StudentParent, StudentFeeAccount
        from app.utils.whatsapp import whatsapp_client
        
        result_student = await self.repo.db.execute(
            select(Student)
            .options(selectinload(Student.current_class))
            .where(Student.id == student_id, Student.deleted_at.is_(None))
        )
        student = result_student.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=404, detail="Student record not found")
            
        result_account = await self.repo.db.execute(
            select(StudentFeeAccount)
            .where(StudentFeeAccount.student_id == student_id, StudentFeeAccount.deleted_at.is_(None))
        )
        account = result_account.scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=400, detail="Student has no active fee account configured")
            
        outstanding = max(0.0, account.total_applicable - account.total_paid - account.total_discount)
        if outstanding <= 0:
            raise HTTPException(status_code=400, detail="Student has no outstanding balance dues")
            
        # 2. Fetch primary parent mobile number
        result_parent = await self.repo.db.execute(
            select(StudentParent)
            .where(
                StudentParent.student_id == student_id,
                StudentParent.parent_type.in_(["father", "guardian"]),
                StudentParent.deleted_at.is_(None)
            )
            .limit(1)
        )
        parent = result_parent.scalar_one_or_none()
        if not parent or not parent.mobile:
            raise HTTPException(status_code=400, detail="Primary parent contact mobile number not found")
            
        # 3. Trigger WhatsApp template message via Meta Graph API
        student_name = f"{student.first_name} {student.last_name}"
        amount_str = f"Rs. {outstanding:,.2f}"
        
        try:
            from app.core.config import settings
            template_name = settings.WHATSAPP_FEE_TEMPLATE or "jaspers_market_order_confirmation_v1"
            
            # Formulate parameters based on template configuration
            if template_name == "jaspers_market_order_confirmation_v1":
                body_params = [
                    student_name, 
                    f"Outstanding Fee: {amount_str}", 
                    date.today().strftime("%b %d, %Y")
                ]
            else:
                body_params = [student_name, amount_str]

            logger.info(f"Triggering fee payment WhatsApp reminder for {student_name} (mobile: {parent.mobile}, outstanding: {amount_str}) using template [{template_name}]...")
            whatsapp_res = await whatsapp_client.send_template_message(
                to_phone=parent.mobile,
                template_name=template_name,
                language_code="en_US" if template_name == "jaspers_market_order_confirmation_v1" else "en",
                body_parameters=body_params
            )
            
            if whatsapp_res.get("success"):
                return {
                    "success": True,
                    "message": f"WhatsApp payment reminder successfully sent to {parent.first_name} at {parent.mobile}"
                }
            else:
                raise HTTPException(
                    status_code=502,
                    detail=f"Meta Graph API error: {whatsapp_res.get('message')}"
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to dispatch WhatsApp reminder: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send WhatsApp message: {str(e)}"
            )

    async def generate_payment_link(self, student_id: UUID, school_id: str) -> str:
        # 1. Fetch Student, Parent, and Fee Account details
        from app.models.tenant import Student, StudentParent, StudentFeeAccount
        from app.utils.razorpay import razorpay_client
        
        result_student = await self.repo.db.execute(
            select(Student)
            .options(selectinload(Student.current_class))
            .where(Student.id == student_id, Student.deleted_at.is_(None))
        )
        student = result_student.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=404, detail="Student record not found")
            
        result_account = await self.repo.db.execute(
            select(StudentFeeAccount)
            .where(StudentFeeAccount.student_id == student_id, StudentFeeAccount.deleted_at.is_(None))
        )
        account = result_account.scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=400, detail="Student has no active fee account configured")
            
        outstanding = max(0.0, account.total_applicable - account.total_paid - account.total_discount)
        if outstanding <= 0:
            raise HTTPException(status_code=400, detail="Student has no outstanding balance dues")
            
        # 2. Fetch primary parent mobile number
        result_parent = await self.repo.db.execute(
            select(StudentParent)
            .where(
                StudentParent.student_id == student_id,
                StudentParent.parent_type.in_(["father", "guardian"]),
                StudentParent.deleted_at.is_(None)
            )
            .limit(1)
        )
        parent = result_parent.scalar_one_or_none()
        if not parent or not parent.mobile:
            raise HTTPException(status_code=400, detail="Primary parent contact mobile number not found")
            
        student_name = f"{student.first_name} {student.last_name}"
        description = f"Outstanding school fee payment for {student_name} ({student.admission_number})"
        
        # 3. Call Razorpay client
        payment_url = await razorpay_client.create_payment_link(
            amount=outstanding,
            student_id=str(student_id),
            student_name=student_name,
            parent_mobile=parent.mobile,
            school_id=school_id,
            description=description
        )
        
        if not payment_url:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to generate online payment link from Razorpay."
            )
            
        return payment_url

    async def process_webhook_payment(self, payload: dict) -> dict:
        from app.models.tenant import Student, StudentParent, StudentFeeAccount
        from app.utils.whatsapp import whatsapp_client
        
        event = payload.get("event")
        entity_payload = payload.get("payload", {})
        
        payment_link = entity_payload.get("payment_link", {}).get("entity", {})
        payment = entity_payload.get("payment", {}).get("entity", {})
        
        notes = payment_link.get("notes") or payment.get("notes") or payload.get("notes") or {}
        
        student_id_str = notes.get("student_id") or payload.get("student_id")
        school_id_str = notes.get("school_id") or payload.get("school_id")
        
        if not student_id_str or not school_id_str:
            logger.error("Missing student_id or school_id in Razorpay webhook payload.")
            raise HTTPException(status_code=400, detail="Missing student_id or school_id in notes")
            
        student_id = UUID(student_id_str)
        
        # 1. Dynamically switch search path to tenant's schema
        from app.core.database import sanitize_schema_name
        schema_name = sanitize_schema_name(school_id_str)
        await self.repo.db.execute(text(f"SET search_path TO {schema_name}, public"))
        
        # 2. Check if transaction reference already processed
        payment_id = payment.get("id") or payload.get("payment_id") or f"pay_mock_{student_id_str[:8]}"
        
        result_txn = await self.repo.db.execute(
            select(FeeTransaction).where(FeeTransaction.transaction_reference == payment_id)
        )
        existing_txn = result_txn.scalar_one_or_none()
        if existing_txn:
            logger.info(f"Webhook payment ID {payment_id} already processed. Skipping.")
            return {"success": True, "message": "Transaction already recorded."}
            
        # 3. Calculate amount paid
        amount_paid_paise = payment.get("amount") or payment_link.get("amount")
        if amount_paid_paise is not None:
            amount_paid = float(amount_paid_paise) / 100.0
        else:
            amount_paid = float(payload.get("amount", 0))
            
        if amount_paid <= 0:
            logger.error("Payment amount must be greater than 0.")
            raise HTTPException(status_code=400, detail="Invalid payment amount")
            
        # 4. Save transaction
        receipt_no = await self.repo.get_next_receipt_number()
        payment_mode = payment.get("method") or payload.get("payment_method") or "upi"
        
        txn = FeeTransaction(
            student_id=student_id,
            receipt_number=receipt_no,
            amount_paid=amount_paid,
            payment_mode=payment_mode,
            payment_date=date.today(),
            transaction_reference=payment_id,
            remarks="Online Payment via Razorpay Webhook"
        )
        
        await self.repo.create_transaction(txn)
        await self.repo.db.commit()
        
        # 5. Send confirmation WhatsApp message to parent
        result_student = await self.repo.db.execute(
            select(Student)
            .where(Student.id == student_id, Student.deleted_at.is_(None))
        )
        student = result_student.scalar_one_or_none()
        if student:
            result_parent = await self.repo.db.execute(
                select(StudentParent)
                .where(
                    StudentParent.student_id == student_id,
                    StudentParent.parent_type.in_(["father", "guardian"]),
                    StudentParent.deleted_at.is_(None)
                )
                .limit(1)
            )
            parent = result_parent.scalar_one_or_none()
            if parent and parent.mobile:
                student_name = f"{student.first_name} {student.last_name}"
                amount_str = f"Rs. {amount_paid:,.2f}"
                
                try:
                    from app.core.config import settings
                    template_name = settings.WHATSAPP_PAYMENT_SUCCESS_TEMPLATE or "jaspers_market_order_confirmation_v1"
                    
                    if template_name == "jaspers_market_order_confirmation_v1":
                        body_params = [
                            student_name,
                            f"Payment Success: {amount_str}",
                            date.today().strftime("%b %d, %Y")
                        ]
                    else:
                        body_params = [student_name, amount_str]
                        
                    logger.info(f"Triggering payment success WhatsApp notification for {student_name} using template [{template_name}]...")
                    await whatsapp_client.send_template_message(
                        to_phone=parent.mobile,
                        template_name=template_name,
                        language_code="en_US" if template_name == "jaspers_market_order_confirmation_v1" else "en",
                        body_parameters=body_params
                    )
                except Exception as ex:
                    logger.error(f"Failed to dispatch payment success WhatsApp alert: {str(ex)}")
                    
        return {"success": True, "receipt_number": receipt_no, "status": "processed"}

    async def get_fees_analytics(self) -> dict:
        summary = await self.repo.get_ledger_summary()
        monthly = await self.repo.get_monthly_collections()
        modes = await self.repo.get_payment_mode_breakdown()
        classes = await self.repo.get_class_collection_performance()
        
        return {
            "summary": {
                "total_collected": summary["total_collected"],
                "total_outstanding": summary["total_outstanding"],
                "total_applicable": summary["total_applicable"],
                "collection_rate": summary["collection_rate"]
            },
            "monthly_collections": monthly,
            "payment_modes": modes,
            "class_collections": classes
        }

    async def get_transactions_ledger(
        self,
        page: int = 1,
        per_page: int = 20,
        payment_mode: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[dict], int]:
        return await self.repo.get_all_transactions_ledger(
            page=page,
            per_page=per_page,
            payment_mode=payment_mode,
            search=search
        )
