import React, { useState } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import type { ObjetoCustodia } from '../types/campus';

interface AsistenteIAProps {
  objetos: ObjetoCustodia[];
}

interface Mensaje {
  autor: 'BOT' | 'USER';
  texto: string;
}

export const AsistenteIA: React.FC<AsistenteIAProps> = ({ objetos }) => {
  const [abierto, setAbierto] = useState(false);
  const [input, setInput] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      autor: 'BOT',
      texto:
        '¡Hola! Soy el asistente de FindCampus.core. Dime qué objeto perdiste (ej: "portátil Lenovo" o "billetera café") y buscaré coincidencias en nuestra base NoSQL en tiempo real.',
    },
  ]);

  const responderConsulta = (textoUsuario: string) => {
    const q = textoUsuario.toLowerCase();
    const coincidencias = objetos.filter((o) => {
      const bloque = `${o.titulo} ${o.categoria} ${o.edificio} ${o.sede} ${
        o.atributos.marca ?? ''
      } ${o.atributos.color ?? ''}`.toLowerCase();
      return q
        .split(' ')
        .filter((palabra) => palabra.length > 3)
        .some((palabra) => bloque.includes(palabra));
    });

    if (q.includes('reclamar') || q.includes('requisito') || q.includes('ley 1581')) {
      return 'Para reclamar un bien: 1) Ubica el radicado en el Catálogo Público, 2) Haz clic en "Es mío • Iniciar Reclamo", 3) Ingresa tu correo institucional y un dato privado (serial o seña particular) para validar el código OTP.';
    }

    if (coincidencias.length > 0) {
      const lista = coincidencias
        .map(
          (c) =>
            `• [${c.radicado_id}] ${c.titulo} en ${c.sede} (${c.edificio}) — Estado: ${c.estado}`
        )
        .join('\n');
      return `Encontré ${coincidencias.length} coincidencia(s) en el clúster MongoDB:\n${lista}`;
    }

    return 'No encontré coincidencias exactas aún en custodia activa. Activa una alerta preventiva con el botón amarillo del encabezado.';
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const pregunta = input.trim();
    const respuesta = responderConsulta(pregunta);
    setMensajes((prev) => [...prev, { autor: 'USER', texto: pregunta }, { autor: 'BOT', texto: respuesta }]);
    setInput('');
  };

  return (
    <>
      <button
        onClick={() => setAbierto(!abierto)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-extrabold shadow-xl shadow-yellow-400/20 transition-transform hover:scale-105 cursor-pointer"
      >
        <Bot className="w-5 h-5" />
        <span className="text-xs hidden sm:inline">Asistente FindCampus IA</span>
      </button>

      {abierto && (
        <div className="fixed bottom-20 right-6 z-50 w-88 sm:w-96 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
          <div className="bg-zinc-950 border-b border-zinc-800 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <div>
                <p className="text-sm font-bold">FindCampus AI Matcher</p>
                <p className="text-[11px] text-zinc-400">Conectado a MongoDB Full-Text Index</p>
              </div>
            </div>
            <button onClick={() => setAbierto(false)} className="text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 h-72 overflow-y-auto space-y-3 bg-zinc-900 text-xs">
            {mensajes.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl whitespace-pre-line leading-relaxed ${
                  m.autor === 'USER'
                    ? 'bg-yellow-400 text-zinc-950 font-semibold ml-8'
                    : 'bg-zinc-950 text-zinc-200 border border-zinc-800 mr-6'
                }`}
              >
                {m.texto}
              </div>
            ))}
          </div>

          <form onSubmit={enviar} className="p-3 bg-zinc-950 border-t border-zinc-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej: Perdí mi portátil Lenovo..."
              className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-yellow-400"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};