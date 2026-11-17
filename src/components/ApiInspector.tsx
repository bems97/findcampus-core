import React, { useState } from 'react';
import { Terminal, Play, ShieldCheck, KeyRound, Server } from 'lucide-react';
import type { ObjetoCustodia } from '../types/campus';

interface ApiInspectorProps {
  objetos: ObjetoCustodia[];
}

export const ApiInspector: React.FC<ApiInspectorProps> = ({ objetos }) => {
  const [endpointActivo, setEndpointActivo] = useState<'GET_ITEMS' | 'POST_PRESIGNED' | 'POST_ACTA'>(
    'GET_ITEMS'
  );

  const endpoints = {
    GET_ITEMS: {
      metodo: 'GET',
      ruta: '/api/v1/objetos?sede=Principal&q=lenovo',
      descripcion: 'Consulta pública con índice Full-Text y enmascaramiento automático Ley 1581.',
      auth: 'Público (Rate-Limit 60 req/min)',
      respuesta: {
        status: 200,
        latency_ms: 19,
        total: objetos.length,
        privacy_filter: 'LEY_1581_MASKING_APPLIED',
        data: objetos.slice(0, 2).map((o) => ({
          radicado_id: o.radicado_id,
          categoria: o.categoria,
          titulo: o.titulo,
          sede: o.sede,
          estado: o.estado,
        })),
      },
    },
    POST_PRESIGNED: {
      metodo: 'POST',
      ruta: '/api/v1/datalake/presigned-url',
      descripcion: 'Genera URL temporal S3/MinIO para subir evidencia directa a Zona Raw (Bronce).',
      auth: 'Bearer JWT (Rol: VIGILANCIA + MFA)',
      respuesta: {
        status: 201,
        bucket: 'findcampus-raw-bronze',
        object_key: '2026/11/16/FIND-2026-0485_raw.jpg',
        expires_in_seconds: 300,
        worm_retention_lock: 'ENABLED',
        upload_url: 'https://minio.uniminuto.internal/findcampus-raw-bronze/...?X-Amz-Signature=9f8a2c',
      },
    },
    POST_ACTA: {
      metodo: 'POST',
      ruta: '/api/v1/custodia/restituir-acta',
      descripcion: 'Valida código OTP institucional y sella acta digital PDF en AuditLogs.',
      auth: 'Bearer JWT + OTP Correo Institucional',
      respuesta: {
        status: 200,
        acta_id: 'ACTA-2026-8891',
        otp_verified: true,
        timestamp_utc: new Date().toISOString(),
        sha256_comprobante: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        audit_collection: 'AuditLogs (Append-Only)',
      },
    },
  };

  const actual = endpoints[endpointActivo];

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-yellow-400">
              FastAPI Microservices + OpenAPI 3.1
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">
              Contratos REST &amp; Arquitectura Desacoplada
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-950 px-3.5 py-2 rounded-xl border border-zinc-800">
            <Server className="w-4 h-4 text-yellow-400" />
            <span>Gateway: TLS 1.3 + JWT RS256</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {(Object.keys(endpoints) as Array<keyof typeof endpoints>).map((key) => {
            const ep = endpoints[key];
            const activo = endpointActivo === key;
            return (
              <button
                key={key}
                onClick={() => setEndpointActivo(key)}
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
                  <Play className={`w-3.5 h-3.5 ${activo ? 'text-yellow-400' : 'text-zinc-600'}`} />
                </div>
                <p className="font-mono text-xs font-bold text-zinc-100 mt-2 truncate">
                  {ep.ruta}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{ep.descripcion}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 bg-zinc-950 rounded-2xl border border-zinc-800 p-5 text-zinc-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <Terminal className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold">{actual.metodo}</span>
              <span className="text-zinc-200">{actual.ruta}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-yellow-300 bg-yellow-400/10 px-2.5 py-0.5 rounded border border-yellow-400/30">
              <KeyRound className="w-3 h-3" /> {actual.auth}
            </span>
          </div>

          <pre className="text-xs font-mono text-yellow-300 bg-zinc-900/90 p-4 rounded-xl border border-zinc-800 overflow-x-auto leading-relaxed">
            {JSON.stringify(actual.respuesta, null, 2)}
          </pre>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" /> Validación Pydantic v2 activa
            </span>
            <span>Content-Type: application/json</span>
          </div>
        </div>
      </div>
    </div>
  );
};