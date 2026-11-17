import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Database,
  BarChart3,
  Terminal,
  Lock,
  Unlock,
  UserCheck,
  LogOut,
  X,
} from 'lucide-react';

export type VistaActiva = 'CATALOGO' | 'CUSTODIA' | 'DATALAKE' | 'API';
export type RolUsuario = 'ESTUDIANTE' | 'ADMIN';

interface NavbarProps {
  vistaActiva: VistaActiva;
  onCambiarVista: (vista: VistaActiva) => void;
  rol: RolUsuario;
  onCambiarRol: (nuevoRol: RolUsuario) => void;
  totalEnCustodia: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  vistaActiva,
  onCambiarVista,
  rol,
  onCambiarRol,
  totalEnCustodia,
}) => {
  const [modalLoginAbierto, setModalLoginAbierto] = useState(false);
  const [pinAdmin, setPinAdmin] = useState('');
  const [errorPin, setErrorPin] = useState(false);

  const navItems: {
    id: VistaActiva;
    label: string;
    icon: React.ReactNode;
    soloAdmin: boolean;
  }[] = [
    { id: 'CATALOGO', label: 'Explorar Objetos', icon: <Search className="w-4 h-4" />, soloAdmin: false },
    { id: 'CUSTODIA', label: 'Custodia NoSQL', icon: <Database className="w-4 h-4" />, soloAdmin: true },
    { id: 'DATALAKE', label: 'Data Lake & BI', icon: <BarChart3 className="w-4 h-4" />, soloAdmin: true },
    { id: 'API', label: 'Contratos API', icon: <Terminal className="w-4 h-4" />, soloAdmin: true },
  ];

  const itemsVisibles = navItems.filter((item) => !item.soloAdmin || rol === 'ADMIN');

  const manejarLoginAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinAdmin === '1234' || pinAdmin.trim() !== '') {
      onCambiarRol('ADMIN');
      onCambiarVista('CUSTODIA');
      setModalLoginAbierto(false);
      setPinAdmin('');
      setErrorPin(false);
    } else {
      setErrorPin(true);
    }
  };

  const cerrarSesionAdmin = () => {
    onCambiarRol('ESTUDIANTE');
    onCambiarVista('CATALOGO');
  };

  return (
    <>
      <header className="sticky top-3 z-30 max-w-7xl w-[calc(100%-2rem)] mx-auto rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 shadow-2xl shadow-black/60">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Marca */}
          <div
            onClick={() => onCambiarVista('CATALOGO')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-zinc-950 shadow-md shadow-yellow-400/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-zinc-100 tracking-tight text-lg">
                  FindCampus<span className="text-yellow-400">.core</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                  UNIMINUTO
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden md:block">
                {rol === 'ADMIN'
                  ? 'Consola Privilegiada • Vigilancia & Arquitectura'
                  : 'Sistema Central de Trazabilidad & Custodia'}
              </p>
            </div>
          </div>

          {/* Navegación RBAC */}
          <nav className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800/90">
            {itemsVisibles.map((item) => {
              const activo = vistaActiva === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onCambiarVista(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activo
                      ? 'bg-yellow-400 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Rol / Estado */}
          <div className="flex items-center gap-2.5">
            <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              {totalEnCustodia} activos
            </span>

            {rol === 'ESTUDIANTE' ? (
              <button
                onClick={() => setModalLoginAbierto(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-yellow-400 text-zinc-100 hover:text-zinc-950 border border-zinc-700 hover:border-yellow-400 text-xs font-bold transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-yellow-400 group-hover:text-zinc-950" />
                <span className="hidden sm:inline">Acceso Custodia</span>
                <span className="sm:hidden">Admin</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400/15 border border-yellow-400/30 text-xs font-bold text-yellow-400">
                  <UserCheck className="w-3.5 h-3.5" />
                  Admin MFA
                </span>
                <button
                  onClick={cerrarSesionAdmin}
                  title="Volver a vista Estudiante"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal Login Admin */}
      {modalLoginAbierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 max-w-sm w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-400/15 border border-yellow-400/30 text-yellow-400 flex items-center justify-center">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Control de Acceso RBAC</h3>
                  <p className="text-xs text-zinc-400">Módulo exclusivo Vigilancia &amp; TI</p>
                </div>
              </div>
              <button
                onClick={() => setModalLoginAbierto(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={manejarLoginAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Token MFA / PIN Institucional (Demo: <code className="text-yellow-400">1234</code>)
                </label>
                <input
                  type="password"
                  autoFocus
                  value={pinAdmin}
                  onChange={(e) => setPinAdmin(e.target.value)}
                  placeholder="Ingresa 1234"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm font-mono tracking-widest focus:outline-none focus:border-yellow-400"
                />
                {errorPin && (
                  <p className="text-xs text-rose-400 mt-1">Ingresa el PIN institucional (1234).</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-sm font-extrabold shadow-lg shadow-yellow-400/15 cursor-pointer"
              >
                Desbloquear Consola Administrativa
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};