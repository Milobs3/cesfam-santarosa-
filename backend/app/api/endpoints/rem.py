from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from io import BytesIO
import openpyxl
from app.db.session import get_db
from app.api.deps import RequireRoles
from app.models.entities import Usuario, CargaRem, ParametroIndicador, ResultadoMensual, RegistroAuditoria
from app.schemas.rem import CargaRemResponse
from app.services.rem_loader import validar_extension_archivo, calcular_sha256, leer_celda_rem

router = APIRouter()

@router.post("/cargar", response_model=CargaRemResponse, status_code=status.HTTP_201_CREATED)
async def cargar_y_procesar_rem(
    archivo: UploadFile = File(...),
    mes_periodo: int = Form(..., ge=1, le=12),
    anio_periodo: int = Form(...),
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(RequireRoles(["Gestor de Informacion", "Subdireccion"]))
):
    """
    1. Valida el archivo y calcula su hash SHA-256.
    2. Registra la carga y su auditoría.
    3. Lee el Excel en memoria y procesa las celdas parametrizadas.
    4. Guarda los resultados mensuales calculados automáticamente.
    """
    validar_extension_archivo(archivo.filename)

    contenido = await archivo.read()
    if len(contenido) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo excede el límite máximo de 25 MB."
        )

    hash_archivo = calcular_sha256(contenido)

    # Evitar duplicidad de la misma planilla en el periodo
    existe_carga = db.query(CargaRem).filter(
        CargaRem.mes_periodo == mes_periodo,
        CargaRem.anio_periodo == anio_periodo,
        CargaRem.hash_sha256 == hash_archivo
    ).first()

    if existe_carga:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta planilla ya fue cargada anteriormente para este mismo periodo."
        )

    # 1. Registrar la Carga
    nueva_carga = CargaRem(
        id_usuario=usuario_actual.id_usuario,
        nombre_archivo=archivo.filename,
        mes_periodo=mes_periodo,
        anio_periodo=anio_periodo,
        hash_sha256=hash_archivo
    )
    db.add(nueva_carga)
    db.flush()

    # 2. Cargar el libro Excel en memoria para procesamiento automático
    try:
        wb = openpyxl.load_workbook(filename=BytesIO(contenido), data_only=True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo interpretar el archivo como libro Excel válido: {str(e)}"
        )

    # 3. Obtener todos los parámetros configurados en el sistema
    parametros = db.query(ParametroIndicador).all()
    
    # Procesar y agrupar por meta
    for param in parametros:
        # Extraer valor usando la función que creamos en rem_loader.py
        try:
            valor = leer_celda_rem(wb, param.nombre_hoja, param.celda_coordenada)
        except HTTPException:
            # Si una hoja no coincide en el archivo, se continúa o se asigna 0
            valor = 0.0

        meta = param.meta
        # Cálculo de cumplimiento porcentual contra la meta esperada
        if meta.meta_esperada and float(meta.meta_esperada) > 0:
            porcentaje = round((valor / float(meta.meta_esperada)) * 100, 2)
        else:
            porcentaje = 0.0

        # Guardar resultado del indicador
        resultado = ResultadoMensual(
            id_carga=nueva_carga.id_carga,
            id_meta=param.id_meta,
            valor_obtenido=valor,
            porcentaje_cumplimiento=porcentaje
        )
        db.add(resultado)

    # 4. Auditoría obligatoria (RF-12)
    auditoria = RegistroAuditoria(
        id_usuario=usuario_actual.id_usuario,
        accion="CARGA_Y_PROCESAMIENTO_REM",
        tabla_modificada="carga_rem",
        id_registro_afectado=nueva_carga.id_carga,
        valor_nuevo={
            "archivo": archivo.filename,
            "mes": mes_periodo,
            "anio": anio_periodo,
            "hash": hash_archivo,
            "parametros_procesados": len(parametros)
        }
    )
    db.add(auditoria)
    db.commit()
    db.refresh(nueva_carga)

    return nueva_carga