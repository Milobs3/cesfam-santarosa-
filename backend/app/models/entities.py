from sqlalchemy import (
    Column, Integer, BigInteger, SmallInteger, String, Text, 
    Boolean, Numeric, DateTime, ForeignKey, func, CheckConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base

# 1. Tabla ROL
class Rol(Base):
    __tablename__ = "rol"

    id_rol = Column(Integer, primary_key=True, autoincrement=True)
    nombre_rol = Column(String(50), unique=True, nullable=False)
    descripcion = Column(String(255), nullable=True)

    usuarios = relationship("Usuario", back_populates="rol")


# 2. Tabla PROGRAMA DE SALUD
class ProgramaSalud(Base):
    __tablename__ = "programa_salud"

    id_programa = Column(Integer, primary_key=True, autoincrement=True)
    nombre_programa = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)

    usuarios = relationship("Usuario", back_populates="programa")
    metas = relationship("MetaSanitaria", back_populates="programa")


# 3. Tabla USUARIO
class Usuario(Base):
    __tablename__ = "usuario"

    id_usuario = Column(Integer, primary_key=True, autoincrement=True)
    rut = Column(String(12), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    activo = Column(Boolean, default=True)
    id_rol = Column(Integer, ForeignKey("rol.id_rol"), nullable=False)
    id_programa = Column(Integer, ForeignKey("programa_salud.id_programa"), nullable=True)
    creado_en = Column(DateTime, server_default=func.current_timestamp())

    rol = relationship("Rol", back_populates="usuarios")
    programa = relationship("ProgramaSalud", back_populates="usuarios")
    cargas = relationship("CargaRem", back_populates="usuario")
    auditorias = relationship("RegistroAuditoria", back_populates="usuario")


# 4. Tabla META SANITARIA
class MetaSanitaria(Base):
    __tablename__ = "meta_sanitaria"

    id_meta = Column(Integer, primary_key=True, autoincrement=True)
    id_programa = Column(Integer, ForeignKey("programa_salud.id_programa"), nullable=False)
    anio = Column(Integer, nullable=False)
    nombre_meta = Column(String(200), nullable=False)
    ponderador = Column(Numeric(5, 2), nullable=False)
    meta_esperada = Column(Numeric(5, 2), nullable=False)
    creado_en = Column(DateTime, server_default=func.current_timestamp())

    programa = relationship("ProgramaSalud", back_populates="metas")
    parametros = relationship("ParametroIndicador", back_populates="meta")
    resultados = relationship("ResultadoMensual", back_populates="meta")


# 5. Tabla PARAMETRO INDICADOR (Mapeo dinámico de celdas)
class ParametroIndicador(Base):
    __tablename__ = "parametro_indicador"

    id_parametro = Column(Integer, primary_key=True, autoincrement=True)
    id_meta = Column(Integer, ForeignKey("meta_sanitaria.id_meta"), nullable=False)
    codigo_indicador = Column(String(50), nullable=False)
    descripcion = Column(String(255), nullable=True)
    rem_codigo = Column(String(20), nullable=False)
    nombre_hoja = Column(String(100), nullable=False)
    celda_coordenada = Column(String(10), nullable=False)
    tipo_dato = Column(String(20), default="NUMERIC")

    meta = relationship("MetaSanitaria", back_populates="parametros")


# 6. Tabla CARGA REM
class CargaRem(Base):
    __tablename__ = "carga_rem"

    id_carga = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    nombre_archivo = Column(String(255), nullable=False)
    mes_periodo = Column(SmallInteger, nullable=False)
    anio_periodo = Column(Integer, nullable=False)
    fecha_carga = Column(DateTime, server_default=func.current_timestamp())
    hash_sha256 = Column(String(64), nullable=False)

    __table_args__ = (
        CheckConstraint("mes_periodo >= 1 AND mes_periodo <= 12", name="chk_mes_periodo"),
    )

    usuario = relationship("Usuario", back_populates="cargas")
    resultados = relationship("ResultadoMensual", back_populates="carga")


# 7. Tabla RESULTADO MENSUAL
class ResultadoMensual(Base):
    __tablename__ = "resultado_mensual"

    id_resultado = Column(Integer, primary_key=True, autoincrement=True)
    id_carga = Column(Integer, ForeignKey("carga_rem.id_carga"), nullable=False)
    id_meta = Column(Integer, ForeignKey("meta_sanitaria.id_meta"), nullable=False)
    valor_obtenido = Column(Numeric(12, 2), nullable=False)
    porcentaje_cumplimiento = Column(Numeric(5, 2), nullable=False)
    calculado_en = Column(DateTime, server_default=func.current_timestamp())

    carga = relationship("CargaRem", back_populates="resultados")
    meta = relationship("MetaSanitaria", back_populates="resultados")


# 8. Tabla REGISTRO AUDITORIA (Inmutable, soporte JSONB)
class RegistroAuditoria(Base):
    __tablename__ = "registro_auditoria"

    id_auditoria = Column(BigInteger, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=True)
    accion = Column(String(50), nullable=False)
    tabla_modificada = Column(String(50), nullable=False)
    id_registro_afectado = Column(Integer, nullable=True)
    valor_anterior = Column(JSONB, nullable=True)
    valor_nuevo = Column(JSONB, nullable=True)
    ip_origen = Column(String(45), nullable=True)
    fecha_hora = Column(DateTime, server_default=func.current_timestamp())

    usuario = relationship("Usuario", back_populates="auditorias")