import React, { useState } from 'react';
import {
  Database,
  Layers,
  HardDrive,
  FileSpreadsheet,
  TrendingUp,
  MapPin,
  Clock,
  Download,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import type { ObjetoCustodia } from '../types/campus';

interface DataLakeBIProps {
  objetos: ObjetoCustodia[];
}

export const DataLakeBI: React.FC<DataLakeBIProps> = ({ objetos }) => {
  const [exportado, setExportado] = useState(false);

  const totalObjetos = objetos.length + 45;
  const restituidos = objetos.filter((o) => o.estado === 'RESTITUIDO').length + 38;
  const trePorcentaje = Math.round((restituidos / totalObjetos) * 100);

  const zonasCalor = [
    { bloque: 'Torre B - Laboratorios TI', incidentes: 34, porcentaje: 85, riesgo: 'Alto' },
    { bloque: 'Cafetería Central Piso 1', incidentes: 26, porcentaje: 65, riesgo: 'Medio-Alto' },
    { bloque: 'Biblioteca General (Salas)', incidentes: 19, porcentaje: 48, riesgo: 'Medio' },
    { bloque: 'Bloque A - Aulas Magistrales', incidentes: 14, porcentaje: 35, riesgo: 'Bajo' },
  ];

  const franjasHorarias = [
    { franja: '07:00 - 09:00', valor: 28, etiqueta: 'Ingreso Mañana' },
    { franja: '11:30 - 13:30', valor: 74, etiqueta: 'Cambio Jornada (Pico)' },
    { franja: '17:30 - 18:30', valor: 92, etiqueta: 'Transición Nocturna (Crítico)' },
    { franja: '21:30 - 22:15', valor: 64, etiqueta: 'Salida Nocturna' },
  ];

  const exportarParquetSimulado = () => {
    const csvContent =
      'radicado_id,categoria,sede,edificio,estado,hash_sha256\n' +
      objetos
        .map(
          (o) =>
            `${o.radicado_id},${o.categoria},"${o.sede}","${o.edificio}",${o.estado},${o.hash_sha256}`
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'findcampus_zona_oro_curated.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportado(true);
    setTimeout(() => setExportado(false), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-yellow-400">
            MinIO Object Storage S3 + DuckDB OLAP
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
            Arquitectura Data Lake (Medallion) &amp; Analítica Institucional
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Desacoplamiento estricto de archivos binarios (BLOBs) para proteger la memoria RAM de MongoDB.
          </p>
        </div>

        <button
          onClick={exportarParquetSimulado}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer shrink-0"
        >
          {exportado ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Dataset Zona Oro Descargado</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Exportar Zona Oro (BI Dataset)</span>
            </>
          )}
        </button>
      </div>

      {/* Topología Medallion */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-zinc-900 rounded-3xl border border-amber-500/40 p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold">
              1. ZONA RAW (BRONCE)
            </span>
            <HardDrive className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="font-bold text-white text-base">Ingesta Inmutable WORM</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Recepción directa desde porterías mediante <strong className="text-zinc-200">Presigned URLs</strong> de 5 minutos sin
            pasar por el API Gateway.
          </p>
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Formato: JPG/PNG Original</span>
            <span className="text-amber-400 font-bold">Hash SHA-256</span>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-3xl border border-zinc-700 p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-bold">
              2. ZONA STANDARDIZED (PLATA)
            </span>
            <Layers className="w-5 h-5 text-zinc-300" />
          </div>
          <h3 className="font-bold text-white text-base">Sanitización &amp; Compresión</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Workers asíncronos (Celery) eliminan metadatos <strong className="text-zinc-200">EXIF/GPS privados</strong> (Ley 1581) y
            transcodifican a <strong className="text-zinc-200">WebP</strong> (-72% peso).
          </p>
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Formato: WebP + Thumb 300px</span>
            <span className="text-zinc-200 font-bold">Privacy Clean</span>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-3xl border border-yellow-400/50 p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg bg-yellow-400/20 text-yellow-400 text-xs font-bold">
              3. ZONA CURATED (ORO)
            </span>
            <FileSpreadsheet className="w-5 h-5 text-yellow-400" />
          </div>
          <h3 className="font-bold text-white text-base">Analítica Columnar OLAP</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Agregación nocturna en formato columnar <strong className="text-zinc-200">Apache Parquet</strong> consultado por DuckDB
            sin afectar la operación transaccional.
          </p>
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Formato: .parquet</span>
            <span className="text-yellow-400 font-bold">BI Ready</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Tasa Restitución Efectiva (TRE)</span>
            <TrendingUp className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{trePorcentaje}%</p>
          <p className="text-xs text-yellow-400 mt-1 font-semibold">+14% vs minuta manual</p>
        </div>

        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Tiempo Medio Devolución</span>
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">4.2 hrs</p>
          <p className="text-xs text-zinc-500 mt-1">Antes: 3.5 días promedio</p>
        </div>

        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Ahorro Almacenamiento</span>
            <Database className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">72.4%</p>
          <p className="text-xs text-zinc-500 mt-1">Compresión WebP + Parquet</p>
        </div>

        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Reclamos Fraudulentos</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">0</p>
          <p className="text-xs text-emerald-400 mt-1 font-semibold">100% cotejo serial/OTP</p>
        </div>
      </div>

      {/* Mapas de Calor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-yellow-400" />
              Mapa de Calor por Bloques (Índice 2dsphere)
            </h3>
            <p className="text-xs text-zinc-400">
              Priorización de rondas preventivas de seguridad física
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {zonasCalor.map((z) => (
              <div key={z.bloque} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">{z.bloque}</span>
                  <span className="text-zinc-400">
                    <strong className="text-yellow-400">{z.incidentes}</strong> hallazgos ({z.riesgo})
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className={`h-full rounded-full ${
                      z.porcentaje > 75
                        ? 'bg-rose-500'
                        : z.porcentaje > 55
                        ? 'bg-yellow-400'
                        : 'bg-zinc-400'
                    }`}
                    style={{ width: `${z.porcentaje}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              Franjas Horarias de Mayor Extravío
            </h3>
            <p className="text-xs text-zinc-400">
              Correlación con cambios de jornada académica (Diurna / Nocturna)
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {franjasHorarias.map((f) => (
              <div key={f.franja} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-yellow-400">{f.franja}</span>
                  <span className="text-zinc-300 font-medium">{f.etiqueta}</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className={`h-full rounded-full ${
                      f.valor >= 80 ? 'bg-yellow-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${f.valor}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};