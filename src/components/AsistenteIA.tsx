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

type EstadoUnimi = 'idle' | 'listening' | 'thinking' | 'happy';

const SUGERENCIAS_RAPIDAS = [
  '¿Qué objetos hay en custodia?',
  '¿Cómo reclamo un bien?',
  'Explícame qué es una API REST',
];

const ESTILOS_UNIMI = `
  @keyframes unimiBob {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-3px) rotate(1.5deg); }
  }
  @keyframes unimiListen {
    0%, 100% { transform: translateY(2px) rotate(-5deg); }
    50% { transform: translateY(3px) rotate(-2deg); }
  }
  @keyframes unimiThink {
    0%, 100% { transform: rotate(-9deg) translateY(-1px); }
    50% { transform: rotate(9deg) translateY(-3px); }
  }
  @keyframes unimiHappy {
    0%, 100% { transform: translateY(0px) scale(1); }
    35% { transform: translateY(-6px) scale(1.06); }
    70% { transform: translateY(-1px) scale(0.98); }
  }
  @keyframes earFlapL {
    0%, 100% { transform: rotate(0deg); }
    30% { transform: rotate(12deg); }
    65% { transform: rotate(-5deg); }
  }
  @keyframes earFlapR {
    0%, 100% { transform: rotate(0deg); }
    30% { transform: rotate(-12deg); }
    65% { transform: rotate(5deg); }
  }
  @keyframes tailWag {
    0%, 100% { transform: rotate(-14deg); }
    50% { transform: rotate(22deg); }
  }
  @keyframes tailWagSuper {
    0%, 100% { transform: rotate(-24deg); }
    50% { transform: rotate(30deg); }
  }
  @keyframes blinkEyes {
    0%, 91%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.08); }
  }
  @keyframes tonguePant {
    0%, 100% { transform: translateY(0px) scaleY(1); }
    50% { transform: translateY(1.6px) scaleY(1.18); }
  }

  .unimi-head-idle { transform-origin: 70px 64px; animation: unimiBob 3.1s ease-in-out infinite; }
  .unimi-head-listening { transform-origin: 70px 64px; animation: unimiListen 1.4s ease-in-out infinite; }
  .unimi-head-thinking { transform-origin: 70px 64px; animation: unimiThink 0.9s ease-in-out infinite; }
  .unimi-head-happy { transform-origin: 70px 64px; animation: unimiHappy 0.65s ease-in-out infinite; }

  .unimi-ear-l { transform-origin: 45px 46px; animation: earFlapL 2.7s ease-in-out infinite; }
  .unimi-ear-r { transform-origin: 95px 46px; animation: earFlapR 2.7s ease-in-out infinite; }

  .unimi-tail { transform-origin: 96px 104px; animation: tailWag 1.1s ease-in-out infinite; }
  .unimi-tail-fast { transform-origin: 96px 104px; animation: tailWagSuper 0.35s ease-in-out infinite; }

  .unimi-blink { transform-origin: 70px 56px; animation: blinkEyes 4s infinite; }
  .unimi-tongue { transform-origin: 70px 79px; animation: tonguePant 1.4s ease-in-out infinite; }
`;

