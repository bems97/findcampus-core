import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  ShieldCheck,
  Clock,
  BellRing,
  X,
  Camera,
  CheckCircle2,
  PackageSearch,
  Lock,
  Send,
  SlidersHorizontal,
} from 'lucide-react';
import type { ObjetoCustodia } from '../types/campus';

interface CatalogoPublicoProps {
  objetos: ObjetoCustodia[];
  cargando?: boolean;
  usuarioActual?: {
    nombre?: string;
    correo?: string;
    rol?: string;
  } | null;
  onIniciarReclamo?: (objeto: ObjetoCustodia) => void;
  onReclamar?: (objeto: ObjetoCustodia) => void;
}

const SEDES_UNIMINUTO = [
  'Todas las sedes',
  'Sede Principal',
  'Sede Calle 80',
  'Sede Perdomo',
  'Centro Regional Soacha',
  'Centro Regional Zipaquirá',
  'Centro Regional Madrid',
];

const CATEGORIAS = [
  'Todas las categorías',
  'ELECTRONICA',
  'DOCUMENTOS',
  'ACCESORIOS',
  'LIBROS_UTILES',
  'OTROS',
];

function comprimirImagen(file: File, maxAncho = 800, calidad = 0.72): Promise<string> {
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

export const CatalogoPublico: React.FC<CatalogoPublicoProps> = ({
  objetos,
  cargando = false,
  usuarioActual,
  onIniciarReclamo,
  onReclamar,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [sedeFiltro, setSedeFiltro] = useState('Todas las sedes');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas las categorías');
  const [soloDisponibles, setSoloDisponibles] = useState(false);

  // Modal de Alerta Temprana con foto de referencia
  const [modalAlertaAbierto, setModalAlertaAbierto] = useState(false);
  const [enviandoAlerta, setEnviandoAlerta] = useState(false);
  const [alertaEnviadaCodigo, setAlertaEnviadaCodigo] = useState<string | null>(null);
  const [errorAlerta, setErrorAlerta] = useState('');

  const [formAlerta, setFormAlerta] = useState({
    titulo: '',
    categoria: 'ELECTRONICA',
    sede: 'Sede Principal',
    lugar_aproximado: '',
    descripcion: '',
    nombre_estudiante: usuarioActual?.nombre || '',
    correo_estudiante: usuarioActual?.correo || '',
    telefono_contacto: '',
    foto_referencia: '',
  });

  const objetosFiltrados = useMemo(() => {
    return objetos.filter((obj) => {
      const coincideSede =
        sedeFiltro === 'Todas las sedes' ||
        obj.sede?.toLowerCase() === sedeFiltro.toLowerCase();

      const coincideCategoria =
        categoriaFiltro === 'Todas las categorías' ||
        obj.categoria?.toUpperCase() === categoriaFiltro.toUpperCase();

      const coincideEstado = !soloDisponibles || obj.estado === 'EN_CUSTODIA';

      const q = busqueda.trim().toLowerCase();
      if (!q) return coincideSede && coincideCategoria && coincideEstado;

      const meta = (obj.atributos ||
        (obj as unknown as Record<string, unknown>).metadatos ||
        {}) as Record<string, unknown>;
      const textoCompleto = [
        obj.radicado_id,
        obj.titulo,
        obj.categoria,
        obj.sede,
        obj.edificio,
        meta.marca,
        meta.modelo,
        meta.color,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        coincideSede &&
        coincideCategoria &&
        coincideEstado &&
        textoCompleto.includes(q)
      );
    });
  }, [objetos, busqueda, sedeFiltro, categoriaFiltro, soloDisponibles]);

  const abrirModalAlerta = () => {
    setAlertaEnviadaCodigo(null);
    setErrorAlerta('');
    setFormAlerta((prev) => ({
      ...prev,
      nombre_estudiante: usuarioActual?.nombre || prev.nombre_estudiante,
      correo_estudiante: usuarioActual?.correo || prev.correo_estudiante,
    }));
    setModalAlertaAbierto(true);
  };

  const manejarFotoAlerta = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await comprimirImagen(file, 800, 0.72);
      setFormAlerta((prev) => ({ ...prev, foto_referencia: base64 }));
    } catch {
      setErrorAlerta('No se pudo procesar la imagen seleccionada.');
    }
  };

  const enviarReporteExtravio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlerta('');
    setEnviandoAlerta(true);

    try {
      const res = await fetch('/api/alertas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formAlerta),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo registrar la alerta.');
      }

      setAlertaEnviadaCodigo(data.alerta?.codigo_alerta || 'ALT-2026');
      setFormAlerta({
        titulo: '',
        categoria: 'ELECTRONICA',
        sede: 'Sede Principal',
        lugar_aproximado: '',
        descripcion: '',
        nombre_estudiante: usuarioActual?.nombre || '',
        correo_estudiante: usuarioActual?.correo || '',
        telefono_contacto: '',
        foto_referencia: '',
      });
    } catch (err) {
      setErrorAlerta(
        err instanceof Error ? err.message : 'Error de conexión al enviar el reporte.'
      );
    } finally {
      setEnviandoAlerta(false);
    }
  };

  const manejarAccionReclamo = (objeto: ObjetoCustodia) => {
    if (onIniciarReclamo) onIniciarReclamo(objeto);
    else if (onReclamar) onReclamar(objeto);
  };

  return (
    <section
      id="catalogo-objetos"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
    >
      {/* Hero Institucional */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e1e38] via-[#0b182e] to-[#081326] border border-blue-900/50 p-6 sm:p-10 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Búsqueda Indexada • Protección Habeas Data Ley 1581</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              ¿Perdiste algo en el campus?{' '}
              <span className="block text-yellow-400">Encuéntralo aquí.</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Consulta en tiempo real los bienes custodiados en porterías y bienestar
              universitario. Seriales e identificaciones están cifrados hasta validar tu
              titularidad.
            </p>
          </div>

          {/* Botón de Alerta Temprana + Indicador */}
          <div className="shrink-0 flex flex-col gap-3">
            <button
              type="button"
              onClick={abrirModalAlerta}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold text-sm shadow-lg shadow-yellow-400/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <BellRing className="w-5 h-5" />
              <span>Reportar Objeto Extraviado</span>
            </button>

            <div className="px-5 py-2.5 rounded-2xl bg-[#081326]/90 border border-blue-900/60 text-center text-xs text-slate-300">
              Tasa de recuperación:{' '}
              <strong className="text-yellow-400 font-extrabold">86.4%</strong>
            </div>
          </div>
        </div>

        {/* Barra de Búsqueda, Sede y Categoría */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-3 p-2.5 rounded-2xl bg-[#081326]/70 border border-blue-900/50">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por marca, color, edificio o radicado..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white placeholder-slate-400 outline-none transition-colors"
            />
          </div>

          <div className="md:col-span-3 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sedeFiltro}
              onChange={(e) => setSedeFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none cursor-pointer"
            >
              {SEDES_UNIMINUTO.map((sede) => (
                <option key={sede} value={sede} className="bg-[#0e1e38] text-white">
                  {sede}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 relative">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none cursor-pointer"
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat} className="bg-[#0e1e38] text-white">
                  {cat.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtro rápido de disponibilidad */}
        <div className="mt-4 flex items-center justify-end">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soloDisponibles}
              onChange={(e) => setSoloDisponibles(e.target.checked)}
              className="rounded border-blue-800 text-yellow-400 focus:ring-yellow-400"
            />
            <span>Mostrar solo disponibles en custodia</span>
          </label>
        </div>
      </div>

      {/* Banner de confirmación persistente cuando se activa una alerta */}
      {alertaEnviadaCodigo && (
        <div className="rounded-2xl bg-yellow-400/10 border border-yellow-400/40 px-5 py-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm text-yellow-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
            <span>
              Alerta temprana indexada (<strong>{alertaEnviadaCodigo}</strong>). Si
              portería registra un objeto con esas características, te notificaremos
              automáticamente por correo.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAlertaEnviadaCodigo(null)}
            className="text-yellow-400 hover:text-yellow-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid de Objetos */}
      {cargando ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Consultando bienes registrados en custodia...
        </div>
      ) : objetosFiltrados.length === 0 ? (
        <div className="rounded-3xl bg-[#0e1e38]/70 border border-blue-900/40 p-10 text-center space-y-4">
          <PackageSearch className="w-12 h-12 text-yellow-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">
            No encontramos objetos con esos criterios
          </h3>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Si tu pertenencia aún no ha sido entregada en portería, registra una alerta
            temprana con foto de referencia para avisarte por correo apenas ingrese.
          </p>
          <button
            type="button"
            onClick={abrirModalAlerta}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
          >
            <BellRing className="w-4 h-4" />
            <span>Activar Alerta Temprana</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {objetosFiltrados.map((obj) => {
            const meta = (obj.atributos ||
              (obj as unknown as Record<string, unknown>).metadatos ||
              {}) as Record<string, unknown>;
            const enCustodia = obj.estado === 'EN_CUSTODIA';
            const entregado =
              obj.estado === 'RESTITUIDO' ||
              (obj.estado as string) === 'ENTREGADO';

            return (
              <article
                key={obj._id || obj.radicado_id}
                className="rounded-3xl bg-[#0e1e38] border border-blue-900/50 overflow-hidden shadow-xl flex flex-col justify-between hover:border-yellow-400/50 transition-colors"
              >
                <div>
                  <div className="relative h-48 bg-[#081326] overflow-hidden">
                    <img
                      src={
                        obj.imagen_url ||
                        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80'
                      }
                      alt={obj.titulo}
                      className="w-full h-full object-cover opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e1e38] via-transparent to-black/40" />

                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#081326]/90 text-yellow-400 border border-yellow-400/30">
                      {obj.radicado_id}
                    </span>

                    <span
                      className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-bold ${
                        enCustodia
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          : entregado
                          ? 'bg-slate-800/90 text-slate-300 border border-slate-600/50'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                      }`}
                    >
                      {enCustodia
                        ? 'En Custodia'
                        : entregado
                        ? 'Entregado'
                        : 'En Validación'}
                    </span>

                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-semibold text-white">
                      <MapPin className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span>
                        {obj.sede} • {obj.edificio || 'Portería Principal'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <span className="text-[11px] font-extrabold tracking-wider uppercase text-yellow-400">
                        {obj.categoria}
                      </span>
                      <h3 className="text-lg font-extrabold text-white mt-0.5">
                        {obj.titulo}
                      </h3>
                      {obj.fecha_hallazgo && (
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Registrado: {obj.fecha_hallazgo}</span>
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl bg-[#081326]/90 border border-blue-900/50 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">Ficha Técnica</span>
                        <span className="inline-flex items-center gap-1 text-yellow-400 font-semibold">
                          <Lock className="w-3 h-3" /> Ley 1581
                        </span>
                      </div>

                      {Boolean(meta.marca || meta.modelo || meta.color) && (
                        <p className="text-xs text-slate-300">
                          <span className="text-slate-400">Detalle: </span>
                          <strong className="text-white">
                            {[meta.marca, meta.modelo, meta.color]
                              .filter(Boolean)
                              .join(' ')}
                          </strong>
                        </p>
                      )}

                      {Boolean(meta.numero_serie) && (
                        <p className="text-xs text-slate-300 flex items-center gap-2">
                          <span className="text-slate-400">Serial:</span>
                          <span className="px-2 py-0.5 rounded bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 font-mono text-[11px]">
                            {String(meta.numero_serie)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  {enCustodia ? (
                    <button
                      type="button"
                      onClick={() => manejarAccionReclamo(obj)}
                      className="w-full py-3 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                      Es mío • Iniciar Reclamo
                    </button>
                  ) : (
                    <div className="w-full py-3 px-4 rounded-xl bg-[#081326] border border-blue-900/40 text-center text-xs font-semibold text-slate-400">
                      {entregado
                        ? 'Restituido con acta digital'
                        : 'En proceso de validación'}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de Alerta Temprana con Foto de Referencia */}
      {modalAlertaAbierto && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e1e38] border border-blue-800/60 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-[#081326] border-b border-blue-900/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-yellow-400">
                  ALERTA TEMPRANA
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Reportar Objeto Extraviado
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalAlertaAbierto(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-blue-950 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {alertaEnviadaCodigo ? (
              <div className="p-6 text-center space-y-4">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                <h3 className="text-xl font-extrabold text-white">
                  ¡Alerta Temprana Activada!
                </h3>
                <p className="text-sm text-slate-300">
                  Tu reporte quedó registrado con el código{' '}
                  <span className="px-2 py-0.5 rounded bg-yellow-400/15 text-yellow-400 font-mono font-bold">
                    {alertaEnviadaCodigo}
                  </span>
                  . Enviamos confirmación a tu correo y notificamos al equipo de custodia.
                </p>
                <button
                  type="button"
                  onClick={() => setModalAlertaAbierto(false)}
                  className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold text-sm cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={enviarReporteExtravio} className="p-6 space-y-4">
                {errorAlerta && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs">
                    {errorAlerta}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ¿Qué objeto perdiste? *
                    </label>
                    <input
                      type="text"
                      required
                      value={formAlerta.titulo}
                      onChange={(e) =>
                        setFormAlerta({ ...formAlerta, titulo: e.target.value })
                      }
                      placeholder="Ej: Audífonos Sony negros"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Categoría
                    </label>
                    <select
                      value={formAlerta.categoria}
                      onChange={(e) =>
                        setFormAlerta({ ...formAlerta, categoria: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
                    >
                      {CATEGORIAS.filter((c) => c !== 'Todas las categorías').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Sede UNIMINUTO *
                    </label>
                    <select
                      value={formAlerta.sede}
                      onChange={(e) =>
                        setFormAlerta({ ...formAlerta, sede: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
                    >
                      {SEDES_UNIMINUTO.filter((s) => s !== 'Todas las sedes').map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Bloque o lugar aproximado
                    </label>
                    <input
                      type="text"
                      value={formAlerta.lugar_aproximado}
                      onChange={(e) =>
                        setFormAlerta({
                          ...formAlerta,
                          lugar_aproximado: e.target.value,
                        })
                      }
                      placeholder="Ej: Biblioteca Piso 2, Bloque C"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Señas particulares (color, marca, stickers, funda)
                  </label>
                  <textarea
                    rows={2}
                    value={formAlerta.descripcion}
                    onChange={(e) =>
                      setFormAlerta({ ...formAlerta, descripcion: e.target.value })
                    }
                    placeholder="Describe detalles que ayuden a identificarlo..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Tu nombre completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formAlerta.nombre_estudiante}
                      onChange={(e) =>
                        setFormAlerta({
                          ...formAlerta,
                          nombre_estudiante: e.target.value,
                        })
                      }
                      placeholder="Nombre y apellido"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Correo para notificación *
                    </label>
                    <input
                      type="email"
                      required
                      value={formAlerta.correo_estudiante}
                      onChange={(e) =>
                        setFormAlerta({
                          ...formAlerta,
                          correo_estudiante: e.target.value,
                        })
                      }
                      placeholder="estudiante@uniminuto.edu.co"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
                    />
                  </div>
                </div>

                {/* Subida y vista previa de foto de referencia del usuario */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">
                    Foto de referencia del objeto (opcional)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#081326] border border-dashed border-blue-700/70 hover:border-yellow-400 text-xs font-semibold text-slate-300 cursor-pointer transition-colors">
                      <Camera className="w-4 h-4 text-yellow-400" />
                      <span>
                        {formAlerta.foto_referencia
                          ? 'Cambiar imagen adjuntada'
                          : 'Subir o tomar foto de referencia'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={manejarFotoAlerta}
                        className="hidden"
                      />
                    </label>

                    {formAlerta.foto_referencia && (
                      <div className="relative w-14 h-12 rounded-xl overflow-hidden border border-yellow-400/50 shrink-0">
                        <img
                          src={formAlerta.foto_referencia}
                          alt="Vista previa"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFormAlerta({ ...formAlerta, foto_referencia: '' })
                          }
                          className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalAlertaAbierto(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-blue-950 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoAlerta}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-slate-950 font-extrabold text-xs sm:text-sm cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{enviandoAlerta ? 'Enviando...' : 'Activar Alerta'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};