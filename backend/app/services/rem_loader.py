import hashlib
from io import BytesIO
import openpyxl
from fastapi import UploadFile, HTTPException, status

def calcular_sha256(contenido: bytes) -> str:
    """Calcula el hash SHA-256 del archivo para asegurar integridad y evitar duplicados."""
    hasher = hashlib.sha256()
    hasher.update(contenido)
    return hasher.hexdigest()

def validar_extension_archivo(filename: str):
    """Verifica que el archivo subido sea un libro de Excel valido."""
    if not (filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de archivo no soportado. Debe subir una planilla Excel (.xlsx o .xls)."
        )

def leer_celda_rem(workbook: openpyxl.Workbook, hoja_nombre: str, coordenada: str) -> float:
    """
    Extrae el valor numerico de una celda segun el mapeo parametrizado.
    Lanza error si la hoja no existe o el valor no es convertible a numero.
    """
    if hoja_nombre not in workbook.sheetnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La hoja requerida '{hoja_nombre}' no existe en el libro Excel cargado."
        )

    hoja = workbook[hoja_nombre]
    valor = hoja[coordenada].value

    if valor is None:
        return 0.0

    try:
        return float(valor)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error en la celda {coordenada} de la hoja '{hoja_nombre}': el contenido ('{valor}') no es numerico."
        )