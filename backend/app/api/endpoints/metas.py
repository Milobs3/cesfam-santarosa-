from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.entities import MetaSanitaria, ParametroIndicador, RegistroAuditoria, Usuario
from app.schemas.metas import (
    MetaSanitariaCreate, MetaSanitariaResponse,
    ParametroIndicadorCreate, ParametroIndicadorResponse
)
from app.api.deps import RequireRoles

router = APIRouter()

# 1. Crear una Meta Sanitaria (Solo Gestor o Subdirección)
@router.post("/", response_model=MetaSanitariaResponse, status_code=status.HTTP_201_CREATED)
def crear_meta(
    meta_in: MetaSanitariaCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(RequireRoles(["Gestor de Informacion", "Subdireccion"]))
):
    nueva_meta = MetaSanitaria(
        id_programa=meta_in.id_programa,
        anio=meta_in.anio,
        nombre_meta=meta_in.nombre_meta,
        ponderador=meta_in.ponderador,
        meta_esperada=meta_in.meta_esperada
    )
    db.add(nueva_meta)
    db.commit()
    db.refresh(nueva_meta)
    return nueva_meta

# 2. Listar Metas Sanitarias (Disponible para consulta)
@router.get("/", response_model=List[MetaSanitariaResponse])
def listar_metas(db: Session = Depends(get_db)):
    return db.query(MetaSanitaria).all()

# 3. Parametrizar Celda REM para un Indicador (HU-01, RF-03)
@router.post("/parametros", response_model=ParametroIndicadorResponse, status_code=status.HTTP_201_CREATED)
def configurar_parametro_rem(
    param_in: ParametroIndicadorCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(RequireRoles(["Gestor de Informacion", "Subdireccion"]))
):
    # Validar que exista la meta a la que se asocia
    meta = db.query(MetaSanitaria).filter(MetaSanitaria.id_meta == param_in.id_meta).first()
    if not meta:
        raise HTTPException(status_code=404, detail="La meta sanitaria especificada no existe.")

    nuevo_parametro = ParametroIndicador(
        id_meta=param_in.id_meta,
        codigo_indicador=param_in.codigo_indicador,
        descripcion=param_in.descripcion,
        rem_codigo=param_in.rem_codigo,
        nombre_hoja=param_in.nombre_hoja,
        celda_coordenada=param_in.celda_coordenada.upper(),
        tipo_dato=param_in.tipo_dato
    )
    db.add(nuevo_parametro)
    db.flush()

    # Auditoría de cambio en la parametrización
    auditoria = RegistroAuditoria(
        id_usuario=admin.id_usuario,
        accion="CONFIGURACION_PARAMETRO_REM",
        tabla_modificada="parametro_indicador",
        id_registro_afectado=nuevo_parametro.id_parametro,
        valor_nuevo={
            "meta": meta.nombre_meta,
            "hoja": param_in.nombre_hoja,
            "celda": param_in.celda_coordenada.upper(),
            "rem": param_in.rem_codigo
        }
    )
    db.add(auditoria)
    db.commit()
    db.refresh(nuevo_parametro)
    return nuevo_parametro

# 4. Listar Parámetros configurados
@router.get("/parametros", response_model=List[ParametroIndicadorResponse])
def listar_parametros(db: Session = Depends(get_db)):
    return db.query(ParametroIndicador).all()