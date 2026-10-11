from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Estructura del token que recibe el cliente al iniciar sesión
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Estructura interna de los datos contenidos dentro del token JWT
class TokenPayload(BaseModel):
    sub: Optional[int] = None
    rol: Optional[str] = None
    id_programa: Optional[int] = None

# Datos requeridos para dar de alta a un usuario
class UsuarioCreate(BaseModel):
    rut: str
    nombre: str
    email: EmailStr
    password: str
    id_rol: int
    id_programa: Optional[int] = None

# Datos que la API devuelve al consultar un usuario (sin contraseña)
class UsuarioResponse(BaseModel):
    id_usuario: int
    rut: str
    nombre: str
    email: EmailStr
    activo: bool
    id_rol: int
    id_programa: Optional[int] = None
    creado_en: datetime

    class Config:
        from_attributes = True