from fastapi import APIRouter
from app.api.endpoints import auth, metas, rem, dashboard

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autenticación"])
api_router.include_router(metas.router, prefix="/metas", tags=["Metas Sanitarias"])
api_router.include_router(rem.router, prefix="/rem", tags=["Carga y Parametrización REM"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboards"])