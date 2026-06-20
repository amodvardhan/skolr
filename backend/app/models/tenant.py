from sqlalchemy import String, Boolean, Date, ForeignKey, Integer, DateTime, Float, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import UUID
from datetime import date, datetime

from app.core.database import SkolrBase, TimestampMixin

class AcademicYear(SkolrBase, TimestampMixin):
    __tablename__ = "academic_years"

    name: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "2025-26"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)

class Class(SkolrBase, TimestampMixin):
    __tablename__ = "classes"

    name: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "Class 5"
    section: Mapped[str] = mapped_column(String(10), nullable=False) # e.g. "A"
    
    academic_year_id: Mapped[UUID] = mapped_column(ForeignKey("academic_years.id"), nullable=False)
    academic_year = relationship("AcademicYear")
    
    class_teacher_id: Mapped[UUID | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    class_teacher = relationship("Employee", foreign_keys=[class_teacher_id])

class Employee(SkolrBase, TimestampMixin):
    __tablename__ = "employees"

    employee_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    designation: Mapped[str] = mapped_column(String(100), nullable=False) # teacher, principal, accountant
    department: Mapped[str] = mapped_column(String(100), nullable=False) # Academics, Admin, Finance
    date_of_joining: Mapped[date] = mapped_column(Date, nullable=False)
    employment_type: Mapped[str] = mapped_column(String(20)) # permanent, contract
    mobile: Mapped[str] = mapped_column(String(15), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active") # active, inactive
    qualification: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("public.users.id"), nullable=True)

class Student(SkolrBase, TimestampMixin):
    __tablename__ = "students"

    admission_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(1), nullable=False) # M, F, O
    roll_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    admission_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active") # active, inactive, transferred, alumni
    
    class_id: Mapped[UUID] = mapped_column(ForeignKey("classes.id"), nullable=False)
    current_class = relationship("Class")
    
    parents = relationship("StudentParent", back_populates="student")

class StudentParent(SkolrBase, TimestampMixin):
    __tablename__ = "student_parents"

    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id"), nullable=False)
    student = relationship("Student", back_populates="parents")
    
    parent_type: Mapped[str] = mapped_column(String(20), nullable=False) # father, mother, guardian
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    mobile: Mapped[str] = mapped_column(String(15), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("public.users.id"), nullable=True)

class AttendanceSession(SkolrBase, TimestampMixin):
    __tablename__ = "attendance_sessions"

    class_id: Mapped[UUID] = mapped_column(ForeignKey("classes.id"), nullable=False)
    subject_id: Mapped[UUID | None] = mapped_column(nullable=True)
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    session_type: Mapped[str] = mapped_column(String(20), nullable=False) # morning, afternoon, period
    taken_by: Mapped[UUID] = mapped_column(ForeignKey("employees.id"), nullable=False)
    taken_at: Mapped[datetime] = mapped_column(server_default=func.now())

class StudentAttendance(SkolrBase, TimestampMixin):
    __tablename__ = "student_attendance"

    session_id: Mapped[UUID] = mapped_column(ForeignKey("attendance_sessions.id"), nullable=False)
    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(1), nullable=False) # P, A, L, H
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)

class FeeHead(SkolrBase, TimestampMixin):
    __tablename__ = "fee_heads"

    name: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "Tuition Fee"
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

class FeeStructure(SkolrBase, TimestampMixin):
    __tablename__ = "fee_structures"

    name: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "Class 5 Standard"
    academic_year_id: Mapped[UUID] = mapped_column(ForeignKey("academic_years.id"), nullable=False)
    
    academic_year = relationship("AcademicYear")
    items = relationship("FeeStructureItem", back_populates="fee_structure", cascade="all, delete-orphan")

class FeeStructureItem(SkolrBase, TimestampMixin):
    __tablename__ = "fee_structure_items"

    fee_structure_id: Mapped[UUID] = mapped_column(ForeignKey("fee_structures.id"), nullable=False)
    fee_head_id: Mapped[UUID] = mapped_column(ForeignKey("fee_heads.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    frequency: Mapped[str] = mapped_column(String(50), nullable=False) # monthly, quarterly, yearly, one_time

    fee_structure = relationship("FeeStructure", back_populates="items")
    fee_head = relationship("FeeHead")

class StudentFeeAccount(SkolrBase, TimestampMixin):
    __tablename__ = "student_fee_accounts"

    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id"), nullable=False)
    fee_structure_id: Mapped[UUID] = mapped_column(ForeignKey("fee_structures.id"), nullable=False)
    total_applicable: Mapped[float] = mapped_column(Float, default=0.0)
    total_paid: Mapped[float] = mapped_column(Float, default=0.0)
    total_discount: Mapped[float] = mapped_column(Float, default=0.0)

    student = relationship("Student")
    fee_structure = relationship("FeeStructure")

    @property
    def outstanding_balance(self) -> float:
        return max(0.0, self.total_applicable - self.total_paid - self.total_discount)

class FeeDiscount(SkolrBase, TimestampMixin):
    __tablename__ = "fee_discounts"

    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "Sports Scholarship"
    amount: Mapped[float] = mapped_column(Float, nullable=False)

    student = relationship("Student")

class FeeTransaction(SkolrBase, TimestampMixin):
    __tablename__ = "fee_transactions"

    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id"), nullable=False)
    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    amount_paid: Mapped[float] = mapped_column(Float, nullable=False)
    payment_mode: Mapped[str] = mapped_column(String(50), nullable=False) # cash, upi, bank_transfer, card
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    transaction_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)

    student = relationship("Student")


class Subject(SkolrBase, TimestampMixin):
    __tablename__ = "subjects"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)


