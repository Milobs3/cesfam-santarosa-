import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Target, 
  FileSpreadsheet, 
  Upload, 
  BarChart3, 
  ShieldCheck, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Plus, 
  Sliders, 
  Lock,
  UserCheck,
  Download,
  Trash2,
  Users,
  Info,
  Filter
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000/api/v1';

interface Meta {
  id_meta: number;
  id_programa: number;
  nombre_programa?: string;
  anio: number;
  nombre_meta: string;
  ponderador: number;
  meta_esperada: number;
  actual?: number;
  valor_obtenido?: number;
}

interface Parametro {
  id_parametro: number;
  id_meta: number;
  codigo_indicador: string;
  descripcion: string;
  rem_codigo: string;
  nombre_hoja: string;
  celda_coordenada: string;
}

interface AuditoriaItem {
  id_auditoria: number;
  responsable_nombre: string;
  responsable_email: string;
  accion: string;
  tabla_modificada: string;
  id_registro_afectado: number;
  detalle: string;
  fecha_hora: string;
}

interface UsuarioItem {
  id_usuario: number;
  rut: string;
  nombre: string;
  email: string;
  activo: boolean;
  id_rol: number;
  nombre_rol: string;
  id_programa: number | null;
  nombre_programa: string;
}

interface CatalogoItem {
  id_rol?: number;
  nombre_rol?: string;
  id_programa?: number;
  nombre_programa?: string;
}

