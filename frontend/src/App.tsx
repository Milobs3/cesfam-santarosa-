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
  Plus, 
  Sliders, 
  Lock,
  UserCheck
} from 'lucide-react';

interface Meta {
  id_meta: number;
  id_programa: number;
  anio: number;
  nombre_meta: string;
  ponderador: number;
  meta_esperada: number;
  actual?: number;
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

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [userRole, setUserRole] = useState<string>('Gestor de Información');
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'metas' | 'parametros' | 'rem' | 'auditoria'>('dashboard');

  // Login State
  const [email, setEmail] = useState('admin@cesfam.cl');
  const [password, setPassword] = useState('admin123');

  // Data States
  const [metas, setMetas] = useState<Meta[]>([
    { id_meta: 1, id_programa: 1, anio: 2026, nombre_meta: 'Cobertura de Control Salud Infantil', ponderador: 25.0, meta_esperada: 90.0, actual: 88.5 },
    { id_meta: 2, id_programa: 1, anio: 2026, nombre_meta: 'Evaluación del Desarrollo Psicomotor en Niños', ponderador: 20.0, meta_esperada: 85.0, actual: 92.1 },
    { id_meta: 3, id_programa: 2, anio: 2026, nombre_meta: 'Efectividad en Cobertura de Pacientes Hipertensos', ponderador: 30.0, meta_esperada: 75.0, actual: 64.2 },
  ]);

  const [parametros, setParametros] = useState<Parametro[]>([
    { id_parametro: 1, id_meta: 1, codigo_indicador: 'IND-01-NUM', descripcion: 'Niños con control al día', rem_codigo: 'REM-P01', nombre_hoja: 'Seccion_A', celda_coordenada: 'D24' },
    { id_parametro: 2, id_meta: 1, codigo_indicador: 'IND-01-DEN', descripcion: 'Población bajo control inscrita', rem_codigo: 'REM-P01', nombre_hoja: 'Seccion_A', celda_coordenada: 'D10' },
  ]);

  // Form States
  const [newMeta, setNewMeta] = useState({ id_programa: 1, anio: 2026, nombre_meta: '', ponderador: 20, meta_esperada: 85 });
  const [newParam, setNewParam] = useState({ id_meta: 1, codigo_indicador: '', descripcion: '', rem_codigo: 'REM-A01', nombre_hoja: 'Seccion_A', celda_coordenada: '' });

  // REM Upload State
  const [remFile, setRemFile] = useState<File | null>(null);
  const [remMes, setRemMes] = useState(10);
  const [remAnio, setRemAnio] = useState(2026);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
    localStorage.setItem('access_token', fakeToken);
    setToken(fakeToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
  };