class Homework(SkolrBase, TimestampMixin):
    __tablename__ = "homework"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    class_id: Mapped[UUID] = mapped_column(ForeignKey("classes.id"), nullable=False)
    subject_id: Mapped[UUID] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("employees.id"), nullable=False)

    class_ = relationship("Class")
    subject = relationship("Subject")
    teacher = relationship("Employee")


class HomeworkSubmission(SkolrBase, TimestampMixin):
    __tablename__ = "homework_submissions"

    homework_id: Mapped[UUID] = mapped_column(ForeignKey("homework.id"), nullable=False)
    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id"), nullable=False)
    submission_date: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="submitted") # submitted, graded
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(10), nullable=True)

    homework = relationship("Homework")
    student = relationship("Student")


class Exam(SkolrBase, TimestampMixin):
    __tablename__ = "exams"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    academic_year_id: Mapped[UUID] = mapped_column(ForeignKey("academic_years.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft") # draft, scheduled, completed

    academic_year = relationship("AcademicYear")


class ExamSchedule(SkolrBase, TimestampMixin):
    __tablename__ = "exam_schedules"

    exam_id: Mapped[UUID] = mapped_column(ForeignKey("exams.id"), nullable=False)
    subject_id: Mapped[UUID] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    class_id: Mapped[UUID] = mapped_column(ForeignKey("classes.id"), nullable=False)
    exam_date: Mapped[date] = mapped_column(Date, nullable=False)
    max_marks: Mapped[float] = mapped_column(Float, default=100.0)
    passing_marks: Mapped[float] = mapped_column(Float, default=35.0)

    exam = relationship("Exam")
    subject = relationship("Subject")
    class_ = relationship("Class")


class ExamMark(SkolrBase, TimestampMixin):
    __tablename__ = "exam_marks"

    exam_schedule_id: Mapped[UUID] = mapped_column(ForeignKey("exam_schedules.id"), nullable=False)
    student_id: Mapped[UUID] = mapped_column(ForeignKey("students.id"), nullable=False)
    marks_obtained: Mapped[float] = mapped_column(Float, nullable=False)
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)

    schedule = relationship("ExamSchedule")
    student = relationship("Student")


class GradeScale(SkolrBase, TimestampMixin):
    __tablename__ = "grade_scales"

    min_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    max_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    grade_name: Mapped[str] = mapped_column(String(5), nullable=False)
    description: Mapped[str | None] = mapped_column(String(100), nullable=True)


class NotificationTemplate(SkolrBase, TimestampMixin):
    __tablename__ = "notification_templates"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    template_name: Mapped[str] = mapped_column(String(100), nullable=False)
    body_format: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="general", server_default="general")


class NotificationLog(SkolrBase, TimestampMixin):
    __tablename__ = "notification_logs"

    sender_id: Mapped[UUID | None] = mapped_column(ForeignKey("public.users.id"), nullable=True)
    recipient_name: Mapped[str] = mapped_column(String(100), nullable=False)
    recipient_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    message_body: Mapped[str] = mapped_column(String(1000), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), default="whatsapp", server_default="whatsapp")
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")
    error_message: Mapped[str | None] = mapped_column(String(255), nullable=True)


class CBSEProfile(SkolrBase, TimestampMixin):
    __tablename__ = "cbse_profiles"

    affiliation_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    school_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    land_area_sq_mtrs: Mapped[float] = mapped_column(Float, default=0.0, server_default="0.0")
    built_up_area_sq_mtrs: Mapped[float] = mapped_column(Float, default=0.0, server_default="0.0")
    playground_area_sq_mtrs: Mapped[float] = mapped_column(Float, default=0.0, server_default="0.0")
    classroom_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    composite_science_lab_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    math_lab_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    computer_lab_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    library_book_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    library_magazine_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    library_newspaper_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")


class CMSSite(SkolrBase, TimestampMixin):
    __tablename__ = "cms_sites"

    template_id: Mapped[str] = mapped_column(String(100), default="template-001-prestige", server_default="template-001-prestige")
    color_scheme: Mapped[str] = mapped_column(String(100), default="Navy & Gold", server_default="Navy & Gold")
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}")


class CMSPage(SkolrBase, TimestampMixin):
    __tablename__ = "cms_pages"

    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    sections: Mapped[list] = mapped_column(JSONB, default=list, server_default="[]")
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    seo_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    seo_description: Mapped[str | None] = mapped_column(String(500), nullable=True)




