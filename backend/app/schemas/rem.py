from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class CargaRemResponse(BaseModel):
    id_carga: int
    nombre_archivo: str
    mes_periodo: int = Field(..., ge=1, le=12)
    anio_periodo: int
    fecha_carga: datetime
    hash_sha256: str
    id_usuario: int

    class Config:
        from_attributes = True