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
  FileText,
  Printer,
  ArrowUpRight,
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

interface DatosActaRestitucion {
  numero_acta: string;
  radicado_id: string;
  titulo_bien: string;
  categoria: string;
  sede: string;
  edificio: string;
  nombre_reclamante: string;
  id_institucional: string;
  correo_reclamante: string;
  observaciones_entrega: string;
  fecha_hora: string;
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
  const [actasGuardadas, setActasGuardadas] = useState<DatosActaRestitucion[]>([]);
  const [cargandoAlertas, setCargandoAlertas] = useState(false);
  const [procesandoAlertaId, setProcesandoAlertaId] = useState<string | null>(null);
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [filtroInventario, setFiltroInventario] = useState('');

  const [objetoParaActa, setObjetoParaActa] = useState<ObjetoCustodia | null>(null);
  const [formReclamante, setFormReclamante] = useState({
    nombre_reclamante: '',
    id_institucional: '',
    correo_reclamante: '',
    observaciones_entrega:
      'Validación presencial con carné institucional y descripción física conforme.',
  });
  const [actaGenerada, setActaGenerada] = useState<DatosActaRestitucion | null>(null);
  const [procesandoRestitucion, setProcesandoRestitucion] = useState(false);

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

  const cargarActas = async () => {
    try {
      const res = await fetch('/api/actas');
      const data = await res.json();
      if (Array.isArray(data.actas)) {
        setActasGuardadas(data.actas);
      }
    } catch (err) {
      console.error('Error cargando actas:', err);
    }
  };

