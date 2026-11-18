import React, { useState } from 'react';
import {
  Terminal,
  Play,
  ShieldCheck,
  KeyRound,
  Server,
  Copy,
  Check,
  Activity,
  Loader2,
} from 'lucide-react';
import type { ObjetoCustodia } from '../types/campus';

interface ApiInspectorProps {
  objetos: ObjetoCustodia[];
}

type EndpointKey =
  | 'GET_OBJETOS'
  | 'GET_ALERTAS'
  | 'GET_ACTAS'
  | 'GET_USUARIOS'
  | 'POST_CHAT'
  | 'POST_REPORTE';

interface DefinicionEndpoint {
  metodo: 'GET' | 'POST';
  ruta: string;
  descripcion: string;
  auth: string;
  bodyEjemplo?: Record<string, unknown>;
  respuestaEjemplo: Record<string, unknown>;
}

export const ApiInspector: React.FC<ApiInspectorProps> = ({ objetos }) => {
  const [endpointActivo, setEndpointActivo] = useState<EndpointKey>('GET_OBJETOS');
  const [ejecutando, setEjecutando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [resultadoVivo, setResultadoVivo] = useState<{
    status: number;
    latenciaMs: number;
    data: unknown;
  } | null>(null);

  const endpoints: Record<EndpointKey, DefinicionEndpoint> = {
    GET_OBJETOS: {
      metodo: 'GET',
      ruta: '/api/objetos',
      descripcion:
        'Consulta el inventario de custodia en MongoDB Atlas con protección de seriales Ley 1581.',
      auth: 'Público (Lectura Catálogo)',
      respuestaEjemplo: {
        total: objetos.length,
        privacy_filter: 'LEY_1581_MASKING_APPLIED',
        items: objetos.slice(0, 2).map((o) => ({
          radicado_id: o.radicado_id,
          titulo: o.titulo,
          categoria: o.categoria,
          sede: o.sede,
          estado: o.estado,
        })),
      },
    },
    GET_ALERTAS: {
      metodo: 'GET',
      ruta: '/api/alertas',
      descripcion:
        'Obtiene las alertas tempranas de extravío registradas por estudiantes y su estado de gestión.',
      auth: 'Público / Custodia Admin',
      respuestaEjemplo: {
        alertas: [
          {
            codigo_alerta: 'ALT-2026-4812',
            titulo: 'Portátil Lenovo IdeaPad',
            sede: 'Sede Principal',
            estado: 'ACTIVA',
          },
        ],
      },
    },
    GET_ACTAS: {
      metodo: 'GET',
      ruta: '/api/actas',
      descripcion:
        'Lista las actas digitales de restitución firmadas y persistidas en auditoría.',
      auth: 'Rol: ADMIN (Custodia)',
      respuestaEjemplo: {
        actas: [
          {
            numero_acta: 'ACTA-2026-59201',
            radicado_id: 'FIND-2026-0487',
            titulo_bien: 'Audífonos Bluetooth',
            sede: 'Sede Principal',
          },
        ],
      },
    },
    GET_USUARIOS: {
      metodo: 'GET',
      ruta: '/api/auth',
      descripcion:
        'Consulta cuentas registradas proyectando fuera hashes de contraseña y códigos OTP.',
      auth: 'Rol: ADMIN (Proyección Segura)',
      respuestaEjemplo: {
        usuarios: [
          {
            nombre: 'Brayan Morales',
            correo: 'bmoralessa1@uniminuto.edu.co',
            rol: 'ADMIN',
          },
        ],
      },
    },
    POST_CHAT: {
      metodo: 'POST',
      ruta: '/api/chat',
      descripcion:
        'Asistente IA Unimi conectado a Gemini Flash e inventario en vivo de custodia y alertas.',
      auth: 'Serverless + GEMINI_API_KEY',
      bodyEjemplo: {
        mensaje: '¿Cuántos objetos hay actualmente en custodia?',
      },
      respuestaEjemplo: {
        respuesta:
          'Actualmente tenemos objetos registrados en custodia listos para validación en portería.',
        modelo: 'gemini-3.5-flash-lite',
      },
    },
    POST_REPORTE: {
      metodo: 'POST',
      ruta: '/api/reportes',
      descripcion:
        'Genera y envía por correo multiparte el resumen ejecutivo BI a administradores.',
      auth: 'Rol: ADMIN + SMTP Transaccional',
      bodyEjemplo: {
        solicitado_por: 'Consola BI FindCampus',
        kpis: {
          total_bienes: objetos.length,
          en_custodia: objetos.filter((o) => o.estado !== 'RESTITUIDO').length,
          restituidos: objetos.filter((o) => o.estado === 'RESTITUIDO').length,
        },
      },
      respuestaEjemplo: {
        ok: true,
        mensaje: 'Reporte ejecutivo enviado correctamente a los administradores.',
      },
    },
  };

  const actual = endpoints[endpointActivo];

  const seleccionarEndpoint = (key: EndpointKey) => {
    setEndpointActivo(key);
    setResultadoVivo(null);
  };

  const ejecutarPruebaEnVivo = async () => {
    setEjecutando(true);
    const inicio = performance.now();
    try {
      const opciones: RequestInit =
        actual.metodo === 'POST'
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(actual.bodyEjemplo || {}),
            }
          : { method: 'GET' };

      const res = await fetch(actual.ruta, opciones);
      const data = await res.json().catch(() => ({ error: 'Respuesta no JSON' }));
      const latenciaMs = Math.round(performance.now() - inicio);

      // Si es GET_OBJETOS y devuelve array largo, mostrar resumen + primeros 3 registros para legibilidad
      const dataFormateada =
        Array.isArray(data) && data.length > 3
          ? {
              total_registros: data.length,
              muestra_primeros_3: data.slice(0, 3).map((item: Record<string, unknown>) => ({
                radicado_id: item.radicado_id,
                titulo: item.titulo,
                sede: item.sede,
                estado: item.estado,
              })),
            }
          : data;

      setResultadoVivo({
        status: res.status,
        latenciaMs,
        data: dataFormateada,
      });
    } catch (err) {
      setResultadoVivo({
        status: 500,
        latenciaMs: Math.round(performance.now() - inicio),
        data: {
          error: err instanceof Error ? err.message : 'Error de red ejecutando prueba',
        },
      });
    } finally {
      setEjecutando(false);
    }
  };

  const jsonMostrado = JSON.stringify(
    resultadoVivo ? resultadoVivo.data : actual.respuestaEjemplo,
    null,
    2
  );

  const copiarJson = () => {
    navigator.clipboard?.writeText(jsonMostrado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-yellow-400">
              Vercel Serverless Functions • MongoDB Atlas &amp; Gemini IA
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">
              Contratos REST &amp; Consola de Pruebas en Vivo
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-950 px-3.5 py-2 rounded-xl border border-zinc-800">
            <Server className="w-4 h-4 text-yellow-400" />
            <span>Runtime: Node.js + HTTPS / TLS 1.3</span>
          </div>
        </div>

        {/* Selector de los 6 endpoints reales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
          {(Object.keys(endpoints) as EndpointKey[]).map((key) => {
            const ep = endpoints[key];
            const activo = endpointActivo === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => seleccionarEndpoint(key)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  activo
                    ? 'bg-yellow-400/10 border-yellow-400 shadow-sm'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-extrabold ${
                      ep.metodo === 'GET'
                        ? 'bg-emerald-400/20 text-emerald-300'
                        : 'bg-yellow-400 text-zinc-950'
                    }`}
                  >
                    {ep.metodo}
                  </span>
                  <Play
                    className={`w-3.5 h-3.5 ${activo ? 'text-yellow-400' : 'text-zinc-600'}`}
                  />
                </div>
                <p className="font-mono text-xs font-bold text-zinc-100 mt-2 truncate">
                  {ep.ruta}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{ep.descripcion}</p>
              </button>
            );
          })}
        </div>

        {/* Visor de contrato y ejecución real */}
        <div className="mt-6 bg-zinc-950 rounded-2xl border border-zinc-800 p-5 text-zinc-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <Terminal className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold">{actual.metodo}</span>
              <span className="text-zinc-200">{actual.ruta}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-yellow-300 bg-yellow-400/10 px-2.5 py-1 rounded border border-yellow-400/30">
                <KeyRound className="w-3 h-3" /> {actual.auth}
              </span>

              <button
                type="button"
                disabled={ejecutando}
                onClick={ejecutarPruebaEnVivo}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-zinc-950 font-extrabold text-xs cursor-pointer transition-colors"
              >
                {ejecutando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{ejecutando ? 'Ejecutando...' : 'Probar en Vivo'}</span>
              </button>
            </div>
          </div>

          {actual.bodyEjemplo && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Request Payload (JSON):
              </span>
              <pre className="text-xs font-mono text-zinc-300 bg-zinc-900/70 p-3 rounded-xl border border-zinc-800 overflow-x-auto">
                {JSON.stringify(actual.bodyEjemplo, null, 2)}
              </pre>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-bold uppercase tracking-wider text-zinc-400">
                  {resultadoVivo ? 'Respuesta Real del Servidor:' : 'Contrato de Respuesta:'}
                </span>
                {resultadoVivo && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold ${
                      resultadoVivo.status >= 200 && resultadoVivo.status < 300
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    <Activity className="w-3 h-3" /> HTTP {resultadoVivo.status} •{' '}
                    {resultadoVivo.latenciaMs} ms
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={copiarJson}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-yellow-400 cursor-pointer"
              >
                {copiado ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar JSON</span>
                  </>
                )}
              </button>
            </div>

            <pre className="text-xs font-mono text-yellow-300 bg-zinc-900/90 p-4 rounded-xl border border-zinc-800 overflow-x-auto leading-relaxed max-h-96">
              {jsonMostrado}
            </pre>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" /> Protección Ley 1581 &amp;
              Proyección de credenciales activa
            </span>
            <span>Content-Type: application/json</span>
          </div>
        </div>
      </div>
    </div>
  );
};