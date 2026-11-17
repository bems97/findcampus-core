import React, { useState, useEffect } from 'react';
import {
  Camera,
  PlusCircle,
  BellRing,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Mail,
  PackageCheck,
  Search,
  Eye,
  X,
} from 'lucide-react';
import type { ObjetoCustodia } from '../types/campus';

interface AlertaExtravio {
  _id?: string;
  codigo_alerta: string;
  titulo: string;
  categoria: string;
  descripcion?: string;
  sede: string;
  lugar_aproximado?: string;
  nombre_estudiante: string;
  correo_estudiante: string;
  telefono_contacto?: string;
  foto_referencia?: string | null;
  estado: 'ACTIVA' | 'EN_REVISION' | 'RESUELTA';
  nota_admin?: string;
  created_at?: string;
}

interface PanelCustodiaProps {
  objetos: ObjetoCustodia[];
  onRegistrarObjeto?: (nuevo: ObjetoCustodia) => Promise<void> | void;
  onRestituirObjeto?: (objetoId: string) => Promise<void> | void;
  onRecargarObjetos?: () => void;
}

const SEDES_UNIMINUTO = [
  'Sede Principal',
  'Sede Calle 80',
  'Sede Perdomo',
  'Centro Regional Soacha',
  'Centro Regional Zipaquirá',
  'Centro Regional Madrid',
];

const CATEGORIAS = [
  'ELECTRONICA',
  'DOCUMENTOS',
  'ACCESORIOS',
  'LIBROS_UTILES',
  'OTROS',
];

