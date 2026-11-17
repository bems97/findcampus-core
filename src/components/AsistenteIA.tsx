import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import type { ObjetoCustodia } from '../types/campus';

interface AsistenteIAProps {
  objetos: ObjetoCustodia[];
}

interface MensajeChat {
  id: string;
  autor: 'unimi' | 'usuario';
  texto: string;
}

const AvatarUnimi: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Unimi perro guía"
  >
    {/* Fondo circular azul institucional */}
    <circle cx="60" cy="60" r="56" fill="#0E1E38" stroke="#FACC15" strokeWidth="5" />
    {/* Orejas caídas de labrador */}
    <path
      d="M28 48C20 53 18 70 25 78C30 83 37 78 39 68L41 52L28 48Z"
      fill="#D97706"
    />
    <path
      d="M92 48C100 53 102 70 95 78C90 83 83 78 81 68L79 52L92 48Z"
      fill="#D97706"
    />
    {/* Pañuelo institucional azul cobalto y placa amarilla */}
    <path d="M35 86C44 96 76 96 85 86L79 102H41L35 86Z" fill="#1D4ED8" />
    <circle cx="60" cy="95" r="5.5" fill="#FACC15" />
    {/* Cabeza del labrador */}
    <ellipse cx="60" cy="62" rx="28" ry="27" fill="#FBBF24" />
    {/* Hocico crema */}
    <ellipse cx="60" cy="71" rx="15" ry="12" fill="#FEF3C7" />
    {/* Ojos expresivos */}
    <circle cx="48" cy="56" r="4.2" fill="#081326" />
    <circle cx="72" cy="56" r="4.2" fill="#081326" />
    <circle cx="49.3" cy="54.7" r="1.4" fill="#FFFFFF" />
    <circle cx="73.3" cy="54.7" r="1.4" fill="#FFFFFF" />
    {/* Cejas simpáticas */}
    <path d="M43 49C46 47 50 47 52 49" stroke="#B45309" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M68 49C70 47 74 47 77 49" stroke="#B45309" strokeWidth="2.4" strokeLinecap="round" />
    {/* Nariz */}
    <ellipse cx="60" cy="66.5" rx="5.5" ry="4" fill="#081326" />
    <ellipse cx="58.5" cy="65.3" rx="1.8" ry="1" fill="#64748B" />
    {/* Sonrisa y lengüita */}
    <path
      d="M52 74C55 77.5 65 77.5 68 74"
      stroke="#081326"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path d="M57 76.5C57 80.5 63 80.5 63 76.5" fill="#FB7185" />
  </svg>
);

export const AsistenteIA: React.FC<AsistenteIAProps> = () => {
  const [abierto, setAbierto] = useState(false);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: 'bienvenida',
      autor: 'unimi',
      texto:
        '¡Hola! Soy Unimi, tu perrito guía en FindCampus. Cuéntame qué objeto perdiste (por ejemplo: "portátil Lenovo negro" o "carné en Biblioteca") y revisaré si ya está en custodia.',
    },
  ]);

  const finChatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    finChatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, abierto]);

  const enviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    const texto = input.trim();
    if (!texto || cargando) return;

    const nuevoMsgUsuario: MensajeChat = {
      id: `u-${Date.now()}`,
      autor: 'usuario',
      texto,
    };

    const historialParaApi = mensajes.slice(1).map((m) => ({
      rol: m.autor === 'usuario' ? ('user' as const) : ('model' as const),
      texto: m.texto,
    }));

    setMensajes((prev) => [...prev, nuevoMsgUsuario]);
    setInput('');
    setCargando(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: texto,
          historial: historialParaApi,
        }),
      });

      const data = await res.json();
      setMensajes((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          autor: 'unimi',
          texto:
            data.respuesta ||
            'No logré consultar el inventario en este momento. Intenta de nuevo por favor.',
        },
      ]);
    } catch {
      setMensajes((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          autor: 'unimi',
          texto: 'Parece que hubo un problema de conexión. Inténtalo nuevamente en un momento.',
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      {/* Botón flotante con Unimi */}
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          title="Hablar con Unimi"
          className="fixed bottom-5 right-5 z-40 group flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-extrabold text-xs sm:text-sm shadow-2xl shadow-black/60 border-2 border-zinc-900 transition-transform hover:scale-105 cursor-pointer"
        >
          <AvatarUnimi className="w-10 h-10 shrink-0" />
          <div className="text-left leading-tight">
            <span className="block font-extrabold">Unimi</span>
            <span className="block text-[10px] font-semibold text-zinc-900/80">
              Guía de búsqueda
            </span>
          </div>
        </button>
      )}

      {/* Ventana de chat */}
      {abierto && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[80vh]">
          {/* Cabecera */}
          <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <AvatarUnimi className="w-10 h-10 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-zinc-100 truncate">Unimi</h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                    <Sparkles className="w-2.5 h-2.5" /> IA
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  Asistente Virtual UNIMINUTO
                </p>
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              aria-label="Cerrar asistente Unimi"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-[240px] max-h-[52vh]">
            {mensajes.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.autor === 'usuario' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    msg.autor === 'usuario'
                      ? 'bg-yellow-400 text-zinc-950 font-semibold rounded-br-sm'
                      : 'bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-bl-sm'
                  }`}
                >
                  {msg.texto}
                </div>
              </div>
            ))}

            {cargando && (
              <div className="flex justify-start">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs text-zinc-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" />
                  Unimi está rastreando en custodia...
                </div>
              </div>
            )}
            <div ref={finChatRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={enviarMensaje}
            className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej: Perdí mis audífonos Sony..."
              className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-yellow-400 rounded-xl px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || cargando}
              className="p-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-zinc-950 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};