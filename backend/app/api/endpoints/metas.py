from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.entities import MetaSanitaria, ParametroIndicador, ResultadoMensual, RegistroAuditoria, Usuario
from app.schemas.metas import (
    MetaSanitariaCreate, MetaSanitariaResponse,
    ParametroIndicadorCreate, ParametroIndicadorResponse
)
from app.api.deps import RequireRoles, get_current_user

router = APIRouter()

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
    db.flush()

    db.add(RegistroAuditoria(
        id_usuario=admin.id_usuario,
        accion="CREACION_META_SANITARIA",
        tabla_modificada="meta_sanitaria",
        id_registro_afectado=nueva_meta.id_meta,
        valor_nuevo={"nombre_meta": nueva_meta.nombre_meta, "anio": nueva_meta.anio, "meta_esperada": float(nueva_meta.meta_esperada)}
    ))
    db.commit()
    db.refresh(nueva_meta)
    return nueva_meta

@router.get("/", response_model=List[MetaSanitariaResponse])
def listar_metas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    return db.query(MetaSanitaria).all()

@router.delete("/{id_meta}")
def eliminar_meta(
    id_meta: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(RequireRoles(["Gestor de Informacion", "Subdireccion"]))
):
    meta = db.query(MetaSanitaria).filter(MetaSanitaria.id_meta == id_meta).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Meta sanitaria no encontrada.")

    datos_eliminados = {
        "nombre_meta": meta.nombre_meta,
        "anio": meta.anio,
        "meta_esperada": float(meta.meta_esperada)
    }

    # Eliminar dependencias (resultados y parámetros asociados) para integridad referencial
    db.query(ResultadoMensual).filter(ResultadoMensual.id_meta == id_meta).delete()
    db.query(ParametroIndicador).filter(ParametroIndicador.id_meta == id_meta).delete()
    db.delete(meta)

    db.add(RegistroAuditoria(
        id_usuario=admin.id_usuario,
        accion="ELIMINACION_META_SANITARIA",
        tabla_modificada="meta_sanitaria",
        id_registro_afectado=id_meta,
        valor_anterior=datos_eliminados
    ))
    db.commit()
    return {"mensaje": "Meta sanitaria eliminada y auditada correctamente."}

@router.post("/parametros", response_model=ParametroIndicadorResponse, status_code=status.HTTP_201_CREATED)
def configurar_parametro_rem(
    param_in: ParametroIndicadorCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(RequireRoles(["Gestor de Informacion", "Subdireccion"]))
):
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

    db.add(RegistroAuditoria(
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
    ))
    db.commit()
    db.refresh(nuevo_parametro)
    return nuevo_parametro

@router.get("/parametros", response_model=List[ParametroIndicadorResponse])
def listar_parametros(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    return db.query(ParametroIndicador).all()

@router.delete("/parametros/{id_parametro}")
def eliminar_parametro(
    id_parametro: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(RequireRoles(["Gestor de Informacion", "Subdireccion"]))
):
    param = db.query(ParametroIndicador).filter(ParametroIndicador.id_parametro == id_parametro).first()
    if not param:
        raise HTTPException(status_code=404, detail="Parámetro no encontrado.")

    datos_eliminados = {
        "codigo_indicador": param.codigo_indicador,
        "rem_codigo": param.rem_codigo,
        "hoja": param.nombre_hoja,
        "celda": param.celda_coordenada
    }
    db.delete(param)

    db.add(RegistroAuditoria(
        id_usuario=admin.id_usuario,
        accion="ELIMINACION_PARAMETRO_REM",
        tabla_modificada="parametro_indicador",
        id_registro_afectado=id_parametro,
        valor_anterior=datos_eliminados
    ))
    db.commit()
    return {"mensaje": "Parámetro eliminado y registrado en auditoría."}