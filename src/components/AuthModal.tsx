import { useState } from 'react';
import { ShieldCheck, UserPlus, LogIn, X, KeyRound, Mail, User, Hash } from 'lucide-react';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  codigo_institucional: string;
  rol: 'ESTUDIANTE' | 'ADMIN';
}

interface AuthModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onAutenticado: (usuario: UsuarioSesion) => void;
}

export function AuthModal({ abierto, onCerrar, onAutenticado }: AuthModalProps) {
  const [modo, setModo] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'ESTUDIANTE' | 'ADMIN'>('ESTUDIANTE');
  const [claveAdmin, setClaveAdmin] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  if (!abierto) return null;

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const payload =
        modo === 'LOGIN'
          ? { accion: 'LOGIN', correo, password }
          : {
              accion: 'REGISTER',
              nombre,
              correo,
              codigo_institucional: codigo,
              password,
              rol,
              clave_admin: claveAdmin,
            };

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo completar la autenticación.');
      } else {
        onAutenticado(data);
        onCerrar();
        setPassword('');
        setClaveAdmin('');
      }
    } catch {
      setError('No fue posible conectar con el servidor. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
<div className="w-[calc(100vw-1.5rem)] max-w-md mx-auto my-auto bg-zinc-950 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-zinc-900/90 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="font-bold text-zinc-100 text-xs sm:text-sm tracking-wide truncate">
              PORTAL DE ACCESO INSTITUCIONAL
            </h2>
          </div>
          <button
            onClick={onCerrar}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector Login / Registro */}
        <div className="grid grid-cols-2 border-b border-zinc-800 bg-zinc-900/40 shrink-0">
          <button
            type="button"
            onClick={() => {
              setModo('LOGIN');
              setError('');
            }}
            className={`py-2.5 sm:py-3 text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer ${
              modo === 'LOGIN'
                ? 'bg-amber-400 text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LogIn className="w-4 h-4 shrink-0" />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setModo('REGISTER');
              setError('');
            }}
            className={`py-2.5 sm:py-3 text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer ${
              modo === 'REGISTER'
                ? 'bg-amber-400 text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>Registrarse</span>
          </button>
        </div>

        {/* Formulario con scroll interno en pantallas pequeñas */}
        <form onSubmit={manejarSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-xs text-red-300">
              {error}
            </div>
          )}

          {modo === 'REGISTER' && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nombre Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Brayan Morales"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">ID Institucional</label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. 474909"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Perfil</label>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value as 'ESTUDIANTE' | 'ADMIN')}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="ESTUDIANTE">Estudiante</option>
                    <option value="ADMIN">Vigilancia / Custodia</option>
                  </select>
                </div>
              </div>

              {rol === 'ADMIN' && (
                <div>
                  <label className="block text-xs text-amber-400 mb-1">
                    Código de Autorización de Seguridad
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Ingresa el código institucional"
                    value={claveAdmin}
                    onChange={(e) => setClaveAdmin(e.target.value)}
                    className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Correo Institucional</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="usuario@uniminuto.edu.co"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Contraseña</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cargando
              ? 'Validando credenciales...'
              : modo === 'LOGIN'
              ? 'Ingresar al Sistema'
              : 'Crear Cuenta Institucional'}
          </button>
        </form>
      </div>
    </div>
  );
}