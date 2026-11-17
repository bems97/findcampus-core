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
        const transporter = crearTransporterGmail();
        if (transporter) {
          await transporter
            .sendMail({
              from: `"FindCampus UNIMINUTO" <${gmailUser}>`,
              to: nuevaActa.correo_reclamante,
              subject: `Constancia de Restitución ${nuevaActa.numero_acta} • FindCampus`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #081326; color: #f8fafc; padding: 26px; border-radius: 16px; border: 1px solid #1e3a8a;">
                  <span style="display: inline-block; background: #10b981; color: #052e16; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 999px;">
                    ACTA DIGITAL DE ENTREGA • LEY 1581
                  </span>
                  <h2 style="margin: 14px 0 6px; color: #ffffff; font-size: 19px;">
                    Restitución Confirmada (${nuevaActa.numero_acta})
                  </h2>
                  <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">
                    Hola <strong>${nuevaActa.nombre_reclamante}</strong>, confirmamos la entrega formal del siguiente bien custodiado en campus:
                  </p>
                  <div style="background: #0e1e38; border: 1px solid #1e3a8a; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 13px; color: #e2e8f0;">
                    <p style="margin: 4px 0;"><strong>Bien:</strong> ${nuevaActa.titulo_bien}</p>
                    <p style="margin: 4px 0;"><strong>Radicado:</strong> ${nuevaActa.radicado_id}</p>
                    <p style="margin: 4px 0;"><strong>Sede:</strong> ${nuevaActa.sede} (${nuevaActa.edificio})</p>
                    <p style="margin: 4px 0;"><strong>ID Titular:</strong> ${nuevaActa.id_institucional}</p>
                    <p style="margin: 4px 0;"><strong>Fecha:</strong> ${nuevaActa.fecha_hora}</p>
                  </div>
                  <p style="color: #94a3b8; font-size: 11px;">
                    Conserva este comprobante como respaldo institucional de tu entrega.
                  </p>
                </div>
              `,
            })
            .catch((err) => console.error('Error enviando correo de acta:', err));
        }
      }

      return res.status(201).json({
        ok: true,
        acta: { ...nuevaActa, _id: result.insertedId.toString() },
      });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en API Actas:', error);
    return res.status(500).json({ error: 'Error conectando con la colección de actas.' });
  }
}