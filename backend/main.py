from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router

app = FastAPI(
    title="CESFAM Santa Rosa - Sistema Metas Sanitarias",
    description="API REST modular y parametrizable para gestion de metas REM",
    version="1.0.0"
)

# Politica CORS para conectar con el frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conectar rutas principales
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def health_check():
    return {
        "status": "online",
        "sistema": "CESFAM Santa Rosa",
        "documentacion": "/docs"
    }