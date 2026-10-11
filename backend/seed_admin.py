from app.db.session import SessionLocal
from app.models.entities import Usuario, Rol
from app.core.security import get_password_hash

def seed_admin():
    db = SessionLocal()
    try:
        # Busca el rol de Gestor de Información cargado en init_db
        rol_admin = db.query(Rol).filter_by(nombre_rol="Gestor de Informacion").first()
        if not rol_admin:
            print("Error: El rol 'Gestor de Informacion' no existe. Ejecuta init_db.py primero.")
            return

        email_admin = "admin@cesfam.cl"
        existe = db.query(Usuario).filter_by(email=email_admin).first()

        if not existe:
            admin = Usuario(
                rut="11111111-1",
                nombre="Administrador Gestor",
                email=email_admin,
                password_hash=get_password_hash("admin1234"),
                id_rol=rol_admin.id_rol,
                activo=True
            )
            db.add(admin)
            db.commit()
            print("Usuario administrador creado exitosamente:")
            print(f"  Email: {email_admin}")
            print("  Contraseña: admin1234")
        else:
            print("El usuario administrador ya existe.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()