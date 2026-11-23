from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import MetaSanitaria, ResultadoMensual, RegistroAuditoria

router = APIRouter()

@router.get("/resumen")
def obtener_resumen_dashboard(db: Session = Depends(get_db)):
    """Retorna todas las metas con su último porcentaje de cumplimiento real desde PostgreSQL."""
    metas = db.query(MetaSanitaria).all()
    respuesta = []
    for m in metas:
        ultimo_resultado = (
            db.query(ResultadoMensual)
            .filter(ResultadoMensual.id_meta == m.id_meta)
            .order_by(ResultadoMensual.id_resultado.desc())
            .first()
        )
        actual = float(ultimo_resultado.porcentaje_cumplimiento) if ultimo_resultado else 0.0
        respuesta.append({
            "id_meta": m.id_meta,
            "id_programa": m.id_programa,
            "anio": m.anio,
            "nombre_meta": m.nombre_meta,
            "ponderador": float(m.ponderador),
            "meta_esperada": float(m.meta_esperada),
            "actual": actual
        })
    return respuesta

@router.get("/auditoria")
def listar_auditoria(db: Session = Depends(get_db)):
    """Retorna los registros reales de auditoría almacenados en PostgreSQL."""
    registros = (
        db.query(RegistroAuditoria)
        .order_by(RegistroAuditoria.id_auditoria.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id_auditoria": r.id_auditoria,
            "id_usuario": r.id_usuario,
            "accion": r.accion,
            "tabla_modificada": r.tabla_modificada,
            "id_registro_afectado": r.id_registro_afectado,
            "fecha_hora": r.fecha_hora.isoformat() if r.fecha_hora else ""
        }
        for r in registros
    ]