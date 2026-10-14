from datetime import date

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies import get_current_employee
from src.requests.employee import LeaveApplyRequest, ProfileUpdateRequest
from src.services import attendance_service, employee_service, leave_service

# Every route works on the signed-in employee only; there is no employee id in the URL
router = APIRouter(prefix="/api/employee", tags=["Employee"])


@router.get("/dashboard")
def dashboard(employee: dict = Depends(get_current_employee), db: Session = Depends(get_db)):
    return employee_service.dashboard(db, employee)


@router.get("/profile")
def profile(employee: dict = Depends(get_current_employee)):
    return employee_service.profile(employee)


@router.put("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    employee: dict = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    return employee_service.update_profile(db, employee, payload)


@router.get("/team")
def team(employee: dict = Depends(get_current_employee), db: Session = Depends(get_db)):
    return employee_service.team(db, employee)


@router.get("/policies")
def policies(employee: dict = Depends(get_current_employee), db: Session = Depends(get_db)):
    return employee_service.policies(db, employee)


@router.get("/attendance")
def attendance(
    month: str | None = Query(default=None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="YYYY-MM"),
    employee: dict = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    return attendance_service.month_view(db, employee, month)


@router.post("/attendance/check-in", status_code=status.HTTP_201_CREATED)
def check_in(employee: dict = Depends(get_current_employee), db: Session = Depends(get_db)):
    return attendance_service.check_in(db, employee)


@router.post("/attendance/check-out")
def check_out(employee: dict = Depends(get_current_employee), db: Session = Depends(get_db)):
    return attendance_service.check_out(db, employee)


# from/to: "YYYY-MM-DD"; the current month up to today when omitted
@router.get("/attendance/report")
def attendance_report(
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    employee: dict = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    return attendance_service.report(db, employee, start, end)


@router.get("/attendance/report/csv")
def attendance_report_csv(
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    employee: dict = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    return Response(
        content=attendance_service.report_csv(db, employee, start, end),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="attendance-report.csv"'},
    )


@router.get("/leaves")
def leaves(employee: dict = Depends(get_current_employee), db: Session = Depends(get_db)):
    return leave_service.overview(db, employee)


@router.post("/leaves", status_code=status.HTTP_201_CREATED)
def apply_leave(
    payload: LeaveApplyRequest,
    employee: dict = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    return leave_service.apply(db, employee, payload)


@router.post("/leaves/{request_id}/cancel")
def cancel_leave(
    request_id: int,
    employee: dict = Depends(get_current_employee),
    db: Session = Depends(get_db),
):
    return leave_service.cancel(db, employee, request_id)
