import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient, ObjectId } from 'mongodb';

const mongoUri = process.env.MONGODB_URI as string;
const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
const adminAlertEmail = (process.env.ADMIN_ALERT_EMAIL || '').trim();

let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(mongoUri);
  await client.connect();
  cachedClient = client;
  return client;
}

async function enviarCorreoResend(destinatario: string, asunto: string, html: string) {
  if (!resendApiKey || !destinatario) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FindCampus UNIMINUTO <onboarding@resend.dev>',
        to: [destinatario],
        subject: asunto,
        html,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('Error enviando correo con Resend:', err);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!mongoUri) {
    return res.status(500).json({ error: 'MONGODB_URI no está configurada.' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('findcampus_db');
    const coleccion = db.collection('alertas_extravio');

    // GET: Listar alertas activas o historial para el panel administrativo
    if (req.method === 'GET') {
      const alertas = await coleccion
        .find({})
        .sort({ created_at: -1 })
        .limit(60)
        .toArray();
      return res.status(200).json({ alertas });
    }

    // POST: Registrar nueva alerta temprana de objeto extraviado + notificación al admin
    if (req.method === 'POST') {
      const {
        titulo,
        categoria,
        descripcion,
        sede,
        lugar_aproximado,
        nombre_estudiante,
        correo_estudiante,
        telefono_contacto,
        foto_referencia,
      } = req.body || {};

      if (!titulo || !correo_estudiante || !sede) {
        return res.status(400).json({
          error: 'El título del objeto, la sede y el correo de contacto son obligatorios.',
        });
      }

      const codigoAlerta = `ALT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const ahora = new Date().toISOString();

      const nuevaAlerta = {
        codigo_alerta: codigoAlerta,
        titulo: String(titulo).trim(),
        categoria: String(categoria || 'OTROS').trim(),
        descripcion: String(descripcion || '').trim(),
        sede: String(sede).trim(),
        lugar_aproximado: String(lugar_aproximado || 'No especificado').trim(),
        nombre_estudiante: String(nombre_estudiante || 'Estudiante UNIMINUTO').trim(),
        correo_estudiante: String(correo_estudiante).trim().toLowerCase(),
        telefono_contacto: String(telefono_contacto || '').trim(),
        foto_referencia: foto_referencia ? String(foto_referencia) : null,
        estado: 'ACTIVA',
        created_at: ahora,
        updated_at: ahora,
      };

      const resultado = await coleccion.insertOne(nuevaAlerta);

      // Notificar al administrador por correo si está configurado Resend
      if (adminAlertEmail) {
        const htmlAdmin = `
          <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #081326; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e3a5f;">
            <div style="background: #facc15; color: #081326; padding: 16px 24px; font-weight: bold; font-size: 16px;">
              Nueva Alerta Temprana de Extravío • ${codigoAlerta}
            </div>
            <div style="padding: 24px; line-height: 1.6; font-size: 14px;">
              <p style="margin-top: 0;">Un miembro de la comunidad universitaria ha reportado un objeto extraviado:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #0e1e38; border-radius: 8px;">
                <tr><td style="padding: 8px 12px; color: #94a3b8;">Objeto:</td><td style="padding: 8px 12px; font-weight: bold;">${nuevaAlerta.titulo} (${nuevaAlerta.categoria})</td></tr>
                <tr><td style="padding: 8px 12px; color: #94a3b8;">Sede / Lugar:</td><td style="padding: 8px 12px;">${nuevaAlerta.sede} — ${nuevaAlerta.lugar_aproximado}</td></tr>
                <tr><td style="padding: 8px 12px; color: #94a3b8;">Reportante:</td><td style="padding: 8px 12px;">${nuevaAlerta.nombre_estudiante} (${nuevaAlerta.correo_estudiante})</td></tr>
                <tr><td style="padding: 8px 12px; color: #94a3b8;">Detalles:</td><td style="padding: 8px 12px;">${nuevaAlerta.descripcion || 'Sin observaciones adicionales'}</td></tr>
              </table>
              <p style="color: #cbd5e1; font-size: 13px;">Ingresa al Panel Administrativo de FindCampus para revisar coincidencias o notificar hallazgo.</p>
            </div>
          </div>
        `;
        await enviarCorreoResend(
          adminAlertEmail,
          `[FindCampus] Nueva Alerta ${codigoAlerta}: ${nuevaAlerta.titulo}`,
          htmlAdmin
        );
      }

      return res.status(201).json({
        mensaje: 'Alerta temprana registrada con éxito.',
        alerta: { ...nuevaAlerta, _id: resultado.insertedId },
      });
    }

    // PATCH: Actualizar estado de alerta (EN_REVISION / RESUELTA) y enviar correo al estudiante
    if (req.method === 'PATCH') {
      const { id, estado, nota_admin } = req.body || {};
      if (!id || !estado) {
        return res.status(400).json({ error: 'Se requiere id y estado.' });
      }

      const filtro = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { codigo_alerta: id };
      const alertaActual = await coleccion.findOne(filtro);

      if (!alertaActual) {
        return res.status(404).json({ error: 'Alerta no encontrada.' });
      }

      await coleccion.updateOne(filtro, {
        $set: {
          estado,
          nota_admin: nota_admin || '',
          updated_at: new Date().toISOString(),
        },
      });

      // Si se marca como hallada/resuelta, enviar notificación automática al estudiante
      if (estado === 'RESUELTA' && alertaActual.correo_estudiante) {
        const htmlEstudiante = `
          <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #081326; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e3a5f;">
            <div style="background: #facc15; color: #081326; padding: 16px 24px; font-weight: bold; font-size: 16px;">
              ¡Buenas noticias sobre tu reporte ${alertaActual.codigo_alerta}!
            </div>
            <div style="padding: 24px; line-height: 1.6; font-size: 14px;">
              <p>Hola <strong>${alertaActual.nombre_estudiante}</strong>,</p>
              <p>Te informamos que tu alerta por <strong>${alertaActual.titulo}</strong> en <strong>${alertaActual.sede}</strong> ha sido gestionada por nuestro equipo de custodia.</p>
              ${nota_admin ? `<div style="background: #0e1e38; border-left: 4px solid #facc15; padding: 12px 16px; margin: 16px 0; color: #e2e8f0;"><strong>Nota de Custodia:</strong> ${nota_admin}</div>` : ''}
              <p>Recuerda acercarte al punto de Bienestar Universitario o portería principal con tu carné institucional o documento de identidad para validar titularidad.</p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">FindCampus • Portal Institucional de Objetos Perdidos UNIMINUTO</p>
            </div>
          </div>
        `;
        await enviarCorreoResend(
          alertaActual.correo_estudiante,
          `[FindCampus UNIMINUTO] Actualización de tu reporte ${alertaActual.codigo_alerta}`,
          htmlEstudiante
        );
      }

      return res.status(200).json({ mensaje: 'Estado de alerta actualizado.' });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en /api/alertas:', error);
    return res.status(500).json({ error: 'Error interno al procesar alertas.' });
  }
}