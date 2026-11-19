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
  @keyframes unimiFloat {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-3px) rotate(2deg); }
  }
  @keyframes unimiListen {
    0%, 100% { transform: translateY(1.5px) rotate(-4deg); }
    50% { transform: translateY(2.5px) rotate(-2deg); }
  }
  @keyframes unimiThink {
    0%, 100% { transform: rotate(-9deg) translateY(-1.5px); }
    50% { transform: rotate(9deg) translateY(-2.5px); }
  }
  @keyframes unimiHappy {
    0%, 100% { transform: translateY(0px) scale(1); }
    30% { transform: translateY(-5px) scale(1.07); }
    65% { transform: translateY(-1px) scale(0.97); }
  }
  @keyframes earLeft {
    0%, 100% { transform: rotate(0deg); }
    30% { transform: rotate(11deg); }
    65% { transform: rotate(-5deg); }
  }
  @keyframes earRight {
    0%, 100% { transform: rotate(0deg); }
    30% { transform: rotate(-11deg); }
    65% { transform: rotate(5deg); }
  }
  @keyframes earAlert {
    0%, 100% { transform: rotate(-14deg) translateY(-2px); }
    50% { transform: rotate(-10deg) translateY(-3px); }
  }
  @keyframes tailWagSlow {
    0%, 100% { transform: rotate(-10deg); }
    50% { transform: rotate(18deg); }
  }
  @keyframes tailWagFast {
    0%, 100% { transform: rotate(-22deg); }
    50% { transform: rotate(28deg); }
  }
  @keyframes pawWave {
    0%, 100% { transform: rotate(0deg) translateY(0px); }
    25% { transform: rotate(-18deg) translateY(-4px); }
    50% { transform: rotate(8deg) translateY(-2px); }
    75% { transform: rotate(-15deg) translateY(-4px); }
  }
  @keyframes unimiBlink {
    0%, 91%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.08); }
  }
  @keyframes unimiTongue {
    0%, 100% { transform: translateY(0px) scaleY(1); }
    50% { transform: translateY(1.5px) scaleY(1.16); }
  }
  @keyframes searchOrbit {
    0% { transform: rotate(0deg) translateX(3px) rotate(0deg); }
    100% { transform: rotate(360deg) translateX(3px) rotate(-360deg); }
  }

  .unimi-head-idle { transform-origin: 60px 60px; animation: unimiFloat 3s ease-in-out infinite; }
  .unimi-head-listening { transform-origin: 60px 60px; animation: unimiListen 1.4s ease-in-out infinite; }
  .unimi-head-thinking { transform-origin: 60px 60px; animation: unimiThink 0.95s ease-in-out infinite; }
  .unimi-head-happy { transform-origin: 60px 60px; animation: unimiHappy 0.65s ease-in-out infinite; }

  .unimi-ear-left { transform-origin: 39px 46px; animation: earLeft 2.6s ease-in-out infinite; }
  .unimi-ear-right { transform-origin: 81px 46px; animation: earRight 2.6s ease-in-out infinite; }
  .unimi-ear-alert { transform-origin: 39px 46px; animation: earAlert 0.9s ease-in-out infinite; }

  .unimi-tail-slow { transform-origin: 82px 92px; animation: tailWagSlow 1.1s ease-in-out infinite; }
  .unimi-tail-fast { transform-origin: 82px 92px; animation: tailWagFast 0.35s ease-in-out infinite; }
  .unimi-paw-wave { transform-origin: 43px 94px; animation: pawWave 0.8s ease-in-out infinite; }

  .unimi-eyes { transform-origin: 60px 52px; animation: unimiBlink 4s infinite; }
  .unimi-tongue { transform-origin: 60px 71px; animation: unimiTongue 1.4s ease-in-out infinite; }
  .unimi-magnifier { transform-origin: 88px 72px; animation: searchOrbit 1.8s linear infinite; }
