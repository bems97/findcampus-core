import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';

const uri = process.env.MONGODB_URI as string;
const gmailUser = process.env.GMAIL_USER as string;
const gmailPass = process.env.GMAIL_APP_PASSWORD as string;

let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

function crearTransporterGmail() {
  if (!gmailUser || !gmailPass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });
}

interface PayloadCorreoActa {
  numero_acta: string;
  radicado_id: string;
  titulo_bien: string;
  sede: string;
  edificio: string;
  nombre_reclamante: string;
  id_institucional: string;
  fecha_hora: string;
}

async function enviarCorreoConstanciaActa(destinatario: string, acta: PayloadCorreoActa) {
  const transporter = crearTransporterGmail();
  if (!transporter) {
    throw new Error('Servidor SMTP no configurado en variables de entorno.');
  }

  await transporter.sendMail({
    from: `"FindCampus UNIMINUTO" <${gmailUser}>`,
    to: destinatario,
    subject: `Constancia de Restitución ${acta.numero_acta} • FindCampus`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #081326; color: #f8fafc; padding: 26px; border-radius: 16px; border: 1px solid #1e3a8a;">
        <span style="display: inline-block; background: #10b981; color: #052e16; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 999px;">
          ACTA DIGITAL DE ENTREGA • LEY 1581
        </span>
        <h2 style="margin: 14px 0 6px; color: #ffffff; font-size: 19px;">
          Restitución Confirmada (${acta.numero_acta})
        </h2>
        <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">
          Hola <strong>${acta.nombre_reclamante}</strong>, confirmamos la entrega formal del siguiente bien custodiado en campus:
        </p>
        <div style="background: #0e1e38; border: 1px solid #1e3a8a; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 13px; color: #e2e8f0;">
          <p style="margin: 4px 0;"><strong>Bien:</strong> ${acta.titulo_bien}</p>
          <p style="margin: 4px 0;"><strong>Radicado:</strong> ${acta.radicado_id}</p>
          <p style="margin: 4px 0;"><strong>Sede:</strong> ${acta.sede} (${acta.edificio})</p>
          <p style="margin: 4px 0;"><strong>ID Titular:</strong> ${acta.id_institucional}</p>
          <p style="margin: 4px 0;"><strong>Fecha:</strong> ${acta.fecha_hora}</p>
        </div>
        <p style="color: #94a3b8; font-size: 11px;">
          Conserva este comprobante como respaldo institucional de tu entrega.
        </p>
      </div>
    `,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!uri) {
    return res.status(500).json({ error: 'Falta configurar MONGODB_URI' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('findcampus_db');
    const actasCol = db.collection('actas_restitucion');

    if (req.method === 'GET') {
      const actas = await actasCol.find({}).sort({ created_at: -1 }).toArray();
      return res.status(200).json({ actas });
    }

    if (req.method === 'POST') {
      const {
        numero_acta,
        radicado_id,
        titulo_bien,
        categoria,
        sede,
        edificio,
        nombre_reclamante,
        id_institucional,
        correo_reclamante,
        observaciones_entrega,
        fecha_hora,
      } = req.body;

      if (!numero_acta || !radicado_id || !nombre_reclamante || !id_institucional) {
        return res.status(400).json({
          error: 'Faltan datos obligatorios para registrar el acta de restitución.',
        });
      }

      const nuevaActa = {
        numero_acta: String(numero_acta).trim(),
        radicado_id: String(radicado_id).trim(),
        titulo_bien: String(titulo_bien || '').trim(),
        categoria: String(categoria || 'OTROS').trim(),
        sede: String(sede || 'Sede Principal').trim(),
        edificio: String(edificio || 'Portería Principal').trim(),
        nombre_reclamante: String(nombre_reclamante).trim(),
        id_institucional: String(id_institucional).trim(),
        correo_reclamante: String(correo_reclamante || '').trim().toLowerCase(),
        observaciones_entrega: String(observaciones_entrega || '').trim(),
        fecha_hora: String(fecha_hora || new Date().toLocaleString('es-CO')),
        created_at: new Date(),
      };

      const result = await actasCol.insertOne(nuevaActa);

      if (nuevaActa.correo_reclamante && nuevaActa.correo_reclamante.includes('@')) {
        await enviarCorreoConstanciaActa(nuevaActa.correo_reclamante, nuevaActa).catch((err) =>
          console.error('Error enviando correo de acta:', err)
        );
      }

      return res.status(201).json({
        ok: true,
        acta: { ...nuevaActa, _id: result.insertedId.toString() },
      });
    }

    if (req.method === 'PATCH') {
      const { radicado_id, numero_acta, correo_destino, acta_fallback } = req.body;

      const correoLimpio = String(correo_destino || '').trim().toLowerCase();
      if (!correoLimpio || !correoLimpio.includes('@')) {
        return res.status(400).json({ error: 'Debes indicar un correo electrónico válido.' });
      }

      const actaDb = await actasCol.findOne(
        numero_acta ? { numero_acta } : { radicado_id }
      );

      const datosEnviar: PayloadCorreoActa | null = actaDb
        ? {
            numero_acta: String(actaDb.numero_acta),
            radicado_id: String(actaDb.radicado_id),
            titulo_bien: String(actaDb.titulo_bien || ''),
            sede: String(actaDb.sede || 'Sede Principal'),
            edificio: String(actaDb.edificio || 'Portería Principal'),
            nombre_reclamante: String(actaDb.nombre_reclamante || 'Titular'),
            id_institucional: String(actaDb.id_institucional || 'Verificado'),
            fecha_hora: String(actaDb.fecha_hora || new Date().toLocaleString('es-CO')),
          }
        : acta_fallback || null;

      if (!datosEnviar) {
        return res.status(404).json({ error: 'No se encontró el acta para reenviar.' });
      }

      await enviarCorreoConstanciaActa(correoLimpio, datosEnviar);

      if (actaDb) {
        await actasCol.updateOne(
          { _id: actaDb._id },
          { $set: { correo_reclamante: correoLimpio, ultimo_envio: new Date() } }
        );
      }

      return res.status(200).json({
        ok: true,
        mensaje: `Constancia ${datosEnviar.numero_acta} enviada a ${correoLimpio}.`,
      });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en API Actas:', error);
    return res.status(500).json({ error: 'Error procesando solicitud de actas.' });
  }
}