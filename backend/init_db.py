from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.models.entities import Rol, ProgramaSalud

def init_database():
    print("Creando tablas en PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("Tablas creadas con exito.")

    db = SessionLocal()
    try:
        # Sembrar roles base del CESFAM si no existen
        roles_iniciales = [
            ("Directora", "Visualizacion global y reportes ejecutivos"),
            ("Subdireccion", "Supervision, carga de planillas y parametrizacion"),
            ("Gestor de Informacion", "Administracion global, usuarios y reglas REM"),
            ("Jefe de Programa", "Acceso exclusivo a indicadores de su especialidad")
        ]

        for nombre, desc in roles_iniciales:
            existe = db.query(Rol).filter_by(nombre_rol=nombre).first()
            if not existe:
                db.add(Rol(nombre_rol=nombre, descripcion=desc))

        # Sembrar programas de salud frecuentes
        programas_base = [
            ("Programa Infantil", "Control nino sano y cobertura pediatrica"),
            ("Programa Cardiovascular", "Seguimiento PSCV y compensacion diabetes/hipertension"),
            ("Programa Mujer", "Salud sexual y reproductiva"),
            ("Programa Respiratorio", "Manejo IRA y ERA")
        ]

        for nombre, desc in programas_base:
            existe = db.query(ProgramaSalud).filter_by(nombre_programa=nombre).first()
            if not existe:
                db.add(ProgramaSalud(nombre_programa=nombre, descripcion=desc))

        db.commit()
        print("Roles y programas base inicializados.")
    except Exception as e:
        db.rollback()
        print(f"Error al poblar datos iniciales: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_database()