function comprimirImagen(file: File, maxAncho = 900, calidad = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxAncho) {
          height = Math.round((height * maxAncho) / width);
          width = maxAncho;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se pudo procesar la imagen'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', calidad));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const PanelCustodia: React.FC<PanelCustodiaProps> = ({
  objetos,
  onRegistrarObjeto,
  onRestituirObjeto,
  onRecargarObjetos,
}) => {
  const [tabActiva, setTabActiva] = useState<'registro' | 'alertas' | 'custodia'>('registro');

  const [guardandoObjeto, setGuardandoObjeto] = useState(false);
  const [mensajeForm, setMensajeForm] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(
    null
  );
  const [nuevoObjeto, setNuevoObjeto] = useState({
    titulo: '',
    categoria: 'ELECTRONICA',
    sede: 'Sede Principal',
    edificio: 'Portería Principal',
    marca: '',
    modelo: '',
    color: '',
    numero_serie: '',
    imagen_url: '',
  });

  const [alertas, setAlertas] = useState<AlertaExtravio[]>([]);
  const [cargandoAlertas, setCargandoAlertas] = useState(false);
  const [procesandoAlertaId, setProcesandoAlertaId] = useState<string | null>(null);
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [filtroInventario, setFiltroInventario] = useState('');

  const cargarAlertas = async () => {
    setCargandoAlertas(true);
    try {
      const res = await fetch('/api/alertas');
      const data = await res.json();
      if (Array.isArray(data.alertas)) {
        setAlertas(data.alertas);
      }
    } catch (err) {
      console.error('Error cargando alertas:', err);
    } finally {
      setCargandoAlertas(false);
    }
  };

  useEffect(() => {
    cargarAlertas();
  }, []);

  const manejarCapturaFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await comprimirImagen(file, 900, 0.75);
      setNuevoObjeto((prev) => ({ ...prev, imagen_url: base64 }));
    } catch {
      setMensajeForm({
        tipo: 'err',
        texto: 'No se pudo procesar la fotografía tomada.',
      });
    }
  };

  const registrarBienCustodia = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeForm(null);
    setGuardandoObjeto(true);

    try {
      const radicadoId = `FIND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        radicado_id: radicadoId,
        titulo: nuevoObjeto.titulo.trim(),
        categoria: nuevoObjeto.categoria,
        sede: nuevoObjeto.sede,
        edificio: nuevoObjeto.edificio.trim() || 'Portería Principal',
        estado: 'EN_CUSTODIA' as const,
        fecha_hallazgo: new Date().toISOString().slice(0, 16).replace('T', ' '),
        imagen_url: nuevoObjeto.imagen_url || undefined,
        atributos: {
          marca: nuevoObjeto.marca.trim(),
          modelo: nuevoObjeto.modelo.trim(),
          color: nuevoObjeto.color.trim(),
          numero_serie: nuevoObjeto.numero_serie.trim(),
        },
      };

      if (onRegistrarObjeto) {
        await onRegistrarObjeto(payload as unknown as ObjetoCustodia);
      } else {
        const res = await fetch('/api/objetos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'No se pudo registrar el objeto en custodia.');
        }
        onRecargarObjetos?.();
      }

      setMensajeForm({
        tipo: 'ok',
        texto: `Bien registrado correctamente con radicado ${radicadoId}.`,
      });
      setNuevoObjeto({
        titulo: '',
        categoria: 'ELECTRONICA',
        sede: 'Sede Principal',
        edificio: 'Portería Principal',
        marca: '',
        modelo: '',
        color: '',
        numero_serie: '',
        imagen_url: '',
      });
    } catch (err) {
      setMensajeForm({
        tipo: 'err',
        texto: err instanceof Error ? err.message : 'Error al guardar el registro.',
      });
    } finally {
      setGuardandoObjeto(false);
    }
  };

  const gestionarAlerta = async (
    alerta: AlertaExtravio,
    nuevoEstado: 'EN_REVISION' | 'RESUELTA'
  ) => {
    const idTarget = alerta._id || alerta.codigo_alerta;
    setProcesandoAlertaId(idTarget);

    const notaAdmin =
      nuevoEstado === 'RESUELTA'
        ? `Tu objeto coincidente fue ubicado en ${alerta.sede}. Acércate a portería principal / Bienestar Universitario con tu carné institucional para firmar el acta digital de entrega.`
        : 'El equipo de custodia está verificando los ingresos en portería de tu sede.';

    try {
      const res = await fetch('/api/alertas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: idTarget,
          estado: nuevoEstado,
          nota_admin: notaAdmin,
        }),
      });

      if (res.ok) {
        await cargarAlertas();
      }
    } catch (err) {
      console.error('Error actualizando alerta:', err);
    } finally {
      setProcesandoAlertaId(null);
    }
  };

  const restituirBien = async (obj: ObjetoCustodia) => {
    const targetId = obj._id || obj.radicado_id;
    try {
      if (onRestituirObjeto) {
        await onRestituirObjeto(targetId);
        return;
      }
      const res = await fetch('/api/objetos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetId,
          radicado_id: obj.radicado_id,
          estado: 'RESTITUIDO',
        }),
      });
      if (res.ok) {
        onRecargarObjetos?.();
      }
    } catch (err) {
      console.error('Error restituyendo bien:', err);
    }
  };

  const alertasPendientesCount = alertas.filter((a) => a.estado !== 'RESUELTA').length;

  const objetosInventarioFiltrados = objetos.filter((o) => {
    const q = filtroInventario.trim().toLowerCase();
    if (!q) return true;
    return `${o.radicado_id} ${o.titulo} ${o.sede} ${o.estado}`.toLowerCase().includes(q);
  });

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Cabecera del Panel de Custodia */}
      <div className="rounded-3xl bg-[#0e1e38] border border-blue-900/50 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-extrabold text-yellow-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Gestión Institucional de Custodia • UNIMINUTO</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">
            Panel de Recepción, Alertas y Actas
          </h2>
        </div>

        {/* Navegación interna */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTabActiva('registro')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
              tabActiva === 'registro'
                ? 'bg-yellow-400 text-slate-950'
                : 'bg-[#081326] text-slate-300 hover:bg-blue-950 border border-blue-900/50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Hallazgo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTabActiva('alertas');
              cargarAlertas();
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
              tabActiva === 'alertas'
                ? 'bg-yellow-400 text-slate-950'
                : 'bg-[#081326] text-slate-300 hover:bg-blue-950 border border-blue-900/50'
            }`}
          >
            <BellRing className="w-4 h-4" />
            <span>Alertas Tempranas</span>
            {alertasPendientesCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  tabActiva === 'alertas'
                    ? 'bg-slate-950 text-yellow-400'
                    : 'bg-yellow-400 text-slate-950'
                }`}
              >
                {alertasPendientesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('custodia')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
              tabActiva === 'custodia'
                ? 'bg-yellow-400 text-slate-950'
                : 'bg-[#081326] text-slate-300 hover:bg-blue-950 border border-blue-900/50'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Inventario y Entregas ({objetos.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: REGISTRAR HALLAZGO CON CÁMARA */}
      {tabActiva === 'registro' && (
        <form
          onSubmit={registrarBienCustodia}
          className="rounded-3xl bg-[#0e1e38] border border-blue-900/50 p-6 sm:p-8 space-y-6 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-blue-900/40 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-white">
                Ingreso de Objeto Encontrado en Campus
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Los seriales e identificadores se cifran automáticamente conforme a la Ley
                1581.
              </p>
            </div>
          </div>

          {mensajeForm && (
            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold border ${
                mensajeForm.tipo === 'ok'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-500/15 border-red-500/40 text-red-200'
              }`}
            >
              {mensajeForm.texto}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Nombre o Título del Bien *
              </label>
              <input
                type="text"
                required
                value={nuevoObjeto.titulo}
                onChange={(e) =>
                  setNuevoObjeto({ ...nuevoObjeto, titulo: e.target.value })
                }
                placeholder="Ej: Portátil Lenovo IdeaPad"
                className="w-full px-4 py-3 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Categoría *
              </label>
              <select
                value={nuevoObjeto.categoria}
                onChange={(e) =>
                  setNuevoObjeto({ ...nuevoObjeto, categoria: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Sede de Custodia *
              </label>
              <select
                value={nuevoObjeto.sede}
                onChange={(e) =>
                  setNuevoObjeto({ ...nuevoObjeto, sede: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
              >
                {SEDES_UNIMINUTO.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Punto / Edificio Hallazgo
              </label>
              <input
                type="text"
                value={nuevoObjeto.edificio}
                onChange={(e) =>
                  setNuevoObjeto({ ...nuevoObjeto, edificio: e.target.value })
                }
                placeholder="Ej: Bloque B • Portería"
                className="w-full px-4 py-3 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Marca
              </label>
              <input
                type="text"
                value={nuevoObjeto.marca}
                onChange={(e) =>
                  setNuevoObjeto({ ...nuevoObjeto, marca: e.target.value })
                }
                placeholder="Ej: Lenovo, Apple, Sony"
                className="w-full px-4 py-3 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Modelo / Color
              </label>
              <input
                type="text"
                value={nuevoObjeto.modelo}
                onChange={(e) =>
                  setNuevoObjeto({ ...nuevoObjeto, modelo: e.target.value })
                }
                placeholder="Ej: Gris espacial"
                className="w-full px-4 py-3 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Serial / Documento (Cifrado)
              </label>
              <input
                type="text"
                value={nuevoObjeto.numero_serie}
                onChange={(e) =>
                  setNuevoObjeto({ ...nuevoObjeto, numero_serie: e.target.value })
                }
                placeholder="Se censurará al publicar"
                className="w-full px-4 py-3 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
              />
            </div>
          </div>

          {/* Captura Fotográfica Real (Cámara móvil o archivo) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Evidencia Fotográfica del Bien (Cámara o Galería)
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[#081326] hover:bg-blue-950 border border-dashed border-yellow-400/60 text-xs sm:text-sm font-bold text-yellow-300 cursor-pointer transition-colors">
                <Camera className="w-5 h-5 text-yellow-400" />
                <span>
                  {nuevoObjeto.imagen_url
                    ? 'Cambiar fotografía capturada'
                    : 'Tomar foto con cámara o subir archivo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={manejarCapturaFoto}
                  className="hidden"
                />
              </label>

              {nuevoObjeto.imagen_url && (
                <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-yellow-400/50">
                  <img
                    src={nuevoObjeto.imagen_url}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setNuevoObjeto({ ...nuevoObjeto, imagen_url: '' })}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/75 text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={guardandoObjeto}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-slate-950 font-extrabold text-sm shadow-lg cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>
                {guardandoObjeto ? 'Registrando en custodia...' : 'Publicar en Custodia'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: BANDEJA UNIFICADA DE ALERTAS TEMPRANAS Y CORREOS */}
      {tabActiva === 'alertas' && (
        <div className="rounded-3xl bg-[#0e1e38] border border-blue-900/50 p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-white">
                Bitácora de Alertas Tempranas de Estudiantes
              </h3>
              <p className="text-xs text-slate-300">
                Procesa reportes activos o notifica hallazgo por correo electrónico con acta
                automática.
              </p>
            </div>
          </div>

          {cargandoAlertas ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              Cargando alertas registradas...
            </p>
          ) : alertas.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              No hay alertas tempranas registradas por el momento.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alertas.map((alerta) => {
                const idKey = alerta._id || alerta.codigo_alerta;
                const procesando = procesandoAlertaId === idKey;

                return (
                  <div
                    key={idKey}
                    className="rounded-2xl bg-[#081326] border border-blue-900/50 p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-yellow-400/15 text-yellow-400 font-mono text-xs font-bold">
                          {alerta.codigo_alerta}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            alerta.estado === 'RESUELTA'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                              : alerta.estado === 'EN_REVISION'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                          }`}
                        >
                          {alerta.estado === 'RESUELTA'
                            ? 'Notificado y Resuelto'
                            : alerta.estado === 'EN_REVISION'
                            ? 'En Revisión'
                            : 'Alerta Activa'}
                        </span>
                      </div>

                      <h4 className="text-base font-extrabold text-white">
                        {alerta.titulo}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          ({alerta.categoria})
                        </span>
                      </h4>

                      <p className="text-xs text-slate-300">
                        <strong>Sede:</strong> {alerta.sede} •{' '}
                        {alerta.lugar_aproximado || 'Sin lugar específico'}
                      </p>

                      {alerta.descripcion && (
                        <p className="text-xs text-slate-400 italic">
                          "{alerta.descripcion}"
                        </p>
                      )}

                      <div className="pt-1 border-t border-blue-950 text-xs text-slate-300 space-y-1">
                        <p>
                          <strong>Reportante:</strong> {alerta.nombre_estudiante}
                        </p>
                        <p className="flex items-center gap-1.5 text-yellow-300">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{alerta.correo_estudiante}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {alerta.foto_referencia && (
                        <button
                          type="button"
                          onClick={() => setFotoModal(alerta.foto_referencia || null)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-xs font-bold text-slate-200 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Ver Foto</span>
                        </button>
                      )}

                      {alerta.estado !== 'RESUELTA' && (
                        <>
                          {alerta.estado === 'ACTIVA' && (
                            <button
                              type="button"
                              disabled={procesando}
                              onClick={() => gestionarAlerta(alerta, 'EN_REVISION')}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Procesar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={procesando}
                            onClick={() => gestionarAlerta(alerta, 'RESUELTA')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-xs font-extrabold text-slate-950 cursor-pointer ml-auto"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {procesando
                                ? 'Enviando correo...'
                                : 'Notificar Hallazgo y Acta'}
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVENTARIO Y RESTITUCIÓN CON ACTA DIGITAL */}
      {tabActiva === 'custodia' && (
        <div className="rounded-3xl bg-[#0e1e38] border border-blue-900/50 p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold text-white">
              Control de Custodia y Entregas
            </h3>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filtroInventario}
                onChange={(e) => setFiltroInventario(e.target.value)}
                placeholder="Filtrar radicado o bien..."
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-[#081326] border border-blue-900/60 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#081326] text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Radicado</th>
                  <th className="px-4 py-3">Bien</th>
                  <th className="px-4 py-3">Sede</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 rounded-r-xl text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-950">
                {objetosInventarioFiltrados.map((obj) => (
                  <tr key={obj._id || obj.radicado_id}>
                    <td className="px-4 py-3 font-mono font-bold text-yellow-400">
                      {obj.radicado_id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{obj.titulo}</td>
                    <td className="px-4 py-3">{obj.sede}</td>
                    <td className="px-4 py-3">{obj.estado}</td>
                    <td className="px-4 py-3 text-right">
                      {obj.estado !== 'RESTITUIDO' ? (
                        <button
                          type="button"
                          onClick={() => restituirBien(obj)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold cursor-pointer"
                        >
                          Restituir con Acta
                        </button>
                      ) : (
                        <span className="text-slate-500 font-semibold">Entregado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visor de foto de referencia */}
      {fotoModal && (
        <div
          onClick={() => setFotoModal(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full rounded-2xl overflow-hidden bg-[#081326] border border-blue-800"
          >
            <button
              type="button"
              onClick={() => setFotoModal(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={fotoModal}
              alt="Foto de referencia del estudiante"
              className="w-full max-h-[75vh] object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
};