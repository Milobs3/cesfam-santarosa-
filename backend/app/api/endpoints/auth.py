from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Usuario, Rol
from app.schemas.auth import Token, UsuarioCreate, UsuarioResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.api.deps import get_current_user, RequireRoles

router = APIRouter()

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Inicio de sesión estándar compatible con Swagger (username = email)."""
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()

    if not usuario or not verify_password(form_data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario se encuentra inactivo."
        )

    # Obtenemos el nombre del rol institucional asociado
    rol = db.query(Rol).filter(Rol.id_rol == usuario.id_rol).first()
    nombre_rol = rol.nombre_rol if rol else None

    # Guardamos id y rol en los datos del token
    token_data = {
        "sub": str(usuario.id_usuario),
        "rol": nombre_rol,
        "id_programa": usuario.id_programa
    }

    access_token = create_access_token(data=token_data)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/usuarios", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    usuario_in: UsuarioCreate,
    db: Session = Depends(get_db),
    # Solo el Gestor de Información puede crear usuarios según la matriz RBAC
    current_admin: Usuario = Depends(RequireRoles(["Gestor de Informacion"]))
):
    """Creación de usuarios con contraseña hasheada (Solo Administrador)."""
    if db.query(Usuario).filter(Usuario.email == usuario_in.email).first():
        raise HTTPException(status_code=400, detail="El correo ya se encuentra registrado.")

    if db.query(Usuario).filter(Usuario.rut == usuario_in.rut).first():
        raise HTTPException(status_code=400, detail="El RUT ya se encuentra registrado.")

    rol = db.query(Rol).filter(Rol.id_rol == usuario_in.id_rol).first()
    if not rol:
        raise HTTPException(status_code=404, detail="El rol especificado no existe.")

    nuevo_usuario = Usuario(
        rut=usuario_in.rut,
        nombre=usuario_in.nombre,
        email=usuario_in.email,
        password_hash=get_password_hash(usuario_in.password),
        id_rol=usuario_in.id_rol,
        id_programa=usuario_in.id_programa,
        activo=True
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


@router.get("/me", response_model=UsuarioResponse)
def leer_perfil(current_user: Usuario = Depends(get_current_user)):
    """Retorna los datos del usuario conectado actualmente."""
    return current_user