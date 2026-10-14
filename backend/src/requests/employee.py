from datetime import date

from pydantic import BaseModel, Field


class ProfileUpdateRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    mobile: str = Field(pattern=r"^\+?[0-9]{7,14}$")


class LeaveApplyRequest(BaseModel):
    leave_type_id: int
    start_date: date
    end_date: date
    reason: str = Field(min_length=3, max_length=500)
