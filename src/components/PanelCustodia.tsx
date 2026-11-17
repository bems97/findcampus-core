import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Database,
  UploadCloud,
  CheckCircle2,
  FileSignature,
  Hash,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import type {
  ObjetoCustodia,
  CategoriaObjeto,
  AtributosPolimorficos,
} from '../types/campus';

interface PanelCustodiaProps {
  objetos: ObjetoCustodia[];
  onRegistrarObjeto: (nuevoObjeto: ObjetoCustodia) => void;
  onRestituirObjeto: (objetoId: string) => void;
}

const IMAGENES_EJEMPLO: Record<CategoriaObjeto, string> = {
  ELECTRONICA:
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
  BILLETERA:
    'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80',
  DOCUMENTOS:
    'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80',
  ACCESORIOS:
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
};

export const PanelCustodia: React.FC<PanelCustodiaProps> = ({
  objetos,
  onRegistrarObjeto,
  onRestituirObjeto,
}) => {
  const [categoria, setCategoria] = useState<CategoriaObjeto>('ELECTRONICA');
  const [titulo, setTitulo] = useState('');
  const [sede, setSede] = useState<'Sede Principal' | 'Sede Sur' | 'Sede Norte'>('Sede Principal');
  const [edificio, setEdificio] = useState('');

  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [incluyeCargador, setIncluyeCargador] = useState(true);

  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [cantidadDocumentos, setCantidadDocumentos] = useState(2);
  const [contieneEfectivo, setContieneEfectivo] = useState(false);

  const [tipoDocumento, setTipoDocumento] = useState('');
  const [titularEnmascarado, setTitularEnmascarado] = useState('');
  const [descripcionDetalle, setDescripcionDetalle] = useState('');

  const [archivoNombre, setArchivoNombre] = useState<string>('evidencia_porteria_01.jpg');
  const [registroExitoso, setRegistroExitoso] = useState<string | null>(null);

  const atributosActivos: AtributosPolimorficos = useMemo(() => {
    if (categoria === 'ELECTRONICA') {
      return {
        marca: marca || 'Dell',
        modelo: modelo || 'Latitude 5420',
        numero_serie: numeroSerie || 'DL-9941-8820Z',
        incluye_cargador: incluyeCargador,
      };
    }
    if (categoria === 'BILLETERA') {
      return {
        material: material || 'Lona impermeable',
        color: color || 'Negro mate',
        cantidad_documentos: cantidadDocumentos,
        contiene_efectivo: contieneEfectivo,
      };
    }
    return {
      tipo_documento: tipoDocumento || (categoria === 'DOCUMENTOS' ? 'Cédula / Carné' : 'Reloj / Llaves'),
      titular_enmascarado: titularEnmascarado || 'C.C. 1.014.***.902',
      descripcion_detalle: descripcionDetalle || 'Hallado en puesto de estudio',
    };
  }, [
    categoria,
    marca,
    modelo,
    numeroSerie,
    incluyeCargador,
    material,
    color,
    cantidadDocumentos,
    contieneEfectivo,
    tipoDocumento,
    titularEnmascarado,
    descripcionDetalle,
  ]);

  const documentoBsonPreview = useMemo(() => {
    const hashSimulado = `sha256:${Math.abs(
      (titulo + edificio + categoria + archivoNombre)
        .split('')
        .reduce((acc, c) => acc + c.charCodeAt(0) * 31, 7)
    )
      .toString(16)
      .padEnd(16, 'a94f')}...`;

    return {
      _id: { $oid: '6730cf12b8e4a10019f8c210' },
      radicado_id: `FIND-2026-0${484 + objetos.length}`,
      categoria,
      titulo: titulo || `Nuevo registro (${categoria.toLowerCase()})`,
      sede,
      edificio: edificio || 'Bloque A - Piso 1',
      estado: 'EN_CUSTODIA',
      data_lake_ref: {
        zona_raw: `s3://findcampus-raw/2026/11/${archivoNombre}`,
        zona_plata_webp: `s3://findcampus-std/webp/${archivoNombre.replace(/\.[^.]+$/, '.webp')}`,
        integridad: hashSimulado,
        exif_purgado: true,
      },
      atributos_polimorficos: atributosActivos,
    };
  }, [categoria, titulo, sede, edificio, archivoNombre, atributosActivos, objetos.length]);

  const manejarRegistro = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevoRadicado = `FIND-2026-0${484 + objetos.length}`;
    const nuevoObjeto: ObjetoCustodia = {
      _id: `6730cf12b8e4a10019f8c${objetos.length + 200}`,
      radicado_id: nuevoRadicado,
      categoria,
      titulo: titulo.trim() || `${categoria} registrado en ${sede}`,
      sede,
      edificio: edificio.trim() || 'Portería Central',
      fecha_hallazgo: new Date().toISOString().slice(0, 16).replace('T', ' '),
      estado: 'EN_CUSTODIA',
      evidencia_lake_url: IMAGENES_EJEMPLO[categoria],
      hash_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      atributos: atributosActivos,
    };

    onRegistrarObjeto(nuevoObjeto);
    setRegistroExitoso(
      `Documento BSON insertado en MongoDB (${nuevoRadicado}) y evidencia sellada en Data Lake Zona Bronce.`
    );
    setTitulo('');
    setEdificio('');
    setTimeout(() => setRegistroExitoso(null), 5000);
  };

  return (
    <div className="space-y-6">
      {registroExitoso && (
        <div className="p-4 rounded-2xl bg-yellow-400/15 border border-yellow-400/40 flex items-center gap-3 text-yellow-200 text-sm">
          <CheckCircle2 className="w-5 h-5 text-yellow-400 shrink-0" />
          <span>{registroExitoso}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulario Polimórfico (7 cols) */}
        <div className="lg:col-span-7 bg-zinc-900 rounded-3xl border border-zinc-800 p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-white">
                Radicación en Ventanilla de Custodia
              </h2>
              <p className="text-xs text-zinc-400">
                El esquema muta dinámicamente según la categoría sin generar columnas NULL
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-yellow-400/15 text-yellow-400 text-xs font-bold border border-yellow-400/30">
              Rol: Custodio MFA
            </span>
          </div>

          <form onSubmit={manejarRegistro} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                1. Selecciona la Categoría (Muta el esquema BSON)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['ELECTRONICA', 'BILLETERA', 'DOCUMENTOS', 'ACCESORIOS'] as CategoriaObjeto[]).map(
                  (cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategoria(cat)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        categoria === cat
                          ? 'bg-yellow-400 text-zinc-950 border-yellow-400 shadow-sm'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-100 hover:border-zinc-700'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Descripción General del Hallazgo
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Portátil Dell Latitude gris con calcomanía"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Sede</label>
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value as typeof sede)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-yellow-400"
                >
                  <option value="Sede Principal">Sede Principal</option>
                  <option value="Sede Sur">Sede Sur</option>
                  <option value="Sede Norte">Sede Norte</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Ubicación Exacta (Bloque / Aula)
                </label>
                <input
                  type="text"
                  required
                  value={edificio}
                  onChange={(e) => setEdificio(e.target.value)}
                  placeholder="Ej: Torre A - Salón 405"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-yellow-400/5 border border-yellow-400/25 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Atributos Específicos ({categoria})
                </span>
                <span className="text-[11px] font-mono text-zinc-400">subdoc: atributos</span>
              </div>

              {categoria === 'ELECTRONICA' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Marca (Ej: Lenovo, Dell, Apple)"
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-yellow-400"
                  />
                  <input
                    type="text"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Modelo (Ej: IdeaPad 5)"
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-yellow-400"
                  />
                  <input
                    type="text"
                    value={numeroSerie}
                    onChange={(e) => setNumeroSerie(e.target.value)}
                    placeholder="Serial / IMEI (Se censura en público)"
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-yellow-300 text-xs font-mono focus:outline-none focus:border-yellow-400"
                  />
                  <label className="flex items-center gap-2 text-xs text-zinc-300 px-2">
                    <input
                      type="checkbox"
                      checked={incluyeCargador}
                      onChange={(e) => setIncluyeCargador(e.target.checked)}
                      className="accent-yellow-400"
                    />
                    Incluye cargador o funda
                  </label>
                </div>
              )}

              {categoria === 'BILLETERA' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="Material (Ej: Cuero, lona)"
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-yellow-400"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Color predominante"
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-yellow-400"
                  />
                  <input
                    type="number"
                    min={0}
                    value={cantidadDocumentos}
                    onChange={(e) => setCantidadDocumentos(Number(e.target.value))}
                    placeholder="Cantidad de documentos"
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-yellow-400"
                  />
                  <label className="flex items-center gap-2 text-xs text-zinc-300 px-2">
                    <input
                      type="checkbox"
                      checked={contieneEfectivo}
                      onChange={(e) => setContieneEfectivo(e.target.checked)}
                      className="accent-yellow-400"
                    />
                    Contiene dinero en efectivo
                  </label>
                </div>
              )}

              {(categoria === 'DOCUMENTOS' || categoria === 'ACCESORIOS') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                    placeholder="Tipo (Ej: Carné, Cédula, Llaves)"
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-yellow-400"
                  />
                  <input
                    type="text"
                    value={titularEnmascarado}
                    onChange={(e) => setTitularEnmascarado(e.target.value)}
                    placeholder="ID enmascarado (Ej: C.C. 1.029.***.756)"
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-yellow-300 text-xs font-mono focus:outline-none focus:border-yellow-400"
                  />
                  <input
                    type="text"
                    value={descripcionDetalle}
                    onChange={(e) => setDescripcionDetalle(e.target.value)}
                    placeholder="Seña particular privada"
                    className="sm:col-span-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-yellow-400"
                  />
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-dashed border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-5 h-5 text-yellow-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-zinc-200">
                    Evidencia Fotográfica &rarr; MinIO S3 (Presigned URL)
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Ingesta WORM en Zona Bronce + limpieza EXIF en Zona Plata
                  </p>
                </div>
              </div>
              <input
                type="text"
                value={archivoNombre}
                onChange={(e) => setArchivoNombre(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-yellow-300 w-full sm:w-48 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-sm font-extrabold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Insertar Documento BSON y Sellar SHA-256</span>
            </button>
          </form>
        </div>

        {/* Inspector BSON en Vivo (5 cols) */}
        <div className="lg:col-span-5 bg-zinc-950 text-zinc-100 rounded-3xl border border-zinc-800 p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold tracking-wide uppercase text-zinc-200">
                  Documento BSON en Vivo (MongoDB)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-yellow-400/15 text-yellow-400 border border-yellow-400/30 font-mono text-[11px] font-bold">
                0 campos NULL
              </span>
            </div>

            <pre className="text-xs font-mono text-yellow-300 bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 overflow-x-auto leading-relaxed">
              {JSON.stringify(documentoBsonPreview, null, 2)}
            </pre>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-yellow-400" /> Firma SHA-256 automática
            </span>
            <span className="font-mono text-zinc-300">WiredTiger AES-256</span>
          </div>
        </div>
      </div>

      {/* Tabla de Custodia */}
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">
              Bitácora Activa de Custodia y Actas Digitales
            </h3>
            <p className="text-xs text-zinc-400">
              Formaliza la entrega física generando acta PDF inmutable con validación OTP
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-400">
            <ShieldCheck className="w-4 h-4" /> AuditLogs Inmutables
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-bold uppercase text-zinc-400">
                <th className="py-3 px-3">Radicado</th>
                <th className="py-3 px-3">Objeto / Categoría</th>
                <th className="py-3 px-3">Ubicación</th>
                <th className="py-3 px-3">Hash Evidencia</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 text-xs">
              {objetos.map((obj) => (
                <tr key={obj._id} className="hover:bg-zinc-950/60">
                  <td className="py-3 px-3 font-mono font-bold text-yellow-400">
                    {obj.radicado_id}
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-zinc-100">{obj.titulo}</p>
                    <span className="text-[11px] text-zinc-500">{obj.categoria}</span>
                  </td>
                  <td className="py-3 px-3 text-zinc-300">
                    {obj.sede} • {obj.edificio}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-zinc-500">
                    {obj.hash_sha256.slice(0, 14)}...
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        obj.estado === 'EN_CUSTODIA'
                          ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30'
                          : obj.estado === 'EN_VALIDACION'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {obj.estado}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {obj.estado !== 'RESTITUIDO' ? (
                      <button
                        onClick={() => onRestituirObjeto(obj._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-extrabold transition-colors cursor-pointer"
                      >
                        <FileSignature className="w-3.5 h-3.5" />
                        <span>Emitir Acta OTP</span>
                      </button>
                    ) : (
                      <span className="text-zinc-500 font-medium">Acta Sellada</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};