from datetime import date, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from src.requests.auth import EMAIL_PATTERN


class EmployeeSaveRequest(BaseModel):
    # Only the first name is required: the admin can fill in the rest later
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(default="", max_length=100)
    email: str | None = Field(default=None, max_length=150, pattern=EMAIL_PATTERN)
    mobile: str | None = Field(default=None, pattern=r"^\+?[0-9]{7,14}$")
    department: str = Field(default="", max_length=100)
    designation: str = Field(default="", max_length=100)
    salary: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)
    is_active: bool = True
    # Days before this date are not counted as absences; unchanged when omitted
    joined_on: date | None = None


class AttendanceEntry(BaseModel):
    employee_id: int
    # "unmarked" removes the day's record
    status: Literal["present", "half_day", "absent", "unmarked"]
    check_in: time | None = None
    check_out: time | None = None
    remarks: str | None = Field(default=None, max_length=255)


class AttendanceSaveRequest(BaseModel):
    date: date
    entries: list[AttendanceEntry] = Field(max_length=500)


class LeaveRecordRequest(BaseModel):
    employee_id: int
    leave_type_id: int
    start_date: date
    end_date: date
    reason: str = Field(default="", max_length=500)


class LeaveTypeRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    days_per_year: int = Field(ge=0, le=366)


class PolicyRequest(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    category: str = Field(min_length=1, max_length=50)
    # None = company-wide
    department: str | None = Field(default=None, max_length=100)
    summary: str = Field(min_length=1, max_length=300)
    content: str = Field(min_length=1)
    effective_from: date | None = None
    is_active: bool = True
