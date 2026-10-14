from decimal import Decimal

from pydantic import BaseModel, Field

# employee.email is varchar(150), which is the upper bound for email length
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class LoginRequest(BaseModel):
    email: str = Field(max_length=150, pattern=EMAIL_PATTERN)
    password: str = Field(min_length=6, max_length=64)


class RegisterRequest(BaseModel):
    email: str = Field(max_length=150, pattern=EMAIL_PATTERN)
    password: str = Field(min_length=6, max_length=64)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    mobile: str = Field(pattern=r"^\+?[0-9]{7,14}$")
    department: str = Field(min_length=1, max_length=100)
    designation: str = Field(min_length=1, max_length=100)
    salary: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    # Optional: the right code registers an admin, no code registers an employee
    admin_code: str = Field(default="", max_length=64)
