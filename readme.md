# Sistema de Gestión de Metas Sanitarias y Procesamiento REM
### CESFAM Santa Rosa

Plataforma web integral para la automatización, cálculo de cumplimiento y proyección de metas sanitarias a partir de la ingesta de planillas estadísticas mensuales (REM - Resumen Estadístico Mensual). El sistema desacopla la estructura física de los libros Excel del código fuente mediante un catálogo dinámico de parámetros de celda y aplica un modelo estricto de control de acceso basado en roles (RBAC).

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Backend** | Python 3.12+ / FastAPI | API REST modular, asíncrona y de alto rendimiento |
| **Base de Datos** | PostgreSQL 16+ | Persistencia relacional, integridad referencial y auditoría JSONB |
| **ORM** | SQLAlchemy 2.0 | Mapeo objeto-relacional y sesiones de base de datos |
| **Driver BD** | Psycopg 3 (`psycopg[binary]`) | Adaptador nativo de PostgreSQL para Python |
| **Seguridad** | JWT (`python-jose`) + `bcrypt` | Hashing de contraseñas y tokens de sesión firmados |
| **Procesamiento** | `openpyxl`, `pandas`, `hashlib` | Lectura de libros Excel en memoria y control SHA-256 |
| **Servidor ASGI** | Uvicorn | Servidor de aplicaciones web para ASGI |
| **Frontend** *(Fase 2)* | React (Vite) + Tailwind CSS | Interfaz reactiva para dashboards y carga de archivos |

---

## 🏛️ Arquitectura y Capacidades Implementadas

### 1. Control de Acceso Basado en Roles (RBAC)
El sistema segmenta las operaciones mediante validación de tokens JWT en dependencias de FastAPI:
- **Directora:** Acceso transversal de solo lectura a métricas consolidadas y reportes directivos.
- **Subdirección:** Monitoreo transversal y autorización para ingesta de planillas REM.
- **Gestor de Información:** Administración de cuentas institucionales, configuración de catálogo dinámico de celdas REM y subida de planillas.
- **Jefe de Programa:** Acceso exclusivo a los indicadores y metas asociados a su programa de salud específico (ej. Infantil, Cardiovascular).

### 2. Desacoplamiento de Estructura REM (Parametrización Dinámica)
A través de la entidad `ParametroIndicador`, el sistema mapea dinámicamente las coordenadas de las celdas del Excel (hoja, coordenada como `D24`, código REM). Si el Ministerio de Salud (MINSAL) reestructura las planillas en un nuevo periodo anual, la correspondencia se actualiza desde la base de datos sin requerir modificaciones ni redespliegues del código fuente.

### 3. Ingesta Segura y Auditoría Inmutable
- **Validación estricta:** Comprobación de extensiones (`.xlsx`, `.xls`) y límite de carga de 25 MB.
- **Control de Integridad SHA-256:** Generación de huella hash para certificar la inmutabilidad de la planilla y prevenir procesamiento duplicado en un mismo periodo.
- **Procesamiento en memoria:** Lectura del libro con `openpyxl` en memoria volátil (RAM), calculando automáticamente el porcentaje de cumplimiento de cada indicador.
- **Pista de Auditoría:** Registro obligatorio en `RegistroAuditoria` con formato `JSONB`, almacenando usuario, fecha, acción y diferenciales de modificación.

---

## 📁 Estructura del Repositorio

```text
cesfam-santa-rosa/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py         # Endpoints de login, registro y perfil
│   │   │   │   ├── metas.py        # Endpoints de metas y parametrización
│   │   │   │   ├── rem.py          # Endpoints de subida y procesamiento REM
│   │   │   │   └── dashboard.py    # Endpoints de métricas y analítica
│   │   │   ├── deps.py             # Dependencias de seguridad (JWT y RBAC)
│   │   │   └── router.py           # Enrutador central de la API (/api/v1)
│   │   ├── core/
│   │   │   ├── config.py           # Variables de configuración y entorno
│   │   │   └── security.py         # Hashing bcrypt y generación de tokens JWT
│   │   ├── db/
│   │   │   └── session.py          # Conexión y sesión de base de datos
│   │   ├── models/
│   │   │   └── entities.py         # Modelos declarativos SQLAlchemy (8 tablas)
│   │   ├── schemas/
│   │   │   ├── auth.py             # Esquemas Pydantic de usuarios y tokens
│   │   │   ├── metas.py            # Esquemas Pydantic de metas y parámetros
│   │   │   └── rem.py              # Esquemas Pydantic de cargas estadísticas
│   │   └── services/
│   │       └── rem_loader.py       # Utilidades de lectura y hashing Excel
│   ├── main.py                     # Punto de entrada de la aplicación FastAPI
│   ├── requirements.txt            # Dependencias del backend
│   ├── .env.example                # Plantilla de variables de entorno
│   ├── init_db.py                  # Script de inicialización de tablas y catálogos
│   └── seed_admin.py               # Script de creación del usuario administrador
├── database/
│   └── backup_cesfam.sql           # Respaldo SQL completo con datos base
└── README.md                       # Documentación técnica del proyecto

Crear la base de datos vacía en PostgreSQL:

PowerShell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE cesfam_santarosa;"
Ejecutar la creación de esquemas y roles semilla:

PowerShell
python init_db.py
Crear el usuario administrador inicial:

PowerShell
python seed_admin.py
Paso 4: Ejecución del Servidor Backend
Levantar el servidor ASGI con recarga automática:

PowerShell
uvicorn main:app --reload
Verificar la disponibilidad en el navegador:

Estado de Salud de la API: http://127.0.0.1:8000/

Documentación Interactiva Swagger UI: http://127.0.0.1:8000/docs

Documentación Alternativa Redoc: http://127.0.0.1:8000/redoc

🔐 Credenciales de Prueba y Verificación
Para probar las rutas protegidas en Swagger UI (/docs):

Hacer clic en el botón superior Authorize (candado verde).

Ingresar las siguientes credenciales:

Username: admin@cesfam.cl

Password: admin1234

Presionar Authorize y luego Close.

Ejecutar la ruta GET /api/v1/auth/me para verificar la respuesta HTTP 200 OK con el perfil autenticado.