/* Perrito caricaturesco sin círculo contenedor para sobresalir sobre el botón flotante */
const PerritoFlotanteUnimi: React.FC<{ className?: string; estado?: EstadoUnimi }> = ({
  className = 'w-20 h-20',
  estado = 'idle',
}) => {
  const claseCabeza =
    estado === 'thinking'
      ? 'unimi-head-thinking'
      : estado === 'happy'
        ? 'unimi-head-happy'
        : estado === 'listening'
          ? 'unimi-head-listening'
          : 'unimi-head-idle';

  return (
    <svg
      viewBox="0 0 140 135"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mascota Unimi IA"
    >
      {/* Sombra suave detrás */}
      <ellipse cx="70" cy="122" rx="42" ry="7" fill="rgba(4, 10, 23, 0.45)" />

      {/* Colita alegre */}
      <path
        className={estado === 'happy' || estado === 'thinking' ? 'unimi-tail-fast' : 'unimi-tail'}
        d="M95 104C112 99 121 86 116 78C111 72 102 82 94 94"
        fill="#D97706"
        stroke="#78350F"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Cuerpo sentado */}
      <path
        d="M44 90C42 78 98 78 96 90L101 118H39L44 90Z"
        fill="#F59E0B"
        stroke="#78350F"
        strokeWidth="3"
      />
      {/* Pecho crema */}
      <ellipse cx="70" cy="103" rx="16" ry="13" fill="#FEF3C7" />

      {/* Pañuelo institucional azul UNIMINUTO */}
      <path
        d="M43 84Q70 94 97 84L92 95L70 105L48 95L43 84Z"
        fill="#1D4ED8"
        stroke="#0F172A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Placa dorada */}
      <circle cx="70" cy="96" r="5.5" fill="#FACC15" stroke="#0F172A" strokeWidth="2" />

      {/* Cabeza y orejas caricaturescas */}
      <g className={claseCabeza}>
        {/* Oreja izquierda caída y esponjosa */}
        <path
          className="unimi-ear-l"
          d="M44 42C29 46 22 66 29 78C34 85 44 80 46 68L49 48L44 42Z"
          fill="#B45309"
          stroke="#78350F"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Oreja derecha caída y esponjosa */}
        <path
          className="unimi-ear-r"
          d="M96 42C111 46 118 66 111 78C106 85 96 80 94 68L91 48L96 42Z"
          fill="#B45309"
          stroke="#78350F"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Cabeza principal */}
        <ellipse
          cx="70"
          cy="58"
          rx="31"
          ry="28"
          fill="#FBBF24"
          stroke="#78350F"
          strokeWidth="3"
        />

        {/* Mechoncito de pelo en la frente */}
        <path
          d="M62 31C65 23 72 23 74 30C77 25 82 27 80 33"
          fill="#FBBF24"
          stroke="#78350F"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hocico */}
        <ellipse cx="70" cy="69" rx="17.5" ry="13" fill="#FEF3C7" />

        {/* Cejas expresivas */}
        <path d="M51 44C55 41 60 41 63 44" stroke="#78350F" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M77 44C80 41 85 41 89 44" stroke="#78350F" strokeWidth="2.8" strokeLinecap="round" />

        {/* Ojos grandes estilo cartoon */}
        <g className="unimi-blink">
          <ellipse cx="57" cy="54" rx="5.5" ry="6.2" fill="#0F172A" />
          <ellipse cx="83" cy="54" rx="5.5" ry="6.2" fill="#0F172A" />
          <circle cx="59" cy="52" r="2" fill="#FFFFFF" />
          <circle cx="85" cy="52" r="2" fill="#FFFFFF" />
          <circle cx="55.5" cy="56" r="1" fill="#FFFFFF" />
          <circle cx="81.5" cy="56" r="1" fill="#FFFFFF" />
        </g>

        {/* Gafas inteligentes sutiles de IA */}
        <rect
          x="47"
          y="46"
          width="20"
          height="15"
          rx="5"
          stroke="#1E3A8A"
          strokeWidth="2.2"
          fill="rgba(56, 189, 248, 0.14)"
        />
        <rect
          x="73"
          y="46"
          width="20"
          height="15"
          rx="5"
          stroke="#1E3A8A"
          strokeWidth="2.2"
          fill="rgba(56, 189, 248, 0.14)"
        />
        <line x1="67" y1="53" x2="73" y2="53" stroke="#1E3A8A" strokeWidth="2.4" />

        {/* Nariz brillante */}
        <ellipse cx="70" cy="65" rx="6.5" ry="4.6" fill="#0F172A" />
        <ellipse cx="68" cy="63.5" rx="2.2" ry="1.2" fill="#94A3B8" />

        {/* Sonrisa y lengüita */}
        <path
          d="M60 73.5C64 78 76 78 80 73.5"
          stroke="#0F172A"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          className="unimi-tongue"
          d="M66 76.5C66 82.5 74 82.5 74 76.5"
          fill="#FB7185"
          stroke="#BE123C"
          strokeWidth="1.5"
        />
      </g>

      {/* Patitas apoyadas adelante sobre el borde del botón */}
      <ellipse
        cx="52"
        cy="118"
        rx="10.5"
        ry="7"
        fill="#FBBF24"
        stroke="#78350F"
        strokeWidth="3"
      />
      <path d="M49 116V121M55 116V121" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />

      <ellipse
        cx="88"
        cy="118"
        rx="10.5"
        ry="7"
        fill="#FBBF24"
        stroke="#78350F"
        strokeWidth="3"
      />
      <path d="M85 116V121M91 116V121" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

