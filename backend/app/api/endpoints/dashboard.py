from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.entities import MetaSanitaria, ResultadoMensual, RegistroAuditoria, Usuario

router = APIRouter()

@router.get("/resumen")
def obtener_resumen_dashboard(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Retorna metas con su cumplimiento real. Si es Jefe de Programa, filtra por su programa."""
    query = db.query(MetaSanitaria)
    rol_nombre = current_user.rol.nombre_rol if current_user.rol else ""

    if rol_nombre == "Jefe de Programa" and current_user.id_programa:
        query = query.filter(MetaSanitaria.id_programa == current_user.id_programa)

    metas = query.all()
    respuesta = []
    for m in metas:
        ultimo_resultado = (
            db.query(ResultadoMensual)
            .filter(ResultadoMensual.id_meta == m.id_meta)
            .order_by(ResultadoMensual.id_resultado.desc())
            .first()
        )
        actual = float(ultimo_resultado.porcentaje_cumplimiento) if ultimo_resultado else 0.0
        valor_bruto = float(ultimo_resultado.valor_obtenido) if ultimo_resultado else 0.0
        respuesta.append({
            "id_meta": m.id_meta,
            "id_programa": m.id_programa,
            "nombre_programa": m.programa.nombre_programa if m.programa else f"Programa {m.id_programa}",
            "anio": m.anio,
            "nombre_meta": m.nombre_meta,
            "ponderador": float(m.ponderador),
            "meta_esperada": float(m.meta_esperada),
            "actual": actual,
            "valor_obtenido": valor_bruto
        })
    return respuesta

@router.get("/auditoria")
def listar_auditoria(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Retorna los registros reales de auditoría con nombre, correo y detalle del responsable."""
    registros = (
        db.query(RegistroAuditoria)
        .order_by(RegistroAuditoria.id_auditoria.desc())
        .limit(60)
        .all()
    )
    resultado = []
    for r in registros:
        responsable = r.usuario.nombre if r.usuario else "Sistema"
        email_resp = r.usuario.email if r.usuario else "-"
        detalle_obj = r.valor_nuevo or r.valor_anterior or {}
        detalle_texto = ", ".join(f"{k}: {v}" for k, v in detalle_obj.items()) if isinstance(detalle_obj, dict) else str(detalle_obj)

        resultado.append({
            "id_auditoria": r.id_auditoria,
            "responsable_nombre": responsable,
            "responsable_email": email_resp,
            "accion": r.accion,
            "tabla_modificada": r.tabla_modificada,
            "id_registro_afectado": r.id_registro_afectado,
            "detalle": detalle_texto,
            "fecha_hora": r.fecha_hora.strftime("%Y-%m-%d %H:%M:%S") if r.fecha_hora else ""
        })
    return resultado