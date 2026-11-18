import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, RotateCcw } from 'lucide-react';
import type { ObjetoCustodia } from '../types/campus';

interface AsistenteIAProps {
  objetos: ObjetoCustodia[];
}

interface MensajeChat {
  id: string;
  autor: 'unimi' | 'usuario';
  texto: string;
}

const SUGERENCIAS_RAPIDAS = [
  '¿Qué objetos hay en custodia?',
  '¿Cómo reclamo un bien?',
  'Explícame qué es una API REST',
];

const AvatarUnimi: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Unimi asistente IA"
  >
    <circle cx="60" cy="60" r="56" fill="#0E1E38" stroke="#FACC15" strokeWidth="5" />
    <path
      d="M28 48C20 53 18 70 25 78C30 83 37 78 39 68L41 52L28 48Z"
      fill="#D97706"
    />
    <path
      d="M92 48C100 53 102 70 95 78C90 83 83 78 81 68L79 52L92 48Z"
      fill="#D97706"
    />
    <path d="M35 86C44 96 76 96 85 86L79 102H41L35 86Z" fill="#1D4ED8" />
    <circle cx="60" cy="95" r="5.5" fill="#FACC15" />
    <ellipse cx="60" cy="62" rx="28" ry="27" fill="#FBBF24" />
    <ellipse cx="60" cy="71" rx="15" ry="12" fill="#FEF3C7" />
    <circle cx="48" cy="56" r="4.2" fill="#081326" />
    <circle cx="72" cy="56" r="4.2" fill="#081326" />
    <circle cx="49.3" cy="54.7" r="1.4" fill="#FFFFFF" />
    <circle cx="73.3" cy="54.7" r="1.4" fill="#FFFFFF" />
    <path d="M43 49C46 47 50 47 52 49" stroke="#B45309" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M68 49C70 47 74 47 77 49" stroke="#B45309" strokeWidth="2.4" strokeLinecap="round" />
    <ellipse cx="60" cy="66.5" rx="5.5" ry="4" fill="#081326" />
    <ellipse cx="58.5" cy="65.3" rx="1.8" ry="1" fill="#64748B" />
    <path
      d="M52 74C55 77.5 65 77.5 68 74"
      stroke="#081326"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path d="M57 76.5C57 80.5 63 80.5 63 76.5" fill="#FB7185" />
  </svg>
);

const MENSAJE_INICIAL: MensajeChat = {
  id: 'bienvenida',
  autor: 'unimi',
  texto:
    '¡Hola! Soy Unimi, tu asistente IA en FindCampus.\n\nPuedo ayudarte a buscar objetos en custodia en tiempo real, guiarte con reportes y reclamos, o responder cualquier duda académica, técnica o general que tengas.',
};

function formatearTextoSimple(texto: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-yellow-300">
          {parte.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{parte}</React.Fragment>;
  });
}

export const AsistenteIA: React.FC<AsistenteIAProps> = () => {
  const [abierto, setAbierto] = useState(false);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([MENSAJE_INICIAL]);

  const finChatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    finChatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, abierto, cargando]);

  const procesarEnvio = async (textoConsulta: string) => {
    const texto = textoConsulta.trim();
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
            'No logré procesar tu consulta en este momento. Intenta de nuevo por favor.',
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

  const enviarMensaje = (e: React.FormEvent) => {
    e.preventDefault();
    procesarEnvio(input);
  };

  const reiniciarChat = () => {
    if (cargando) return;
    setMensajes([MENSAJE_INICIAL]);
  };

  return (
    <>
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          title="Hablar con Unimi IA"
          className="fixed bottom-5 right-5 z-40 group flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-extrabold text-xs sm:text-sm shadow-2xl shadow-black/60 border-2 border-zinc-900 transition-transform hover:scale-105 cursor-pointer"
        >
          <AvatarUnimi className="w-10 h-10 shrink-0" />
          <div className="text-left leading-tight">
            <span className="block font-extrabold">Unimi IA</span>
            <span className="block text-[10px] font-semibold text-zinc-900/80">
              Asistente inteligente
            </span>
          </div>
        </button>
      )}

      {abierto && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[420px] z-50 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[82vh]">
          {/* Cabecera */}
          <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <AvatarUnimi className="w-10 h-10 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-zinc-100 truncate">Unimi</h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                    <Sparkles className="w-2.5 h-2.5" /> Gemini IA
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  Asistente FindCampus &amp; Consultas Generales
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={reiniciarChat}
                title="Nueva conversación"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar asistente Unimi"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-[260px] max-h-[54vh]">
            {mensajes.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.autor === 'usuario' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    msg.autor === 'usuario'
                      ? 'bg-yellow-400 text-zinc-950 font-semibold rounded-br-sm'
                      : 'bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-bl-sm'
                  }`}
                >
                  {msg.autor === 'unimi' ? formatearTextoSimple(msg.texto) : msg.texto}
                </div>
              </div>
            ))}

            {mensajes.length === 1 && !cargando && (
              <div className="pt-1 flex flex-wrap gap-1.5">
                {SUGERENCIAS_RAPIDAS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => procesarEnvio(sug)}
                    className="text-[11px] px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-yellow-300 border border-zinc-800 transition-colors cursor-pointer text-left"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {cargando && (
              <div className="flex justify-start">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs text-zinc-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" />
                  Unimi está pensando...
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
              placeholder="Pregúntame cualquier cosa o busca un objeto..."
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