/* Avatar circular compacto para cabecera y mensajes dentro del chat */
const AvatarChatUnimi: React.FC<{ className?: string; estado?: EstadoUnimi }> = ({
  className = 'w-10 h-10',
  estado = 'idle',
}) => (
  <div
    className={`${className} rounded-full bg-[#0E1E38] border-2 border-yellow-400 flex items-center justify-center overflow-hidden shrink-0`}
  >
    <PerritoFlotanteUnimi className="w-full h-full scale-110 translate-y-0.5" estado={estado} />
  </div>
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
  const [celebrando, setCelebrando] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([MENSAJE_INICIAL]);

  const finChatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    finChatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, abierto, cargando]);

  const activarSaludoBreve = () => {
    setCelebrando(true);
    setTimeout(() => setCelebrando(false), 2000);
  };

  const estadoUnimi: EstadoUnimi = cargando
    ? 'thinking'
    : celebrando
      ? 'happy'
      : input.trim().length > 0
        ? 'listening'
        : 'idle';

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
      activarSaludoBreve();
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
    activarSaludoBreve();
  };

  return (
    <>
      <style>{ESTILOS_UNIMI}</style>

      {/* Botón flotante con perrito sobresaliendo por encima */}
      {!abierto && (
        <button
          onClick={() => {
            setAbierto(true);
            activarSaludoBreve();
          }}
          title="Pregúntale a Unimi IA"
          className="fixed bottom-[calc(1.15rem+env(safe-area-inset-bottom))] right-4 sm:right-5 z-40 group flex items-center cursor-pointer transition-transform hover:scale-105"
        >
          {/* Mascota sobresaliendo a la izquierda y arriba */}
          <div className="relative z-10 -mr-5 -mt-6 pointer-events-none drop-shadow-[0_8px_14px_rgba(0,0,0,0.65)]">
            <PerritoFlotanteUnimi className="w-[74px] h-[74px] sm:w-[82px] sm:h-[82px]" estado="idle" />
          </div>

          {/* Píldora amarilla con patitas apoyadas */}
          <div className="pl-7 pr-4 py-2.5 rounded-2xl bg-yellow-400 group-hover:bg-yellow-300 text-zinc-950 shadow-2xl shadow-black/70 border-2 border-zinc-950 text-left leading-tight">
            <span className="block font-black text-xs sm:text-sm tracking-tight">
              Pregúntale a Unimi
            </span>
            <span className="block text-[10px] sm:text-[11px] font-bold text-zinc-900/80">
              Asistente inteligente
            </span>
          </div>
        </button>
      )}

      {abierto && (
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-3 left-3 sm:left-auto sm:right-5 sm:w-[430px] z-50 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[82vh]">
          {/* Cabecera interactiva */}
          <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-2">
            <div
              onClick={() => !cargando && activarSaludoBreve()}
              title="¡Haz clic para saludar a Unimi!"
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
            >
              <AvatarChatUnimi
                className="w-11 h-11 transition-transform group-hover:scale-105"
                estado={estadoUnimi}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-zinc-100 truncate">Unimi</h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                    <Sparkles className="w-2.5 h-2.5" /> Gemini IA
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  {cargando
                    ? 'Rastreando inventario y alertas...'
                    : input.trim()
                      ? 'Escuchando tu consulta...'
                      : 'Asistente FindCampus • En línea'}
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
          <div className="p-4 space-y-3.5 overflow-y-auto flex-1 min-h-[260px] max-h-[54vh]">
            {mensajes.map((msg, idx) => {
              const esUltimoMensajeUnimi =
                msg.autor === 'unimi' && idx === mensajes.length - 1 && !cargando;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    msg.autor === 'usuario' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.autor === 'unimi' && (
                    <AvatarChatUnimi
                      className="w-8 h-8 mb-0.5"
                      estado={esUltimoMensajeUnimi ? estadoUnimi : 'idle'}
                    />
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                      msg.autor === 'usuario'
                        ? 'bg-yellow-400 text-zinc-950 font-semibold rounded-br-sm'
                        : 'bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.autor === 'unimi' ? formatearTextoSimple(msg.texto) : msg.texto}
                  </div>
                </div>
              );
            })}

            {mensajes.length === 1 && !cargando && (
              <div className="pt-1 pl-10 flex flex-wrap gap-1.5">
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
              <div className="flex items-end gap-2 justify-start">
                <AvatarChatUnimi className="w-8 h-8 mb-0.5" estado="thinking" />
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs text-zinc-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" />
                  Unimi está revisando la base de datos...
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