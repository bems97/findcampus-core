import { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  LogIn,
  X,
  KeyRound,
  Mail,
  User,
  Hash,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

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
  const [modo, setModo] = useState<'LOGIN' | 'REGISTER' | 'RECOVER_EMAIL' | 'RECOVER_OTP'>('LOGIN');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'ESTUDIANTE' | 'ADMIN'>('ESTUDIANTE');
  const [claveAdmin, setClaveAdmin] = useState('');

  // Estados para recuperación OTP
  const [otp, setOtp] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  if (!abierto) return null;

  const limpiarMensajes = () => {
    setError('');
    setMensajeExito('');
  };

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    limpiarMensajes();
    setCargando(true);

    try {
      // Flujo 1: Solicitar código OTP al correo
      if (modo === 'RECOVER_EMAIL') {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'REQUEST_OTP', correo }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'No se pudo enviar el código de verificación.');
        } else {
          setMensajeExito(
            data.mensaje || 'Enviamos un código de 6 dígitos a tu correo.'
          );
          setModo('RECOVER_OTP');
        }
        return;
      }

      // Flujo 2: Validar OTP y guardar nueva contraseña
      if (modo === 'RECOVER_OTP') {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accion: 'RESET_PASSWORD',
            correo,
            otp,
            nueva_password: nuevaPassword,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'No se pudo restablecer la contraseña.');
        } else {
          setMensajeExito(
            data.mensaje || 'Contraseña actualizada. Ya puedes iniciar sesión.'
          );
          setOtp('');
          setNuevaPassword('');
          setPassword('');
          setModo('LOGIN');
        }
        return;
      }

      // Flujo 3: Login o Registro normal
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

  const esRecuperacion = modo === 'RECOVER_EMAIL' || modo === 'RECOVER_OTP';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-[calc(100vw-1.5rem)] max-w-md mx-auto my-auto bg-zinc-950 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-zinc-900/90 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="font-bold text-zinc-100 text-xs sm:text-sm tracking-wide truncate">
              {esRecuperacion
                ? 'RECUPERACIÓN DE ACCESO • OTP'
                : 'PORTAL DE ACCESO INSTITUCIONAL'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector Login / Registro (oculto en modo recuperación) */}
        {!esRecuperacion && (
          <div className="grid grid-cols-2 border-b border-zinc-800 bg-zinc-900/40 shrink-0">
            <button
              type="button"
              onClick={() => {
                setModo('LOGIN');
                limpiarMensajes();
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
                limpiarMensajes();
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
        )}

        {/* Formulario con scroll interno en pantallas pequeñas */}
        <form
          onSubmit={manejarSubmit}
          className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto"
        >
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-xs text-red-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mensajeExito && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{mensajeExito}</span>
            </div>
          )}

          {/* MODO RECUPERACIÓN - PASO 1: PEDIR CORREO */}
          {modo === 'RECOVER_EMAIL' && (
            <>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Ingresa el correo institucional o personal con el que creaste tu cuenta. Te
                enviaremos un código de seguridad de <strong>6 dígitos</strong> válido por 10
                minutos.
              </p>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Correo Registrado</label>
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

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cargando ? 'Enviando código OTP...' : 'Enviar Código de Verificación'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setModo('LOGIN');
                  limpiarMensajes();
                }}
                className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Iniciar Sesión</span>
              </button>
            </>
          )}

          {/* MODO RECUPERACIÓN - PASO 2: VALIDAR OTP Y NUEVA CONTRASEÑA */}
          {modo === 'RECOVER_OTP' && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Código OTP de 6 dígitos (revisa tu correo)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-3 py-2.5 text-center text-lg font-mono font-bold tracking-[0.4em] text-amber-400 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nueva Contraseña</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cargando ? 'Verificando código...' : 'Restablecer Contraseña'}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setModo('RECOVER_EMAIL');
                    limpiarMensajes();
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  Reenviar código
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModo('LOGIN');
                    limpiarMensajes();
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}

          {/* MODO LOGIN / REGISTER */}
          {!esRecuperacion && (
            <>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-zinc-400">Contraseña</label>
                  {modo === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setModo('RECOVER_EMAIL');
                        limpiarMensajes();
                      }}
                      className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
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
            </>
          )}
        </form>
      </div>
    </div>
  );
}