  useEffect(() => {
    cargarAlertas();
    cargarActas();
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

  const prellenarDesdeAlerta = (alerta: AlertaExtravio) => {
    setNuevoObjeto({
      titulo: alerta.titulo,
      categoria: CATEGORIAS.includes(alerta.categoria) ? alerta.categoria : 'OTROS',
      sede: SEDES_UNIMINUTO.includes(alerta.sede) ? alerta.sede : 'Sede Principal',
      edificio: alerta.lugar_aproximado || 'Portería Principal',
      marca: '',
      modelo: alerta.descripcion || '',
      color: '',
      numero_serie: '',
      imagen_url: alerta.foto_referencia || '',
    });
    setMensajeForm({
      tipo: 'ok',
      texto: `Datos precargados desde la alerta ${alerta.codigo_alerta}. Ajusta o completa la ficha y publica.`,
    });
    setTabActiva('registro');
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

  const abrirModalActa = (obj: ObjetoCustodia) => {
    setObjetoParaActa(obj);
    setFormReclamante({
      nombre_reclamante: '',
      id_institucional: '',
      correo_reclamante: '',
      observaciones_entrega:
        'Validación presencial con carné institucional y descripción física conforme.',
    });
  };

  const confirmarRestitucionConActa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objetoParaActa) return;

    setProcesandoRestitucion(true);
    const targetId = objetoParaActa._id || objetoParaActa.radicado_id;
    const numeroActa = `ACTA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const fechaHora = new Date().toLocaleString('es-CO', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const nuevaActa: DatosActaRestitucion = {
      numero_acta: numeroActa,
      radicado_id: objetoParaActa.radicado_id,
      titulo_bien: objetoParaActa.titulo,
      categoria: String(objetoParaActa.categoria),
      sede: objetoParaActa.sede,
      edificio: objetoParaActa.edificio || 'Portería Principal',
      nombre_reclamante: formReclamante.nombre_reclamante.trim(),
      id_institucional: formReclamante.id_institucional.trim(),
      correo_reclamante: formReclamante.correo_reclamante.trim(),
      observaciones_entrega: formReclamante.observaciones_entrega.trim(),
      fecha_hora: fechaHora,
    };

    try {
      // 1. Persistir acta en MongoDB y enviar correo de constancia
      await fetch('/api/actas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaActa),
      });

      // 2. Actualizar estado del objeto a RESTITUIDO
      if (onRestituirObjeto) {
        await onRestituirObjeto(targetId);
      } else {
        await fetch('/api/objetos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: targetId,
            radicado_id: objetoParaActa.radicado_id,
            estado: 'RESTITUIDO',
          }),
        });
        onRecargarObjetos?.();
      }

      setActasGuardadas((prev) => [nuevaActa, ...prev]);
      setActaGenerada(nuevaActa);
      setObjetoParaActa(null);
    } catch (err) {
      console.error('Error generando acta de restitución:', err);
    } finally {
      setProcesandoRestitucion(false);
    }
  };

  const imprimirActaPDF = (acta: DatosActaRestitucion) => {
    const ventana = window.open('', '_blank', 'width=820,height=920');
    if (!ventana) return;

    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>${acta.numero_acta} • Acta de Restitución FindCampus</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 36px; line-height: 1.5; }
          .header { border-bottom: 3px solid #0e1e38; padding-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
          .badge { background: #facc15; color: #090d16; font-weight: bold; padding: 4px 10px; border-radius: 6px; font-size: 12px; }
          h1 { font-size: 20px; margin: 6px 0 0; color: #0e1e38; }
          .meta { font-size: 12px; color: #475569; }
          .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-top: 18px; background: #f8fafc; }
          .box h3 { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; color: #0e1e38; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          td { padding: 6px 4px; vertical-align: top; }
          td.label { width: 34%; font-weight: bold; color: #334155; }
          .legal { margin-top: 20px; font-size: 11px; color: #475569; text-align: justify; }
          .firmas { margin-top: 56px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; font-size: 12px; }
          .linea { border-top: 1px solid #0f172a; padding-top: 6px; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <span class="badge">UNIMINUTO • FINDCAMPUS</span>
            <h1>ACTA DIGITAL DE RESTITUCIÓN DE BIEN</h1>
          </div>
          <div class="meta" style="text-align: right;">
            <strong>N.º Acta:</strong> ${acta.numero_acta}<br/>
            <strong>Radicado:</strong> ${acta.radicado_id}<br/>
            <strong>Fecha:</strong> ${acta.fecha_hora}
          </div>
        </div>

        <div class="box">
          <h3>1. Identificación del Bien Restituido</h3>
          <table>
            <tr><td class="label">Descripción del Bien:</td><td>${acta.titulo_bien}</td></tr>
            <tr><td class="label">Categoría:</td><td>${acta.categoria}</td></tr>
            <tr><td class="label">Sede / Punto de Custodia:</td><td>${acta.sede} • ${acta.edificio}</td></tr>
            <tr><td class="label">Estado Final:</td><td><strong>RESTITUIDO A TITULAR</strong></td></tr>
          </table>
        </div>

        <div class="box">
          <h3>2. Datos del Titular / Reclamante</h3>
          <table>
            <tr><td class="label">Nombre Completo:</td><td>${acta.nombre_reclamante}</td></tr>
            <tr><td class="label">ID Institucional / Cédula:</td><td>${acta.id_institucional}</td></tr>
            <tr><td class="label">Correo de Contacto:</td><td>${acta.correo_reclamante || 'No registrado'}</td></tr>
            <tr><td class="label">Validación de Custodia:</td><td>${acta.observaciones_entrega}</td></tr>
          </table>
        </div>

        <p class="legal">
          <strong>Declaración y Protección de Datos (Ley 1581 de 2012):</strong> El reclamante declara recibir a entera satisfacción el bien descrito anteriormente, acreditando su titularidad ante el personal de Seguridad y Bienestar Universitario de UNIMINUTO. Los datos personales recolectados se tratan exclusivamente para fines de trazabilidad y auditoría institucional.
        </p>

        <div class="firmas">
          <div class="linea">
            <strong>${acta.nombre_reclamante}</strong><br/>
            ID: ${acta.id_institucional}<br/>
            Firma del Reclamante
          </div>
          <div class="linea">
            <strong>Custodia y Seguridad Campus</strong><br/>
            UNIMINUTO • ${acta.sede}<br/>
            Funcionario que Entrega
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    ventana.document.close();
  };

  const alertasPendientesCount = alertas.filter((a) => a.estado !== 'RESUELTA').length;

  const objetosInventarioFiltrados = objetos.filter((o) => {
    const q = filtroInventario.trim().toLowerCase();
    if (!q) return true;
    return `${o.radicado_id} ${o.titulo} ${o.sede} ${o.estado}`.toLowerCase().includes(q);
  });

  return (
    <section className="space-y-6">
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
            onClick={() => {
              setTabActiva('custodia');
              cargarActas();
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
              tabActiva === 'custodia'
                ? 'bg-yellow-400 text-slate-950'
                : 'bg-[#081326] text-slate-300 hover:bg-blue-950 border border-blue-900/50'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Inventario y Actas ({objetos.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: REGISTRAR HALLAZGO */}
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

      {/* TAB 2: ALERTAS TEMPRANAS */}
      {tabActiva === 'alertas' && (
        <div className="rounded-3xl bg-[#0e1e38] border border-blue-900/50 p-6 space-y-5 shadow-xl">
          <div>
            <h3 className="text-lg font-extrabold text-white">
              Bitácora de Alertas Tempranas de Estudiantes
            </h3>
            <p className="text-xs text-slate-300">
              Procesa reportes activos, precarga el hallazgo en custodia o notifica por
              correo electrónico.
            </p>
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

                      <button
                        type="button"
                        onClick={() => prellenarDesdeAlerta(alerta)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Pasar a Custodia</span>
                      </button>

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
                              {procesando ? 'Enviando...' : 'Notificar Hallazgo'}
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

      {/* TAB 3: INVENTARIO Y ACTAS DIGITALES */}
      {tabActiva === 'custodia' && (
        <div className="rounded-3xl bg-[#0e1e38] border border-blue-900/50 p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-white">
                Control de Custodia y Actas de Entrega
              </h3>
              <p className="text-xs text-slate-300">
                Cada acta firmada queda respaldada en MongoDB Atlas y envía constancia al
                reclamante.
              </p>
            </div>
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
                  <th className="px-4 py-3 rounded-r-xl text-right">Acta Digital</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-950">
                {objetosInventarioFiltrados.map((obj) => {
                  const actaExistente = actasGuardadas.find(
                    (a) => a.radicado_id === obj.radicado_id
                  );

                  return (
                    <tr key={obj._id || obj.radicado_id}>
                      <td className="px-4 py-3 font-mono font-bold text-yellow-400">
                        {obj.radicado_id}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">{obj.titulo}</td>
                      <td className="px-4 py-3">{obj.sede}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            obj.estado === 'RESTITUIDO'
                              ? 'bg-slate-800 text-slate-300'
                              : obj.estado === 'EN_VALIDACION'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {obj.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {obj.estado !== 'RESTITUIDO' ? (
                          <button
                            type="button"
                            onClick={() => abrirModalActa(obj)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Restituir con Acta</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              imprimirActaPDF(
                                actaExistente || {
                                  numero_acta: `ACTA-${obj.radicado_id.replace('FIND-', '')}`,
                                  radicado_id: obj.radicado_id,
                                  titulo_bien: obj.titulo,
                                  categoria: String(obj.categoria),
                                  sede: obj.sede,
                                  edificio: obj.edificio || 'Portería Principal',
                                  nombre_reclamante: 'Titular Validado en Custodia',
                                  id_institucional: 'Verificado en Portería',
                                  correo_reclamante: '',
                                  observaciones_entrega:
                                    'Bien restituido conforme a protocolo institucional UNIMINUTO.',
                                  fecha_hora: new Date().toLocaleString('es-CO'),
                                }
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-yellow-300 font-bold cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>
                              {actaExistente ? `Imprimir ${actaExistente.numero_acta}` : 'Imprimir Copia'}
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: FORMULARIO PARA GENERAR ACTA */}
      {objetoParaActa && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e1e38] border border-yellow-400/40 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#081326] border-b border-blue-900/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-yellow-400">
                  ACTA DIGITAL • LEY 1581
                </span>
                <h3 className="text-base font-extrabold text-white">
                  Restituir: {objetoParaActa.titulo} ({objetoParaActa.radicado_id})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setObjetoParaActa(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmarRestitucionConActa} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre Completo del Reclamante *
                </label>
                <input
                  type="text"
                  required
                  value={formReclamante.nombre_reclamante}
                  onChange={(e) =>
                    setFormReclamante({
                      ...formReclamante,
                      nombre_reclamante: e.target.value,
                    })
                  }
                  placeholder="Ej. Laura Camila Gómez"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ID Institucional / Cédula *
                  </label>
                  <input
                    type="text"
                    required
                    value={formReclamante.id_institucional}
                    onChange={(e) =>
                      setFormReclamante({
                        ...formReclamante,
                        id_institucional: e.target.value,
                      })
                    }
                    placeholder="Ej. 000784512"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Correo del Reclamante (envía copia)
                  </label>
                  <input
                    type="email"
                    value={formReclamante.correo_reclamante}
                    onChange={(e) =>
                      setFormReclamante({
                        ...formReclamante,
                        correo_reclamante: e.target.value,
                      })
                    }
                    placeholder="estudiante@uniminuto.edu.co"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Observaciones de Validación Presencial
                </label>
                <textarea
                  rows={2}
                  value={formReclamante.observaciones_entrega}
                  onChange={(e) =>
                    setFormReclamante({
                      ...formReclamante,
                      observaciones_entrega: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[#081326] border border-blue-900/60 focus:border-yellow-400 text-xs text-white outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setObjetoParaActa(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-blue-950 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoRestitucion}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold text-xs sm:text-sm cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>
                    {procesandoRestitucion
                      ? 'Guardando acta...'
                      : 'Firmar y Guardar Acta'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VISTA PREVIA E IMPRESIÓN PDF */}
      {actaGenerada && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e1e38] border border-emerald-400/40 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    Acta Registrada en MongoDB
                  </h3>
                  <p className="text-xs font-mono text-yellow-400">
                    {actaGenerada.numero_acta} • Radicado {actaGenerada.radicado_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActaGenerada(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-[#081326] border border-blue-900/50 p-4 space-y-2 text-xs text-slate-300">
              <p>
                <strong>Bien entregado:</strong> {actaGenerada.titulo_bien}
              </p>
              <p>
                <strong>Sede:</strong> {actaGenerada.sede} ({actaGenerada.edificio})
              </p>
              <p>
                <strong>Reclamante:</strong> {actaGenerada.nombre_reclamante} (ID:{' '}
                {actaGenerada.id_institucional})
              </p>
              <p>
                <strong>Fecha y hora:</strong> {actaGenerada.fecha_hora}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActaGenerada(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-blue-950 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => imprimirActaPDF(actaGenerada)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold text-xs sm:text-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Guardar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

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