`;

const MascotaUnimi: React.FC<{ className?: string; estado?: EstadoUnimi }> = ({
  className = 'w-11 h-11',
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

  const claseCola =
    estado === 'happy' || estado === 'thinking' ? 'unimi-tail-fast' : 'unimi-tail-slow';

  const offsetOjosY = estado === 'listening' ? 2.2 : 0;

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mascota Unimi IA"
    >
      {/* Fondo circular institucional */}
      <circle cx="60" cy="60" r="56" fill="#0E1E38" stroke="#FACC15" strokeWidth="4.5" />

      {/* Colita animada */}
      <path
        className={claseCola}
        d="M80 92C92 88 99 77 95 70C91 65 84 74 79 84"
        fill="#D97706"
        stroke="#B45309"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Cuerpito / Chaleco institucional UNIMINUTO */}
      <path d="M36 82C36 74 84 74 84 82L80 104H40L36 82Z" fill="#1D4ED8" />
      {/* Collar dorado y placa */}
      <path d="M41 79Q60 85 79 79" stroke="#FACC15" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="86" r="5" fill="#FACC15" stroke="#0E1E38" strokeWidth="1.5" />

      {/* Patitas delanteras */}
      <ellipse
        className={estado === 'happy' ? 'unimi-paw-wave' : ''}
        cx="45"
        cy="101"
        rx="7.5"
        ry="5.5"
        fill="#FBBF24"
        stroke="#B45309"
        strokeWidth="1.5"
      />
      <ellipse
        cx="75"
        cy="101"
        rx="7.5"
        ry="5.5"
        fill="#FBBF24"
        stroke="#B45309"
        strokeWidth="1.5"
      />

      {/* Cabeza y orejas */}
      <g className={claseCabeza}>
        {/* Oreja izquierda */}
        <path
          className={estado === 'listening' ? 'unimi-ear-alert' : 'unimi-ear-left'}
          d="M28 43C19 48 17 65 24 73C29 78 37 73 39 63L41 47L28 43Z"
          fill="#D97706"
        />
        {/* Oreja derecha */}
        <path
          className="unimi-ear-right"
          d="M92 43C101 48 103 65 96 73C91 78 83 73 81 63L79 47L92 43Z"
          fill="#D97706"
        />

        {/* Rostro */}
        <ellipse cx="60" cy="56" rx="27" ry="25" fill="#FBBF24" />
        {/* Hocico */}
        <ellipse cx="60" cy="65" rx="14.5" ry="11" fill="#FEF3C7" />

        {/* Ojos expresivos */}
        <g className="unimi-eyes" transform={`translate(0, ${offsetOjosY})`}>
          {estado === 'happy' ? (
            <>
              <path
                d="M44 52Q48 47 52 52"
                stroke="#081326"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M68 52Q72 47 76 52"
                stroke="#081326"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              <circle cx="48" cy="51" r="4.2" fill="#081326" />
              <circle cx="72" cy="51" r="4.2" fill="#081326" />
              <circle cx="49.3" cy="49.7" r="1.4" fill="#FFFFFF" />
              <circle cx="73.3" cy="49.7" r="1.4" fill="#FFFFFF" />
            </>
          )}
        </g>

        {/* Cejas */}
        <path
          d={estado === 'thinking' ? 'M43 42C46 40 50 41 52 43' : 'M43 44C46 42 50 42 52 44'}
          stroke="#B45309"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d={estado === 'thinking' ? 'M68 45C70 43 74 42 77 44' : 'M68 44C70 42 74 42 77 44'}
          stroke="#B45309"
          strokeWidth="2.3"
          strokeLinecap="round"
        />

        {/* Nariz */}
        <ellipse cx="60" cy="61" rx="5.2" ry="3.8" fill="#081326" />
        <ellipse cx="58.5" cy="59.8" rx="1.7" ry="1" fill="#64748B" />

        {/* Boca y lengüita */}
        <path
          d="M52 68.5C55 72 65 72 68 68.5"
          stroke="#081326"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          className="unimi-tongue"
          d="M57 70.8C57 75.5 63 75.5 63 70.8"
          fill="#FB7185"
        />
      </g>

      {/* Lupa animada cuando está buscando en MongoDB / Gemini */}
      {estado === 'thinking' && (
        <g className="unimi-magnifier">
          <circle cx="88" cy="70" r="10" fill="#0E1E38" stroke="#38BDF8" strokeWidth="3" />
          <line
            x1="95"
            y1="77"
            x2="103"
            y2="85"
            stroke="#FACC15"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
};

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

  const acariciarUnimi = () => {
    if (cargando) return;
    activarSaludoBreve();
  };

  return (
    <>
      <style>{ESTILOS_UNIMI}</style>

      {!abierto && (
        <button
          onClick={() => {
            setAbierto(true);
            activarSaludoBreve();
          }}
          title="Hablar con Unimi IA"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 sm:right-5 z-40 group flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-extrabold text-xs sm:text-sm shadow-2xl shadow-black/60 border-2 border-zinc-900 transition-transform hover:scale-105 cursor-pointer"
        >
          <MascotaUnimi className="w-11 h-11 shrink-0" estado="idle" />
          <div className="text-left leading-tight">
            <span className="block font-extrabold">Unimi IA</span>
            <span className="block text-[10px] font-semibold text-zinc-900/80">
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
              onClick={acariciarUnimi}
              title="¡Haz clic para saludar a Unimi!"
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
            >
              <MascotaUnimi
                className="w-12 h-12 shrink-0 transition-transform group-hover:scale-105"
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
                    ? 'Buscando en inventario y alertas...'
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

          {/* Mensajes con avatar animado de Unimi en cada respuesta */}
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
                    <MascotaUnimi
                      className="w-8 h-8 shrink-0 mb-0.5"
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
                <MascotaUnimi className="w-8 h-8 shrink-0 mb-0.5" estado="thinking" />
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