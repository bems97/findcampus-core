import React, { useState } from 'react';
import {
  GraduationCap,
  Search,
  Database,
  BarChart3,
  Terminal,
  Users,
  UserCheck,
  LogOut,
  UserCircle2,
} from 'lucide-react';
import { AuthModal, type UsuarioSesion } from './AuthModal';

export type VistaActiva = 'CATALOGO' | 'CUSTODIA' | 'USUARIOS' | 'DATALAKE' | 'API';
export type RolUsuario = 'ESTUDIANTE' | 'ADMIN';

interface NavbarProps {
  vistaActiva: VistaActiva;
  onCambiarVista: (vista: VistaActiva) => void;
  usuario: UsuarioSesion | null;
  onIniciarSesion: (usuario: UsuarioSesion) => void;
  onCerrarSesion: () => void;
  totalEnCustodia: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  vistaActiva,
  onCambiarVista,
  usuario,
  onIniciarSesion,
  onCerrarSesion,
  totalEnCustodia,
}) => {
  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);

  const rol: RolUsuario = usuario?.rol ?? 'ESTUDIANTE';

  const navItems: {
    id: VistaActiva;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    soloAdmin: boolean;
  }[] = [
    {
      id: 'CATALOGO',
      label: 'Explorar Objetos',
      shortLabel: 'Explorar',
      icon: <Search className="w-4 h-4 shrink-0" />,
      soloAdmin: false,
    },
    {
      id: 'CUSTODIA',
      label: 'Gestión de Custodia',
      shortLabel: 'Custodia',
      icon: <Database className="w-4 h-4 shrink-0" />,
      soloAdmin: true,
    },
    {
      id: 'USUARIOS',
      label: 'Usuarios',
      shortLabel: 'Usuarios',
      icon: <Users className="w-4 h-4 shrink-0" />,
      soloAdmin: true,
    },
    {
      id: 'DATALAKE',
      label: 'Analítica BI',
      shortLabel: 'Analítica',
      icon: <BarChart3 className="w-4 h-4 shrink-0" />,
      soloAdmin: true,
    },
    {
      id: 'API',
      label: 'Contratos API',
      shortLabel: 'API',
      icon: <Terminal className="w-4 h-4 shrink-0" />,
      soloAdmin: true,
    },
  ];

  const itemsVisibles = navItems.filter((item) => !item.soloAdmin || rol === 'ADMIN');

  const manejarClickNav = (id: VistaActiva) => {
    onCambiarVista(id);
    if (id === 'CATALOGO') {
      setTimeout(() => {
        const buscador = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Buscar por marca"]'
        );
        if (buscador) {
          buscador.scrollIntoView({ behavior: 'smooth', block: 'center' });
          buscador.focus();
        }
      }, 80);
    }
  };

  return (
    <>
      <header className="sticky top-2 sm:top-3 z-30 max-w-7xl w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] mx-auto rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 shadow-2xl shadow-[#040a17]/70">
        <div className="px-3 sm:px-6 py-2.5 sm:py-0 sm:h-16 flex flex-wrap md:flex-nowrap items-center justify-between gap-2.5 sm:gap-4">
          {/* Marca Institucional */}
          <div
            onClick={() => onCambiarVista('CATALOGO')}
            className="flex items-center gap-2.5 cursor-pointer group min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-zinc-950 shadow-md shadow-yellow-400/20 shrink-0 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.3]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-zinc-100 tracking-tight text-base sm:text-lg truncate">
                  FindCampus<span className="text-yellow-400">.core</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                  UNIMINUTO
                </span>
              </div>
              <p className="text-[11px] text-zinc-300/80 hidden lg:block">
                {rol === 'ADMIN'
                  ? 'Consola de Vigilancia & Custodia Institucional'
                  : 'Portal Institucional de Objetos Perdidos'}
              </p>
            </div>
          </div>

          {/* Botones de Cuenta / Sesión */}
          <div className="flex items-center gap-2 md:order-3 shrink-0">
            <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              {totalEnCustodia} en custodia
            </span>

            {!usuario ? (
              <button
                onClick={() => setModalAuthAbierto(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-yellow-400 text-zinc-100 hover:text-zinc-950 border border-zinc-700 hover:border-yellow-400 text-xs font-bold transition-all cursor-pointer"
              >
                <UserCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                <span className="hidden sm:inline">Ingresar / Registro</span>
                <span className="sm:hidden">Cuenta</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold ${
                    usuario.rol === 'ADMIN'
                      ? 'bg-yellow-400/15 border-yellow-400/30 text-yellow-400'
                      : 'bg-zinc-950 border-zinc-700 text-zinc-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span>{usuario.nombre.split(' ')[0]}</span>
                  <span className="hidden sm:inline">({usuario.rol})</span>
                </span>
                <button
                  onClick={onCerrarSesion}
                  title="Cerrar sesión"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            )}
          </div>

          {/* Navegación */}
          <nav className="w-full md:w-auto md:order-2 flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/90 overflow-x-auto">
            {itemsVisibles.map((item) => {
              const activo = vistaActiva === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => manejarClickNav(item.id)}
                  className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activo
                      ? 'bg-yellow-400 text-zinc-950 shadow-sm'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <AuthModal
        abierto={modalAuthAbierto}
        onCerrar={() => setModalAuthAbierto(false)}
        onAutenticado={(nuevoUsuario) => {
          onIniciarSesion(nuevoUsuario);
          if (nuevoUsuario.rol === 'ADMIN') {
            onCambiarVista('CUSTODIA');
          }
        }}
      />
    </>
  );
};