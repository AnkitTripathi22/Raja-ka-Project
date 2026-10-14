from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routers.admin import router as admin_router
from src.routers.auth import router as auth_router
from src.routers.employee import router as employee_router

app = FastAPI(title="Backend API")

# The Next.js frontend (port 3000) calls this API from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(employee_router)
app.include_router(admin_router)
