import time
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Usuario, Rol, ProgramaSalud, RegistroAuditoria
from app.schemas.auth import Token, UsuarioCreate, UsuarioResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.api.deps import get_current_user, RequireRoles

router = APIRouter()

# Control en memoria contra fuerza bruta (máx 5 intentos fallidos -> bloqueo 60s)
_INTENTOS_LOGIN: dict[str, dict] = {}
MAX_INTENTOS = 5
BLOQUEO_SEGUNDOS = 60

@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Inicio de sesión con protección contra fuerza bruta y auditoría."""
    email_key = form_data.username.lower().strip()
    ahora = time.time()
    registro_intento = _INTENTOS_LOGIN.get(email_key, {"count": 0, "blocked_until": 0.0})

    if registro_intento["blocked_until"] > ahora:
        restante = int(registro_intento["blocked_until"] - ahora)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Cuenta bloqueada temporalmente por seguridad. Intenta en {restante}s."
        )

    usuario = db.query(Usuario).filter(Usuario.email == email_key).first()

    if not usuario or not verify_password(form_data.password, usuario.password_hash):
        registro_intento["count"] += 1
        if registro_intento["count"] >= MAX_INTENTOS:
            registro_intento["blocked_until"] = ahora + BLOQUEO_SEGUNDOS
            registro_intento["count"] = 0
        _INTENTOS_LOGIN[email_key] = registro_intento
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario se encuentra desactivado. Contacte al Gestor de Información."
        )

    # Limpiar contador de fallos al entrar con éxito
    _INTENTOS_LOGIN.pop(email_key, None)

    rol = db.query(Rol).filter(Rol.id_rol == usuario.id_rol).first()
    nombre_rol = rol.nombre_rol if rol else None

    # Registrar acceso en auditoría
    ip_cliente = request.client.host if request.client else "127.0.0.1"
    db.add(RegistroAuditoria(
        id_usuario=usuario.id_usuario,
        accion="INICIO_SESION",
        tabla_modificada="usuario",
        id_registro_afectado=usuario.id_usuario,
        valor_nuevo={"email": usuario.email, "rol": nombre_rol},
        ip_origen=ip_cliente
    ))
    db.commit()

    token_data = {
        "sub": str(usuario.id_usuario),
        "rol": nombre_rol,
        "id_programa": usuario.id_programa
    }

    access_token = create_access_token(data=token_data)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/roles")
def listar_roles_y_programas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Retorna roles y programas disponibles para formularios."""
    roles = db.query(Rol).all()
    programas = db.query(ProgramaSalud).all()
    return {
        "roles": [{"id_rol": r.id_rol, "nombre_rol": r.nombre_rol, "descripcion": r.descripcion} for r in roles],
        "programas": [{"id_programa": p.id_programa, "nombre_programa": p.nombre_programa} for p in programas]
    }


@router.get("/usuarios")
def listar_usuarios(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(RequireRoles(["Gestor de Informacion"]))
):
    """Lista todos los usuarios del sistema (Solo Gestor de Información)."""
    usuarios = db.query(Usuario).order_by(Usuario.id_usuario.asc()).all()
    return [
        {
            "id_usuario": u.id_usuario,
            "rut": u.rut,
            "nombre": u.nombre,
            "email": u.email,
            "activo": u.activo,
            "id_rol": u.id_rol,
            "nombre_rol": u.rol.nombre_rol if u.rol else "Sin rol",
            "id_programa": u.id_programa,
            "nombre_programa": u.programa.nombre_programa if u.programa else "Transversal"
        }
        for u in usuarios
    ]


@router.post("/usuarios", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    usuario_in: UsuarioCreate,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(RequireRoles(["Gestor de Informacion"]))
):
    """Creación de usuarios con contraseña hasheada y registro en auditoría."""
    if len(usuario_in.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres.")

    if db.query(Usuario).filter(Usuario.email == usuario_in.email).first():
        raise HTTPException(status_code=400, detail="El correo ya se encuentra registrado.")

    if db.query(Usuario).filter(Usuario.rut == usuario_in.rut).first():
        raise HTTPException(status_code=400, detail="El RUT ya se encuentra registrado.")

    rol = db.query(Rol).filter(Rol.id_rol == usuario_in.id_rol).first()
    if not rol:
        raise HTTPException(status_code=404, detail="El rol especificado no existe.")

    nuevo_usuario = Usuario(
        rut=usuario_in.rut.strip(),
        nombre=usuario_in.nombre.strip(),
        email=usuario_in.email.lower().strip(),
        password_hash=get_password_hash(usuario_in.password),
        id_rol=usuario_in.id_rol,
        id_programa=usuario_in.id_programa if usuario_in.id_programa else None,
        activo=True
    )
    db.add(nuevo_usuario)
    db.flush()

    db.add(RegistroAuditoria(
        id_usuario=current_admin.id_usuario,
        accion="CREACION_USUARIO",
        tabla_modificada="usuario",
        id_registro_afectado=nuevo_usuario.id_usuario,
        valor_nuevo={"nombre": nuevo_usuario.nombre, "email": nuevo_usuario.email, "rol": rol.nombre_rol}
    ))
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


@router.patch("/usuarios/{id_usuario}/estado")
def cambiar_estado_usuario(
    id_usuario: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(RequireRoles(["Gestor de Informacion"]))
):
    """Activa o desactiva un usuario (impide que el administrador se desactive a sí mismo)."""
    if id_usuario == current_admin.id_usuario:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta de administrador.")

    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    estado_anterior = usuario.activo
    usuario.activo = not usuario.activo

    db.add(RegistroAuditoria(
        id_usuario=current_admin.id_usuario,
        accion="CAMBIO_ESTADO_USUARIO",
        tabla_modificada="usuario",
        id_registro_afectado=usuario.id_usuario,
        valor_anterior={"activo": estado_anterior},
        valor_nuevo={"activo": usuario.activo, "email": usuario.email}
    ))
    db.commit()
    return {"id_usuario": usuario.id_usuario, "activo": usuario.activo}


@router.get("/me", response_model=UsuarioResponse)
def leer_perfil(current_user: Usuario = Depends(get_current_user)):
    return current_user