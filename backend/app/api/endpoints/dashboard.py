from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def dashboard_root():
    return {"modulo": "Dashboard y Analitica"}