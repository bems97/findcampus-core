import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  GraduationCap,
  Search,
  RefreshCw,
  Trash2,
  UserCog,
} from 'lucide-react';
import type { UsuarioSesion } from './AuthModal';

interface UsuarioRegistrado {
  id: string;
  nombre: string;
  correo: string;
  codigo_institucional: string;
  rol: 'ESTUDIANTE' | 'ADMIN';
  created_at?: string | null;
}

interface GestionUsuariosProps {
  usuarioActual: UsuarioSesion | null;
}

export const GestionUsuarios: React.FC<GestionUsuariosProps> = ({ usuarioActual }) => {
  const [usuarios, setUsuarios] = useState<UsuarioRegistrado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [rolFiltro, setRolFiltro] = useState<'TODOS' | 'ESTUDIANTE' | 'ADMIN'>('TODOS');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const cargarUsuarios = async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      if (Array.isArray(data.usuarios)) {
        setUsuarios(data.usuarios);
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cambiarRol = async (u: UsuarioRegistrado) => {
    if (usuarioActual && u.id === usuarioActual.id) {
      setMensaje({
        tipo: 'err',
        texto: 'Por seguridad no puedes cambiar el rol de tu propia sesión activa.',
      });
      return;
    }

    const nuevoRol = u.rol === 'ADMIN' ? 'ESTUDIANTE' : 'ADMIN';
    setProcesandoId(u.id);
    setMensaje(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, rol: nuevoRol }),
      });

      if (!res.ok) throw new Error('No se pudo actualizar el rol.');

      setUsuarios((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, rol: nuevoRol } : item))
      );
      setMensaje({
        tipo: 'ok',
        texto: `Rol de ${u.nombre} actualizado a ${nuevoRol === 'ADMIN' ? 'Vigilancia / Admin' : 'Estudiante'}.`,
      });
    } catch {
      setMensaje({ tipo: 'err', texto: 'Error al cambiar el rol del usuario.' });
    } finally {
      setProcesandoId(null);
    }
  };

  const eliminarUsuario = async (u: UsuarioRegistrado) => {
    if (usuarioActual && u.id === usuarioActual.id) {
      setMensaje({
        tipo: 'err',
        texto: 'No puedes eliminar la cuenta con la que estás conectado.',
      });
      return;
    }

    if (!window.confirm(`¿Eliminar permanentemente la cuenta de ${u.nombre} (${u.correo})?`)) {
      return;
    }

    setProcesandoId(u.id);
    setMensaje(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id }),
      });

      if (!res.ok) throw new Error('No se pudo eliminar el usuario.');

      setUsuarios((prev) => prev.filter((item) => item.id !== u.id));
      setMensaje({ tipo: 'ok', texto: `Cuenta de ${u.nombre} eliminada.` });
    } catch {
      setMensaje({ tipo: 'err', texto: 'Error al eliminar el usuario.' });
    } finally {
      setProcesandoId(null);
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const coincideRol = rolFiltro === 'TODOS' || u.rol === rolFiltro;
    const q = filtro.trim().toLowerCase();
    if (!q) return coincideRol;
    return `${u.nombre} ${u.correo} ${u.codigo_institucional}`.toLowerCase().includes(q) && coincideRol;
  });

  const totalAdmins = usuarios.filter((u) => u.rol === 'ADMIN').length;
  const totalEstudiantes = usuarios.filter((u) => u.rol === 'ESTUDIANTE').length;

  return (
    <section className="space-y-6">
      {/* Cabecera */}
      <div className="rounded-3xl bg-[#0e1e38] border border-blue-900/50 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-extrabold text-yellow-400 uppercase tracking-wider">
            <Users className="w-4 h-4" />
            <span>Directorio Institucional • Control de Accesos</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">
            Gestión de Usuarios y Roles
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-[#081326] border border-blue-900/60 text-slate-300">
            Total: <strong className="text-white">{usuarios.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300">
            Custodia / Admin: <strong>{totalAdmins}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-400/30 text-blue-300">
            Estudiantes: <strong>{totalEstudiantes}</strong>
          </span>
          <button
            type="button"
            onClick={cargarUsuarios}
            className="p-2 rounded-xl bg-[#081326] hover:bg-blue-950 border border-blue-900/60 text-yellow-400 cursor-pointer"
            title="Actualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filtros y Tabla */}
      <div className="rounded-3xl bg-[#0e1e38] border border-blue-900/50 p-6 space-y-5 shadow-xl">
        {mensaje && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold border ${
              mensaje.tipo === 'ok'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                : 'bg-red-500/15 border-red-500/40 text-red-200'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por nombre, correo o ID institucional..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-xs text-white outline-none"
            />
          </div>

          <div className="flex gap-2">
            {(['TODOS', 'ADMIN', 'ESTUDIANTE'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRolFiltro(r)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  rolFiltro === r
                    ? 'bg-yellow-400 text-slate-950'
                    : 'bg-[#081326] text-slate-300 hover:bg-blue-950 border border-blue-900/50'
                }`}
              >
                {r === 'TODOS' ? 'Todos' : r === 'ADMIN' ? 'Custodia / Admin' : 'Estudiantes'}
              </button>
            ))}
          </div>
        </div>

        {cargando ? (
          <p className="text-center py-10 text-sm text-slate-400">
            Consultando usuarios registrados en MongoDB...
          </p>
        ) : usuariosFiltrados.length === 0 ? (
          <p className="text-center py-10 text-sm text-slate-400">
            No se encontraron usuarios con ese criterio.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#081326] text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Usuario</th>
                  <th className="px-4 py-3">ID Institucional</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3 rounded-r-xl text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-950">
                {usuariosFiltrados.map((u) => {
                  const esYo = usuarioActual?.id === u.id;
                  const ocupado = procesandoId === u.id;

                  return (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{u.nombre}</span>
                          {esYo && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-yellow-400/20 text-yellow-300">
                              Tu sesión
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px]">{u.correo}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-200">
                        {u.codigo_institucional}
                      </td>
                      <td className="px-4 py-3">
                        {u.rol === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Vigilancia / Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-400/30">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Estudiante</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={esYo || ocupado}
                            onClick={() => cambiarRol(u)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#081326] hover:bg-blue-950 disabled:opacity-40 border border-blue-800/60 text-yellow-300 font-bold cursor-pointer"
                          >
                            <UserCog className="w-3.5 h-3.5" />
                            <span>
                              {u.rol === 'ADMIN' ? 'Pasar a Estudiante' : 'Hacer Admin'}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={esYo || ocupado}
                            onClick={() => eliminarUsuario(u)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 text-red-400 border border-red-500/30 cursor-pointer"
                            title="Eliminar cuenta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};