function parseJwtRole(token: string | null): string {
  if (!token) return 'Usuario';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.rol || 'Gestor de Informacion';
  } catch {
    return 'Gestor de Informacion';
  }
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [userRole, setUserRole] = useState<string>(() => parseJwtRole(localStorage.getItem('access_token')));
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'metas' | 'parametros' | 'rem' | 'auditoria' | 'usuarios'>('dashboard');

  // Login State
  const [email, setEmail] = useState('admin@cesfam.cl');
  const [password, setPassword] = useState('admin1234');
  const [loginError, setLoginError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Data States
  const [metas, setMetas] = useState<Meta[]>([]);
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaItem[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [rolesList, setRolesList] = useState<CatalogoItem[]>([]);
  const [programasList, setProgramasList] = useState<CatalogoItem[]>([]);

  // Dashboard Filters
  const [filtroPrograma, setFiltroPrograma] = useState<number>(0);
  const [filtroAnio, setFiltroAnio] = useState<number>(0);

  // Form States
  const [newMeta, setNewMeta] = useState({ id_programa: 1, anio: 2026, nombre_meta: '', ponderador: 20, meta_esperada: 85 });
  const [newParam, setNewParam] = useState({ id_meta: 0, codigo_indicador: '', descripcion: '', rem_codigo: 'REM-A01', nombre_hoja: 'Seccion_A', celda_coordenada: '', tipo_dato: 'NUMERIC' });
  const [newUser, setNewUser] = useState({ rut: '', nombre: '', email: '', password: '', id_rol: 2, id_programa: 0 });

  // REM Upload State
  const [remFile, setRemFile] = useState<File | null>(null);
  const [remMes, setRemMes] = useState(11);
  const [remAnio, setRemAnio] = useState(2026);
  const [uploadStatus, setUploadStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const esAdmin = userRole === 'Gestor de Informacion';
  const puedeEditar = userRole === 'Gestor de Informacion' || userRole === 'Subdireccion';

  const cargarDatosReales = async (authToken: string, roleDetected: string) => {
    const headers = { Authorization: `Bearer ${authToken}` };
    try {
      const peticiones = [
        fetch(`${API_URL}/dashboard/resumen`, { headers }),
        fetch(`${API_URL}/metas/parametros`, { headers }),
        fetch(`${API_URL}/dashboard/auditoria`, { headers }),
        fetch(`${API_URL}/auth/roles`, { headers }),
      ];

      if (roleDetected === 'Gestor de Informacion') {
        peticiones.push(fetch(`${API_URL}/auth/usuarios`, { headers }));
      }

      const [resMetas, resParams, resAud, resCat, resUsers] = await Promise.all(peticiones);

      if (resMetas.status === 401) {
        handleLogout();
        return;
      }

      if (resMetas.ok) {
        const dataMetas: Meta[] = await resMetas.json();
        setMetas(dataMetas);
        if (dataMetas.length > 0) {
          setNewParam((prev) => ({ ...prev, id_meta: prev.id_meta || dataMetas[0].id_meta }));
        }
      }
      if (resParams.ok) setParametros(await resParams.json());
      if (resAud.ok) setAuditoria(await resAud.json());
      if (resCat && resCat.ok) {
        const catData = await resCat.json();
        setRolesList(catData.roles || []);
        setProgramasList(catData.programas || []);
      }
      if (resUsers && resUsers.ok) {
        setUsuarios(await resUsers.json());
      }
    } catch (err) {
      console.error('Error conectando al backend:', err);
    }
  };

  useEffect(() => {
    if (token) {
      const role = parseJwtRole(token);
      setUserRole(role);
      setCurrentTab('dashboard');
      cargarDatosReales(token, role);
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const formBody = new URLSearchParams();
      formBody.append('username', email);
      formBody.append('password', password);

      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString(),
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.detail || 'Error al iniciar sesión');
        return;
      }

      localStorage.setItem('access_token', data.access_token);
      setToken(data.access_token);
    } catch {
      setLoginError('No se pudo conectar con el servidor Backend (puerto 8000).');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setMetas([]);
    setParametros([]);
    setAuditoria([]);
    setUsuarios([]);
  };

  const handleCreateMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const res = await fetch(`${API_URL}/metas/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newMeta),
    });
    const data = await res.json();
    if (!res.ok) return alert(`Error: ${data.detail || 'No se pudo guardar la meta'}`);

    setNewMeta({ id_programa: 1, anio: 2026, nombre_meta: '', ponderador: 20, meta_esperada: 85 });
    await cargarDatosReales(token, userRole);
    alert('Meta Sanitaria creada y registrada en Auditoría.');
  };

  const handleDeleteMeta = async (idMeta: number, nombreMeta: string) => {
    if (!token) return;
    if (!confirm(`¿Seguro que deseas eliminar la meta "${nombreMeta}"? Esta acción quedará registrada en Auditoría.`)) return;

    const res = await fetch(`${API_URL}/metas/${idMeta}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return alert(`Error: ${data.detail}`);

    await cargarDatosReales(token, userRole);
  };

  const handleCreateParam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!newParam.id_meta) return alert('Primero debes crear al menos una Meta Sanitaria.');

    const res = await fetch(`${API_URL}/metas/parametros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newParam),
    });
    const data = await res.json();
    if (!res.ok) return alert(`Error: ${data.detail || 'No se pudo registrar el parámetro'}`);

    setNewParam((prev) => ({ ...prev, codigo_indicador: '', descripcion: '', celda_coordenada: '' }));
    await cargarDatosReales(token, userRole);
    alert('Parámetro guardado y registrado en Auditoría.');
  };

  const handleDeleteParam = async (idParam: number, codigo: string) => {
    if (!token) return;
    if (!confirm(`¿Eliminar el parámetro "${codigo}"? Quedará registro de quién lo eliminó en Auditoría.`)) return;

    const res = await fetch(`${API_URL}/metas/parametros/${idParam}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return alert(`Error: ${data.detail}`);

    await cargarDatosReales(token, userRole);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const payload = {
      ...newUser,
      id_programa: newUser.id_programa === 0 ? null : newUser.id_programa,
    };
    const res = await fetch(`${API_URL}/auth/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return alert(`Error: ${data.detail || 'No se pudo crear el usuario'}`);

    setNewUser({ rut: '', nombre: '', email: '', password: '', id_rol: 2, id_programa: 0 });
    await cargarDatosReales(token, userRole);
    alert('Usuario institucional creado con éxito.');
  };

  const handleToggleUserStatus = async (idUsuario: number) => {
    if (!token) return;
    const res = await fetch(`${API_URL}/auth/usuarios/${idUsuario}/estado`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return alert(`Error: ${data.detail}`);

    await cargarDatosReales(token, userRole);
  };

  const handleUploadREM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!remFile) return alert('Selecciona un archivo .xlsx');

    setUploadStatus({ ok: true, msg: 'Procesando planilla Excel en memoria y calculando cumplimiento...' });
    try {
      const formData = new FormData();
      formData.append('archivo', remFile);
      formData.append('mes_periodo', String(remMes));
      formData.append('anio_periodo', String(remAnio));

      const res = await fetch(`${API_URL}/rem/cargar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadStatus({ ok: false, msg: data.detail || 'Error al procesar planilla REM.' });
        return;
      }

      setUploadStatus({
        ok: true,
        msg: `¡Carga exitosa! Planilla "${data.nombre_archivo}" verificada (SHA-256: ${data.hash_sha256.slice(0, 12)}...). Resultados actualizados en el Dashboard.`,
      });
      await cargarDatosReales(token, userRole);
    } catch {
      setUploadStatus({ ok: false, msg: 'Error de red al subir el archivo al backend.' });
    }
  };

  const handleExportCSV = () => {
    if (metasFiltradas.length === 0) return alert('No hay metas para exportar con el filtro actual.');
    const headers = ['ID_Meta,Programa,Anio,Nombre_Meta,Ponderador_Pct,Meta_Esperada_Pct,Cumplimiento_Real_Pct'];
    const rows = metasFiltradas.map(
      (m) => `${m.id_meta},"${m.nombre_programa || m.id_programa}",${m.anio},"${m.nombre_meta}",${m.ponderador},${m.meta_esperada},${m.actual ?? 0}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_metas_cesfam_santarosa.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

const handleExportAuditoriaCSV = () => {
    if (auditoria.length === 0) return alert('No hay registros de auditoría para exportar.');
    const headers = ['ID,Responsable,Correo,Accion,Tabla,ID_Afectado,Detalle,Fecha_Hora'];
    const rows = auditoria.map(
      (a) => `${a.id_auditoria},"${a.responsable_nombre}","${a.responsable_email}","${a.accion}","${a.tabla_modificada}",${a.id_registro_afectado},"${a.detalle.replace(/"/g, '""')}","${a.fecha_hora}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_cesfam_santarosa.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado dinámico de metas para Dashboard
  const metasFiltradas = metas.filter((m) => {
    if (filtroPrograma !== 0 && m.id_programa !== filtroPrograma) return false;
    if (filtroAnio !== 0 && m.anio !== filtroAnio) return false;
    return true;
  });

  const aniosDisponibles = Array.from(new Set(metas.map((m) => m.anio))).sort();
  const totalMetas = metasFiltradas.length;
  const metasCumplidas = metasFiltradas.filter((m) => (m.actual || 0) >= m.meta_esperada).length;
  const promedioCumplimiento = totalMetas > 0
    ? (metasFiltradas.reduce((acc, m) => acc + (m.actual || 0), 0) / totalMetas).toFixed(1)
    : '0.0';

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-blue-100 text-blue-600 rounded-xl mb-2">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">CESFAM Santa Rosa</h1>
            <p className="text-sm text-slate-500">Plataforma de Control de Metas Sanitarias y REM</p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Correo Institucional</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" /> {loading ? 'Verificando credenciales...' : 'Ingresar al Sistema'}
            </button>
          </form>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-500 text-center">
            Acceso protegido con cifrado JWT, control de roles (RBAC) y bloqueo anti fuerza bruta.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 leading-none">CESFAM Santa Rosa</h1>
            <span className="text-xs text-slate-500">Gestión de Metas Sanitarias y Planillas REM</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-800">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Perfil activo: <b>{userRole}</b></span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1">
        {/* Sidebar Nav con control de visibilidad según Rol (RBAC) */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Análisis y Reportes</p>
            <button 
              onClick={() => setCurrentTab('dashboard')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <BarChart3 className="w-4 h-4" /> Panel de Metas
            </button>

            {puedeEditar && (
              <>
                <p className="px-3 pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Operación REM</p>
                <button 
                  onClick={() => setCurrentTab('metas')} 
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTab === 'metas' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Target className="w-4 h-4" /> 1. Definir Metas
                </button>
                <button 
                  onClick={() => setCurrentTab('parametros')} 
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTab === 'parametros' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Sliders className="w-4 h-4" /> 2. Configurar Celdas
                </button>
                <button 
                  onClick={() => setCurrentTab('rem')} 
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTab === 'rem' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <FileSpreadsheet className="w-4 h-4" /> 3. Subir Planilla REM
                </button>
              </>
            )}

            <p className="px-3 pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Control y Seguridad</p>
            <button 
              onClick={() => setCurrentTab('auditoria')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTab === 'auditoria' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <ShieldCheck className="w-4 h-4" /> Auditoría de Cambios
            </button>

            {esAdmin && (
              <button 
                onClick={() => setCurrentTab('usuarios')} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTab === 'usuarios' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Users className="w-4 h-4" /> Gestión de Usuarios
              </button>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Flujo Rápido:</p>
            <p>1. Crea una meta sanitaria.</p>
            <p>2. Asocia su celda Excel.</p>
            <p>3. Sube el archivo REM.</p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8 space-y-6">
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Panel Ejecutivo de Metas Sanitarias</h2>
                  <p className="text-xs text-slate-500">Visualización en tiempo real del cumplimiento calculado desde planillas REM</p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" /> Exportar Reporte CSV (Power BI)
                </button>
              </div>

              {/* Tarjetas KPI de Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Metas Evaluadas</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{totalMetas}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Metas Alcanzadas</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{metasCumplidas} <span className="text-xs font-normal text-slate-400">de {totalMetas}</span></p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Cumplimiento Promedio</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{promedioCumplimiento}%</p>
                </div>
              </div>

              {/* Barra de Filtros por Programa y Año (RF-05, RF-06) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                  <Filter className="w-4 h-4 text-blue-600" /> Filtrar Reporte:
                </div>
                <select
                  value={filtroPrograma}
                  onChange={(e) => setFiltroPrograma(Number(e.target.value))}
                  className="border border-slate-300 px-3 py-1.5 text-xs rounded-lg bg-slate-50"
                >
                  <option value={0}>Todos los Programas de Salud</option>
                  {programasList.map((p) => (
                    <option key={p.id_programa} value={p.id_programa}>{p.nombre_programa}</option>
                  ))}
                </select>
                <select
                  value={filtroAnio}
                  onChange={(e) => setFiltroAnio(Number(e.target.value))}
                  className="border border-slate-300 px-3 py-1.5 text-xs rounded-lg bg-slate-50"
                >
                  <option value={0}>Todos los Años</option>
                  {aniosDisponibles.map((a) => (
                    <option key={a} value={a}>Año {a}</option>
                  ))}
                </select>
              </div>

              {/* Gráfico de Barras Comparativo (RF-08) */}
              {metasFiltradas.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-700 uppercase">Comparativo Gráfico: Cumplimiento Real vs. Meta Esperada</h3>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-600 inline-block"></span> Real Obtenido (%)</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-300 inline-block"></span> Meta Exigida (%)</span>
                    </div>
                  </div>
                  <div className="space-y-4 pt-2">
                    {metasFiltradas.map((m) => {
                      const real = Math.min(m.actual || 0, 100);
                      const esperada = Math.min(m.meta_esperada, 100);
                      return (
                        <div key={`chart-${m.id_meta}`} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700">{m.nombre_meta} <span className="text-slate-400">({m.nombre_programa})</span></span>
                            <span className="font-mono font-bold text-slate-700">{m.actual ?? 0}% / {m.meta_esperada}%</span>
                          </div>
                          <div className="space-y-1">
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${real >= esperada ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                style={{ width: `${real}%` }}
                              />
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-400" style={{ width: `${esperada}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Tarjetas Detalladas por Meta */}
              {metasFiltradas.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2">
                  <p className="text-slate-600 font-medium">No hay metas sanitarias para mostrar con los filtros seleccionados.</p>
                  <p className="text-xs text-slate-400">Crea una meta en "1. Definir Metas" o ajusta los filtros superiores.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {metasFiltradas.map((m) => {
                    const pct = m.actual || 0;
                    const cumplida = pct >= m.meta_esperada;
                    return (
                      <div key={m.id_meta} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{m.nombre_programa || `Programa ${m.id_programa}`}</span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cumplida ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {cumplida ? 'Meta Alcanzada' : 'En Progreso'}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-800 text-sm">{m.nombre_meta}</h3>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Cumplimiento: <b>{pct}%</b></span>
                            <span>Exigido: <b>{m.meta_esperada}%</b></span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${cumplida ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {currentTab === 'metas' && puedeEditar && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Paso 1: Definición de Metas Sanitarias</h2>
                <p className="text-xs text-slate-500">Registra las metas anuales por programa de salud y el porcentaje exigido por el Ministerio.</p>
              </div>

              <form onSubmit={handleCreateMeta} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" /> Crear Nueva Meta Sanitaria
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <select
                    value={newMeta.id_programa}
                    onChange={(e) => setNewMeta({ ...newMeta, id_programa: Number(e.target.value) })}
                    className="border p-2.5 text-sm rounded-lg"
                  >
                    {programasList.length > 0 ? (
                      programasList.map((p) => (
                        <option key={p.id_programa} value={p.id_programa}>{p.nombre_programa}</option>
                      ))
                    ) : (
                      <>
                        <option value={1}>Programa 1</option>
                        <option value={2}>Programa 2</option>
                        <option value={3}>Programa 3</option>
                      </>
                    )}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Nombre de la Meta" 
                    value={newMeta.nombre_meta}
                    onChange={(e) => setNewMeta({ ...newMeta, nombre_meta: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="number" 
                    placeholder="Año (ej. 2026)" 
                    value={newMeta.anio}
                    onChange={(e) => setNewMeta({ ...newMeta, anio: Number(e.target.value) })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="number" 
                    placeholder="Ponderador (%)" 
                    value={newMeta.ponderador}
                    onChange={(e) => setNewMeta({ ...newMeta, ponderador: Number(e.target.value) })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="number" 
                    placeholder="Meta Esperada (%)" 
                    value={newMeta.meta_esperada}
                    onChange={(e) => setNewMeta({ ...newMeta, meta_esperada: Number(e.target.value) })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                </div>
                <button type="submit" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
                  Guardar Meta
                </button>
              </form>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                      <th className="p-3">ID</th>
                      <th className="p-3">Programa</th>
                      <th className="p-3">Nombre Meta</th>
                      <th className="p-3">Año</th>
                      <th className="p-3">Ponderador</th>
                      <th className="p-3">Meta Esperada</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metas.map((m) => (
                      <tr key={m.id_meta} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-500">{m.id_meta}</td>
                        <td className="p-3 text-slate-600">{m.nombre_programa || m.id_programa}</td>
                        <td className="p-3 font-medium text-slate-800">{m.nombre_meta}</td>
                        <td className="p-3 text-slate-600">{m.anio}</td>
                        <td className="p-3 text-slate-600">{m.ponderador}%</td>
                        <td className="p-3 text-slate-600">{m.meta_esperada}%</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteMeta(m.id_meta, m.nombre_meta)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar meta (quedará registrado en auditoría)"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'parametros' && puedeEditar && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Paso 2: Parametrización Dinámica de Celdas REM</h2>
                <p className="text-xs text-slate-500">Indica en qué hoja y celda del archivo Excel REM se encuentra el dato numérico para calcular cada meta.</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-xs text-blue-800 flex items-center gap-2.5">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Ejemplo: Si la planilla ministerial cambia de formato el próximo mes, basta con actualizar aquí la celda (ej. de <b>D24</b> a <b>E25</b>) sin modificar código.</span>
              </div>

              <form onSubmit={handleCreateParam} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" /> Asociar Celda Excel a Meta Sanitaria
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select 
                    value={newParam.id_meta}
                    onChange={(e) => setNewParam({ ...newParam, id_meta: Number(e.target.value) })}
                    className="border p-2.5 text-sm rounded-lg"
                  >
                    {metas.length === 0 && <option value={0}>Crea una meta primero...</option>}
                    {metas.map(m => (
                      <option key={m.id_meta} value={m.id_meta}>{m.nombre_meta}</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Código Indicador (ej. IND-01)" 
                    value={newParam.codigo_indicador}
                    onChange={(e) => setNewParam({ ...newParam, codigo_indicador: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="text" 
                    placeholder="Código REM (ej. REM-A01)" 
                    value={newParam.rem_codigo}
                    onChange={(e) => setNewParam({ ...newParam, rem_codigo: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="text" 
                    placeholder="Nombre Hoja Excel (ej. Seccion_A)" 
                    value={newParam.nombre_hoja}
                    onChange={(e) => setNewParam({ ...newParam, nombre_hoja: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="text" 
                    placeholder="Celda Exacta (ej. D24)" 
                    value={newParam.celda_coordenada}
                    onChange={(e) => setNewParam({ ...newParam, celda_coordenada: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="text" 
                    placeholder="Descripción breve" 
                    value={newParam.descripcion}
                    onChange={(e) => setNewParam({ ...newParam, descripcion: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                </div>
                <button type="submit" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
                  Guardar Parametrización
                </button>
              </form>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                      <th className="p-3">Indicador</th>
                      <th className="p-3">Descripción</th>
                      <th className="p-3">Código REM</th>
                      <th className="p-3">Hoja Excel</th>
                      <th className="p-3">Celda</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parametros.map((p) => (
                      <tr key={p.id_parametro} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-medium text-blue-600">{p.codigo_indicador}</td>
                        <td className="p-3 text-slate-800">{p.descripcion}</td>
                        <td className="p-3 text-slate-600">{p.rem_codigo}</td>
                        <td className="p-3 text-slate-600">{p.nombre_hoja}</td>
                        <td className="p-3 font-mono bg-slate-50 text-slate-700 font-bold">{p.celda_coordenada}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteParam(p.id_parametro, p.codigo_indicador)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar parámetro (quedará registrado en auditoría)"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'rem' && puedeEditar && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-800">Paso 3: Carga y Procesamiento REM</h2>
                <p className="text-xs text-slate-500">Sube la planilla Excel oficial (.xlsx). El sistema leerá las celdas parametrizadas y actualizará los gráficos.</p>
              </div>

              <form onSubmit={handleUploadREM} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Mes Periodo</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="12" 
                      value={remMes} 
                      onChange={(e) => setRemMes(Number(e.target.value))}
                      className="w-full border p-2.5 text-sm rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Año Periodo</label>
                    <input 
                      type="number" 
                      value={remAnio} 
                      onChange={(e) => setRemAnio(Number(e.target.value))}
                      className="w-full border p-2.5 text-sm rounded-lg"
                    />
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center space-y-2 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-700">Selecciona tu planilla Excel (.xlsx)</p>
                  <p className="text-xs text-slate-400">Verificación de integridad SHA-256 automática (Máx. 25 MB)</p>
                  <input 
                    type="file" 
                    accept=".xlsx" 
                    onChange={(e) => setRemFile(e.target.files?.[0] || null)}
                    className="hidden" 
                    id="rem-upload-input"
                  />
                  <label htmlFor="rem-upload-input" className="inline-block mt-2 bg-slate-200 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg cursor-pointer hover:bg-slate-300">
                    {remFile ? remFile.name : 'Examinar Equipo...'}
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Procesar Planilla REM
                </button>
              </form>

              {uploadStatus && (
                <div className={`p-4 border rounded-xl text-xs font-medium flex items-center gap-2 ${uploadStatus.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  {uploadStatus.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                  <span>{uploadStatus.msg}</span>
                </div>
              )}
            </div>
          )}

          {currentTab === 'auditoria' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Registro Inmutable de Auditoría y Trazabilidad</h2>
                  <p className="text-xs text-slate-500">Historial completo de quién creó, modificó, cargó o eliminó información en el sistema, con fecha y hora exacta.</p>
                </div>
                <button
                  onClick={handleExportAuditoriaCSV}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" /> Exportar Auditoría CSV
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                      <th className="p-3">ID</th>
                      <th className="p-3">Responsable</th>
                      <th className="p-3">Acción Realizada</th>
                      <th className="p-3">Detalle del Registro</th>
                      <th className="p-3">Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditoria.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
                          Aún no hay eventos registrados.
                        </td>
                      </tr>
                    ) : (
                      auditoria.map((a) => {
                        const esEliminacion = a.accion.includes('ELIMINACION');
                        return (
                          <tr key={a.id_auditoria} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-slate-500">{a.id_auditoria}</td>
                            <td className="p-3">
                              <div className="font-medium text-slate-800">{a.responsable_nombre}</div>
                              <div className="text-xs text-slate-400">{a.responsable_email}</div>
                            </td>
                            <td className="p-3">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${esEliminacion ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {a.accion}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-slate-600 max-w-md truncate" title={a.detalle}>
                              {a.detalle || `${a.tabla_modificada} #${a.id_registro_afectado}`}
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-500">{a.fecha_hora}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'usuarios' && esAdmin && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Administración de Usuarios y Perfiles (RBAC)</h2>
                <p className="text-xs text-slate-500">Gestiona los accesos institucionales de Dirección, Subdirecciones y Jefes de Programa.</p>
              </div>

              <form onSubmit={handleCreateUser} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" /> Registrar Nuevo Usuario Institucional
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input 
                    type="text" 
                    placeholder="RUT (ej. 12.345.678-9)" 
                    value={newUser.rut}
                    onChange={(e) => setNewUser({ ...newUser, rut: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="text" 
                    placeholder="Nombre Completo" 
                    value={newUser.nombre}
                    onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="email" 
                    placeholder="Correo Institucional (@cesfam.cl)" 
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="password" 
                    placeholder="Contraseña (mín. 6 caracteres)" 
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <select
                    value={newUser.id_rol}
                    onChange={(e) => setNewUser({ ...newUser, id_rol: Number(e.target.value) })}
                    className="border p-2.5 text-sm rounded-lg"
                  >
                    {rolesList.map((r) => (
                      <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>
                    ))}
                  </select>
                  <select
                    value={newUser.id_programa}
                    onChange={(e) => setNewUser({ ...newUser, id_programa: Number(e.target.value) })}
                    className="border p-2.5 text-sm rounded-lg"
                  >
                    <option value={0}>Acceso Global / Transversal</option>
                    {programasList.map((p) => (
                      <option key={p.id_programa} value={p.id_programa}>Solo {p.nombre_programa}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
                  Crear Cuenta Institucional
                </button>
              </form>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                      <th className="p-3">RUT</th>
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Correo</th>
                      <th className="p-3">Rol Institucional</th>
                      <th className="p-3">Programa</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usuarios.map((u) => (
                      <tr key={u.id_usuario} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs text-slate-500">{u.rut}</td>
                        <td className="p-3 font-medium text-slate-800">{u.nombre}</td>
                        <td className="p-3 text-slate-600">{u.email}</td>
                        <td className="p-3">
                          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">{u.nombre_rol}</span>
                        </td>
                        <td className="p-3 text-xs text-slate-500">{u.nombre_programa}</td>
                        <td className="p-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleToggleUserStatus(u.id_usuario)}
                            className="text-xs font-medium text-slate-600 hover:text-blue-600 underline"
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}