  const handleCreateMeta = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Meta = { ...newMeta, id_meta: Date.now(), actual: 0 };
    setMetas([...metas, created]);
    setNewMeta({ id_programa: 1, anio: 2026, nombre_meta: '', ponderador: 20, meta_esperada: 85 });
    alert('Meta Sanitaria creada con éxito');
  };

  const handleCreateParam = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Parametro = { ...newParam, id_parametro: Date.now() };
    setParametros([...parametros, created]);
    setNewParam({ id_meta: 1, codigo_indicador: '', descripcion: '', rem_codigo: 'REM-A01', nombre_hoja: 'Seccion_A', celda_coordenada: '' });
    alert('Parámetro registrado con éxito');
  };

  const handleUploadREM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remFile) return alert('Selecciona un archivo .xlsx');
    setUploadStatus('Procesando archivo Excel y calculando SHA-256...');
    setTimeout(() => {
      setUploadStatus(`¡Carga exitosa! Se procesó el archivo ${remFile.name} para el periodo ${remMes}/${remAnio}.`);
    }, 1200);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-blue-100 text-blue-600 rounded-xl mb-2">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">CESFAM Santa Rosa</h1>
            <p className="text-sm text-slate-500">Sistema de Gestión de Metas Sanitarias (REM)</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Correo Electrónico</label>
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" /> Iniciar Sesión
            </button>
          </form>

          <div className="text-xs text-center text-slate-400">
            Compatible con la API REST de FastAPI y autenticación RBAC
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
            <span className="text-xs text-slate-500">Gestión e Ingesta de Planillas REM</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Rol: <b>{userRole}</b></span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1">
        {/* Sidebar Nav */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 space-y-1">
          <button 
            onClick={() => setCurrentTab('dashboard')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <BarChart3 className="w-4 h-4" /> Dashboard General
          </button>
          <button 
            onClick={() => setCurrentTab('metas')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTab === 'metas' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Target className="w-4 h-4" /> Metas Sanitarias
          </button>
          <button 
            onClick={() => setCurrentTab('parametros')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTab === 'parametros' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Sliders className="w-4 h-4" /> Parametrización Celdas
          </button>
          <button 
            onClick={() => setCurrentTab('rem')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTab === 'rem' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Ingesta Carga REM
          </button>
          <button 
            onClick={() => setCurrentTab('auditoria')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTab === 'auditoria' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <ShieldCheck className="w-4 h-4" /> Registro Auditoría
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8">
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800">Resumen Analítico de Metas Sanitarias</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metas.map((m) => {
                  const pct = m.actual || 0;
                  const cumplida = pct >= m.meta_esperada;
                  return (
                    <div key={m.id_meta} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">Programa {m.id_programa}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cumplida ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {cumplida ? 'Meta Alcanzada' : 'En Progreso'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-800 text-sm">{m.nombre_meta}</h3>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Progreso Actual: <b>{pct}%</b></span>
                          <span>Esperado: <b>{m.meta_esperada}%</b></span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${cumplida ? 'bg-green-500' : 'bg-blue-600'}`} 
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentTab === 'metas' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Metas Sanitarias Configuradas</h2>
              </div>

              <form onSubmit={handleCreateMeta} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" /> Crear Nueva Meta Sanitaria
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input 
                    type="text" 
                    placeholder="Nombre de la Meta" 
                    value={newMeta.nombre_meta}
                    onChange={(e) => setNewMeta({ ...newMeta, nombre_meta: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="number" 
                    placeholder="Año (e.g. 2026)" 
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
                      <th className="p-3">Nombre Meta</th>
                      <th className="p-3">Año</th>
                      <th className="p-3">Ponderador</th>
                      <th className="p-3">Meta Esperada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metas.map((m) => (
                      <tr key={m.id_meta} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-500">{m.id_meta}</td>
                        <td className="p-3 font-medium text-slate-800">{m.nombre_meta}</td>
                        <td className="p-3 text-slate-600">{m.anio}</td>
                        <td className="p-3 text-slate-600">{m.ponderador}%</td>
                        <td className="p-3 text-slate-600">{m.meta_esperada}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'parametros' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800">Parametrización Dinámica de Celdas REM</h2>

              <form onSubmit={handleCreateParam} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" /> Asociar Celda Excel a Indicador
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select 
                    value={newParam.id_meta}
                    onChange={(e) => setNewParam({ ...newParam, id_meta: Number(e.target.value) })}
                    className="border p-2.5 text-sm rounded-lg"
                  >
                    {metas.map(m => (
                      <option key={m.id_meta} value={m.id_meta}>{m.nombre_meta}</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Código Indicador (e.g. IND-01-NUM)" 
                    value={newParam.codigo_indicador}
                    onChange={(e) => setNewParam({ ...newParam, codigo_indicador: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="text" 
                    placeholder="Código REM (e.g. REM-A01)" 
                    value={newParam.rem_codigo}
                    onChange={(e) => setNewParam({ ...newParam, rem_codigo: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="text" 
                    placeholder="Nombre Hoja Excel (e.g. Seccion_A)" 
                    value={newParam.nombre_hoja}
                    onChange={(e) => setNewParam({ ...newParam, nombre_hoja: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="text" 
                    placeholder="Celda (e.g. D24)" 
                    value={newParam.celda_coordenada}
                    onChange={(e) => setNewParam({ ...newParam, celda_coordenada: e.target.value })}
                    className="border p-2.5 text-sm rounded-lg" required
                  />
                  <input 
                    type="text" 
                    placeholder="Descripción" 
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'rem' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <h2 className="text-xl font-bold text-slate-800 text-center">Ingesta y Procesamiento de Planillas REM</h2>

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

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center space-y-2 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-700">Arrastra tu archivo Excel aquí o haz clic para buscar</p>
                  <p className="text-xs text-slate-400">Archivos soportados: .xlsx (Máximo 25 MB)</p>
                  <input 
                    type="file" 
                    accept=".xlsx" 
                    onChange={(e) => setRemFile(e.target.files?.[0] || null)}
                    className="hidden" 
                    id="rem-upload-input"
                  />
                  <label htmlFor="rem-upload-input" className="inline-block mt-2 bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-300">
                    {remFile ? remFile.name : 'Seleccionar Archivo'}
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Procesar y Ingestar REM
                </button>
              </form>

              {uploadStatus && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>{uploadStatus}</span>
                </div>
              )}
            </div>
          )}

          {currentTab === 'auditoria' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800">Registro Inmutable de Auditoría</h2>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                      <th className="p-3">ID</th>
                      <th className="p-3">Acción</th>
                      <th className="p-3">Tabla Modificada</th>
                      <th className="p-3">ID Afectado</th>
                      <th className="p-3">Fecha / Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-500">101</td>
                      <td className="p-3 font-bold text-blue-600">CARGA_Y_PROCESAMIENTO_REM</td>
                      <td className="p-3 text-slate-700">carga_rem</td>
                      <td className="p-3 text-slate-700">15</td>
                      <td className="p-3 text-xs text-slate-500">2026-10-22 18:30:12</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-500">100</td>
                      <td className="p-3 font-bold text-slate-700">CONFIGURACION_PARAMETRO_REM</td>
                      <td className="p-3 text-slate-700">parametro_indicador</td>
                      <td className="p-3 text-slate-700">2</td>
                      <td className="p-3 text-xs text-slate-500">2026-10-22 17:15:00</td>
                    </tr>
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