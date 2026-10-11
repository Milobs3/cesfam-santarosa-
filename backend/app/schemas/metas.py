from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- Esquemas para Parametrización Dinámica de Celdas (HU-01) ---
class ParametroIndicadorCreate(BaseModel):
    id_meta: int
    codigo_indicador: str = Field(..., example="IND-01-NUM")
    descripcion: Optional[str] = Field(None, example="Numerador niños con control al día")
    rem_codigo: str = Field(..., example="REM-A01")
    nombre_hoja: str = Field(..., example="Seccion_A")
    celda_coordenada: str = Field(..., example="D24")
    tipo_dato: Optional[str] = "NUMERIC"

class ParametroIndicadorResponse(ParametroIndicadorCreate):
    id_parametro: int

    class Config:
        from_attributes = True

# --- Esquemas para Metas Sanitarias ---
class MetaSanitariaCreate(BaseModel):
    id_programa: int
    anio: int = Field(..., example=2026)
    nombre_meta: str = Field(..., example="Cobertura de Control de Salud Infantil")
    ponderador: float = Field(..., ge=0, le=100, example=25.0)
    meta_esperada: float = Field(..., ge=0, le=100, example=90.0)

class MetaSanitariaResponse(MetaSanitariaCreate):
    id_meta: int
    creado_en: datetime
    parametros: List[ParametroIndicadorResponse] = []

    class Config:
        from_attributes = True

# --- Esquema de Resultado Mensual Calculado ---
class ResultadoMensualResponse(BaseModel):
    id_resultado: int
    id_carga: int
    id_meta: int
    valor_obtenido: float
    porcentaje_cumplimiento: float
    calculado_en: datetime

    class Config:
        from_attributes = True