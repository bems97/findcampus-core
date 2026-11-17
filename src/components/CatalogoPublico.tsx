import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  Clock,
  Lock,
  CheckCircle2,
  SlidersHorizontal,
  ShieldAlert,
  Sparkles,
  FileCheck2,
  X,
  BellRing,
} from 'lucide-react';
import type { ObjetoCustodia } from '../types/campus';

interface CatalogoPublicoProps {
  objetos: ObjetoCustodia[];
  onSolicitarReclamo: (objetoId: string, correoEstudiante: string, pruebaPropiedad: string) => void;
}

function enmascararSerial(serial?: string): string {
  if (!serial) return 'N/A';
  if (serial.length <= 6) return '****' + serial.slice(-2);
  return `${serial.slice(0, 4)}****${serial.slice(-4)}`;
}

export const CatalogoPublico: React.FC<CatalogoPublicoProps> = ({
  objetos,
  onSolicitarReclamo,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [sedeFiltro, setSedeFiltro] = useState<string>('TODAS');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS');
  const [objetoSeleccionado, setObjetoSeleccionado] = useState<ObjetoCustodia | null>(null);
  const [modalAlertaAbierto, setModalAlertaAbierto] = useState(false);
  const [correoEstudiante, setCorreoEstudiante] = useState('');
  const [pruebaPropiedad, setPruebaPropiedad] = useState('');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const resultados = useMemo(() => {
    return objetos.filter((obj) => {
      const texto = `${obj.titulo} ${obj.edificio} ${obj.radicado_id} ${
        obj.atributos.marca ?? ''
      } ${obj.atributos.color ?? ''}`.toLowerCase();
      const coincideTexto = texto.includes(busqueda.toLowerCase());
      const coincideSede = sedeFiltro === 'TODAS' || obj.sede === sedeFiltro;
      const coincideCategoria = categoriaFiltro === 'TODAS' || obj.categoria === categoriaFiltro;
      return coincideTexto && coincideSede && coincideCategoria;
    });
  }, [objetos, busqueda, sedeFiltro, categoriaFiltro]);

  const manejarEnvioReclamo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objetoSeleccionado || !correoEstudiante.trim() || !pruebaPropiedad.trim()) return;

    onSolicitarReclamo(objetoSeleccionado._id, correoEstudiante, pruebaPropiedad);
    setMensajeExito(
      `Solicitud vinculada al radicado ${objetoSeleccionado.radicado_id}. Revisa tu correo institucional (${correoEstudiante}) para validar el código OTP.`
    );
    setObjetoSeleccionado(null);
    setCorreoEstudiante('');
    setPruebaPropiedad('');
    setTimeout(() => setMensajeExito(null), 6000);
  };

  const manejarAlertaPerdida = (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeExito(
      'Alerta temprana indexada. Si portería registra un objeto con esas características, te notificaremos automáticamente.'
    );
    setModalAlertaAbierto(false);
    setCorreoEstudiante('');
    setPruebaPropiedad('');
    setTimeout(() => setMensajeExito(null), 6000);
  };

  return (
    <div className="space-y-8">
      {/* Hero Negro Mate con Borde Amarillo */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-7 sm:p-10 shadow-2xl">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-yellow-400/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/15 border border-yellow-400/30 text-yellow-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Búsqueda Indexada • Protección Habeas Data Ley 1581</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              ¿Perdiste algo en el campus? <span className="text-yellow-400">Encuéntralo aquí.</span>
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Consulta en tiempo real los bienes custodiados en porterías y bienestar universitario.
              Seriales e identificaciones están cifrados hasta validar tu titularidad.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={() => setModalAlertaAbierto(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs sm:text-sm font-extrabold shadow-lg shadow-yellow-400/15 transition-all cursor-pointer"
            >
              <BellRing className="w-4 h-4" />
              <span>Reportar Objeto Extraviado</span>
            </button>
            <div className="px-4 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
              <span className="text-xs text-zinc-400">Tasa de recuperación: </span>
              <strong className="text-sm text-yellow-400 font-extrabold">86.4%</strong>
            </div>
          </div>
        </div>

        {/* Barra de Búsqueda Oscura */}
        <div className="relative mt-8 bg-zinc-950 p-2.5 rounded-2xl border border-zinc-800 grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por marca, color, edificio o radicado..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="md:col-span-3 relative">
            <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={sedeFiltro}
              onChange={(e) => setSedeFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-yellow-400"
            >
              <option value="TODAS">Todas las sedes</option>
              <option value="Sede Principal">Sede Principal</option>
              <option value="Sede Sur">Sede Sur</option>
              <option value="Sede Norte">Sede Norte</option>
            </select>
          </div>

          <div className="md:col-span-3 relative">
            <SlidersHorizontal className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-yellow-400"
            >
              <option value="TODAS">Todas las categorías</option>
              <option value="ELECTRONICA">Electrónica</option>
              <option value="BILLETERA">Billeteras</option>
              <option value="DOCUMENTOS">Documentos</option>
              <option value="ACCESORIOS">Accesorios</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notificación */}
      {mensajeExito && (
        <div className="p-4 rounded-2xl bg-yellow-400/15 border border-yellow-400/40 flex items-center gap-3 text-yellow-200 text-sm">
          <CheckCircle2 className="w-5 h-5 text-yellow-400 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Grid de Tarjetas Negro Mate */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resultados.map((item) => (
          <article
            key={item._id}
            className="group bg-zinc-900 rounded-3xl border border-zinc-800 hover:border-yellow-400/60 overflow-hidden shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
          >
            <div className="relative h-52 bg-zinc-950 overflow-hidden">
              <img
                src={item.evidencia_lake_url}
                alt={item.titulo}
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
              <div className="absolute top-3.5 left-3.5">
                <span className="px-3 py-1 rounded-xl bg-zinc-950/90 backdrop-blur-md border border-zinc-700 text-yellow-400 font-mono text-xs font-bold">
                  {item.radicado_id}
                </span>
              </div>
              <div className="absolute top-3.5 right-3.5">
                {item.estado === 'EN_CUSTODIA' && (
                  <span className="px-3 py-1 rounded-full bg-yellow-400 text-zinc-950 text-xs font-extrabold shadow-sm">
                    Disponible
                  </span>
                )}
                {item.estado === 'EN_VALIDACION' && (
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-zinc-950 text-xs font-extrabold shadow-sm">
                    Validando OTP
                  </span>
                )}
                {item.estado === 'RESTITUIDO' && (
                  <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold">
                    Entregado
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-zinc-200 text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-yellow-400" />
                  {item.sede} • {item.edificio}
                </span>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div>
                  <span className="text-[11px] font-extrabold tracking-widest uppercase text-yellow-400">
                    {item.categoria}
                  </span>
                  <h2 className="text-lg font-bold text-white leading-snug mt-0.5">
                    {item.titulo}
                  </h2>
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" /> Registrado: {item.fecha_hallazgo}
                  </p>
                </div>

                {/* Ficha Técnica con Censura Ley 1581 */}
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                    <span className="font-bold text-zinc-300">Ficha Técnica</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-yellow-400 font-semibold">
                      <Lock className="w-3 h-3" /> Ley 1581
                    </span>
                  </div>

                  {item.categoria === 'ELECTRONICA' && (
                    <>
                      <p className="text-zinc-400">
                        Equipo: <strong className="text-zinc-100">{item.atributos.marca} {item.atributos.modelo}</strong>
                      </p>
                      <p className="text-zinc-400">
                        Serial:{' '}
                        <code className="px-1.5 py-0.5 rounded-md bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 font-mono font-bold">
                          {enmascararSerial(item.atributos.numero_serie)}
                        </code>
                      </p>
                    </>
                  )}

                  {item.categoria === 'BILLETERA' && (
                    <>
                      <p className="text-zinc-400">
                        Material: <strong className="text-zinc-100">{item.atributos.material} ({item.atributos.color})</strong>
                      </p>
                      <p className="text-zinc-400">
                        Documentos: <strong className="text-zinc-100">{item.atributos.cantidad_documentos} unidades protegidas</strong>
                      </p>
                    </>
                  )}

                  {(item.categoria === 'DOCUMENTOS' || item.categoria === 'ACCESORIOS') && (
                    <>
                      <p className="text-zinc-400">
                        Tipo: <strong className="text-zinc-100">{item.atributos.tipo_documento || 'Accesorio'}</strong>
                      </p>
                      {item.atributos.titular_enmascarado && (
                        <p className="text-zinc-400">
                          Titular:{' '}
                          <code className="px-1.5 py-0.5 rounded-md bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 font-mono font-bold">
                            {item.atributos.titular_enmascarado}
                          </code>
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div>
                {item.estado === 'EN_CUSTODIA' ? (
                  <button
                    onClick={() => setObjetoSeleccionado(item)}
                    className="w-full py-3 px-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-sm font-extrabold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>Es mío • Iniciar Reclamo</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-500 text-sm font-semibold cursor-not-allowed"
                  >
                    {item.estado === 'EN_VALIDACION'
                      ? 'Validación OTP en curso'
                      : 'Restituido con acta digital'}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Modal Reclamo */}
      {objetoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-yellow-400">
                  {objetoSeleccionado.radicado_id}
                </span>
                <h3 className="text-lg font-bold text-white">Validar Titularidad</h3>
              </div>
              <button
                onClick={() => setObjetoSeleccionado(null)}
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-start gap-2.5 text-xs text-yellow-200">
              <ShieldAlert className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p>
                Ingresa tu correo institucional y un dato privado (serial completo o seña única)
                para enviarte el código OTP de retiro en portería.
              </p>
            </div>

            <form onSubmit={manejarEnvioReclamo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Correo Institucional
                </label>
                <input
                  type="email"
                  required
                  value={correoEstudiante}
                  onChange={(e) => setCorreoEstudiante(e.target.value)}
                  placeholder="nombre.apellido@uniminuto.edu.co"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Prueba de Propiedad Privada
                </label>
                <textarea
                  required
                  rows={3}
                  value={pruebaPropiedad}
                  onChange={(e) => setPruebaPropiedad(e.target.value)}
                  placeholder="Describe el serial completo, contenido exacto o fondo de pantalla..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setObjetoSeleccionado(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-sm font-extrabold cursor-pointer"
                >
                  Enviar Solicitud OTP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alerta Preventiva */}
      {modalAlertaAbierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-yellow-400">Alerta Temprana</span>
                <h3 className="text-lg font-bold text-white">Reportar Objeto Extraviado</h3>
              </div>
              <button
                onClick={() => setModalAlertaAbierto(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={manejarAlertaPerdida} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Correo Institucional para Notificación
                </label>
                <input
                  type="email"
                  required
                  value={correoEstudiante}
                  onChange={(e) => setCorreoEstudiante(e.target.value)}
                  placeholder="estudiante@uniminuto.edu.co"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  ¿Qué perdiste y en qué bloque estuviste?
                </label>
                <textarea
                  required
                  rows={3}
                  value={pruebaPropiedad}
                  onChange={(e) => setPruebaPropiedad(e.target.value)}
                  placeholder="Ej: Audífonos Sony negros en la Biblioteca Piso 2..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAlertaAbierto(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-sm font-extrabold cursor-pointer"
                >
                  Activar Alerta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};