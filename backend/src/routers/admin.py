from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import get_current_admin
from src.requests.admin import (
    AttendanceSaveRequest,
    EmployeeSaveRequest,
    LeaveRecordRequest,
    LeaveTypeRequest,
    PolicyRequest,
)
from src.services import admin_service

# Every route needs an admin; unlike /api/employee, these work on any employee
router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(get_current_admin)])


def _csv(content: str, filename: str) -> Response:
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/employees")
def employees(db: Session = Depends(get_db)):
    return admin_service.employees(db)


@router.post("/employees", status_code=status.HTTP_201_CREATED)
def create_employee(payload: EmployeeSaveRequest, db: Session = Depends(get_db)):
    return admin_service.create_employee(db, payload)


@router.put("/employees/{employee_id}")
def update_employee(employee_id: int, payload: EmployeeSaveRequest, db: Session = Depends(get_db)):
    return admin_service.update_employee(db, employee_id, payload)


# date: "YYYY-MM-DD"; today when omitted
@router.get("/attendance")
def attendance_sheet(day: date | None = Query(default=None, alias="date"), db: Session = Depends(get_db)):
    return admin_service.attendance_sheet(db, day)


@router.put("/attendance")
def save_attendance(payload: AttendanceSaveRequest, db: Session = Depends(get_db)):
    return admin_service.save_attendance(db, payload)


@router.get("/leaves")
def leaves(db: Session = Depends(get_db)):
    return admin_service.leave_overview(db)


@router.post("/leaves", status_code=status.HTTP_201_CREATED)
def record_leave(payload: LeaveRecordRequest, db: Session = Depends(get_db)):
    return admin_service.record_leave(db, payload)


@router.post("/leaves/{request_id}/{action}")
def decide_leave(request_id: int, action: Literal["approve", "reject", "cancel"], db: Session = Depends(get_db)):
    return admin_service.decide_leave(db, request_id, action)


@router.post("/leave-types", status_code=status.HTTP_201_CREATED)
def create_leave_type(payload: LeaveTypeRequest, db: Session = Depends(get_db)):
    return admin_service.create_leave_type(db, payload)


@router.put("/leave-types/{leave_type_id}")
def update_leave_type(leave_type_id: int, payload: LeaveTypeRequest, db: Session = Depends(get_db)):
    return admin_service.update_leave_type(db, leave_type_id, payload)


@router.delete("/leave-types/{leave_type_id}")
def delete_leave_type(leave_type_id: int, db: Session = Depends(get_db)):
    return admin_service.delete_leave_type(db, leave_type_id)


@router.get("/policies")
def policies(db: Session = Depends(get_db)):
    return admin_service.policies(db)


@router.post("/policies", status_code=status.HTTP_201_CREATED)
def create_policy(payload: PolicyRequest, db: Session = Depends(get_db)):
    return admin_service.create_policy(db, payload)


@router.put("/policies/{policy_id}")
def update_policy(policy_id: int, payload: PolicyRequest, db: Session = Depends(get_db)):
    return admin_service.update_policy(db, policy_id, payload)


@router.delete("/policies/{policy_id}")
def delete_policy(policy_id: int, db: Session = Depends(get_db)):
    return admin_service.delete_policy(db, policy_id)


# from/to: "YYYY-MM-DD"; the current month up to today when omitted
@router.get("/reports/summary")
def summary_report(
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
):
    return admin_service.summary_report(db, start, end)


@router.get("/reports/summary/csv")
def summary_report_csv(
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
):
    return _csv(admin_service.summary_report_csv(db, start, end), "attendance-summary.csv")


@router.get("/reports/employee/{employee_id}")
def employee_report(
    employee_id: int,
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
):
    return admin_service.employee_report(db, employee_id, start, end)


@router.get("/reports/employee/{employee_id}/csv")
def employee_report_csv(
    employee_id: int,
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
):
    return _csv(admin_service.employee_report_csv(db, employee_id, start, end), "attendance-report.csv")
