import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient, ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';

const uri = process.env.MONGODB_URI as string;
const gmailUser = process.env.GMAIL_USER as string;
const gmailPass = process.env.GMAIL_APP_PASSWORD as string;
const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL as string;

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
    const alertasCol = db.collection('alertas_tempranas');
    const usersCol = db.collection('usuarios');

    // GET: Listar alertas tempranas ordenadas de más reciente a más antigua
    if (req.method === 'GET') {
      const alertas = await alertasCol.find({}).sort({ created_at: -1 }).toArray();
      return res.status(200).json({ alertas });
    }

    // POST: Crear nueva alerta temprana y notificar al estudiante y a TODOS los administradores
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
      } = req.body;

      if (!titulo || !sede || !nombre_estudiante || !correo_estudiante) {
        return res.status(400).json({
          error: 'Completa el objeto, sede, tu nombre y correo para notificación.',
        });
      }

      const codigoAlerta = `ALT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const correoLimpio = String(correo_estudiante).trim().toLowerCase();

      const nuevaAlerta = {
        codigo_alerta: codigoAlerta,
        titulo: String(titulo).trim(),
        categoria: String(categoria || 'OTROS').trim(),
        descripcion: String(descripcion || '').trim(),
        sede: String(sede).trim(),
        lugar_aproximado: String(lugar_aproximado || '').trim(),
        nombre_estudiante: String(nombre_estudiante).trim(),
        correo_estudiante: correoLimpio,
        telefono_contacto: String(telefono_contacto || '').trim(),
        foto_referencia: foto_referencia || null,
        estado: 'ACTIVA' as const,
        nota_admin: '',
        created_at: new Date(),
      };

      const result = await alertasCol.insertOne(nuevaAlerta);

      const transporter = crearTransporterGmail();
      if (transporter) {
        // 1. Correo de confirmación para el estudiante
        await transporter
          .sendMail({
            from: `"FindCampus UNIMINUTO" <${gmailUser}>`,
            to: correoLimpio,
            subject: `Alerta Temprana Activada (${codigoAlerta}) • FindCampus`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #081326; color: #f8fafc; padding: 26px; border-radius: 16px; border: 1px solid #1e3a8a;">
                <span style="display: inline-block; background: #facc15; color: #090d16; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 999px;">
                  ALERTA TEMPRANA ACTIVA • ${codigoAlerta}
                </span>
                <h2 style="margin: 14px 0 8px; color: #ffffff; font-size: 20px;">
                  Reporte de Extravío Registrado
                </h2>
                <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
                  Hola <strong>${nuevaAlerta.nombre_estudiante}</strong>, tu alerta ya está visible para el equipo de Vigilancia y Custodia de UNIMINUTO.
                </p>
                <div style="background: #0e1e38; border: 1px solid #1e3a8a; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 13px; color: #e2e8f0;">
                  <p style="margin: 4px 0;"><strong>Objeto:</strong> ${nuevaAlerta.titulo} (${nuevaAlerta.categoria})</p>
                  <p style="margin: 4px 0;"><strong>Sede:</strong> ${nuevaAlerta.sede}</p>
                  <p style="margin: 4px 0;"><strong>Lugar aproximado:</strong> ${nuevaAlerta.lugar_aproximado || 'No especificado'}</p>
                  <p style="margin: 4px 0;"><strong>Señas particulares:</strong> ${nuevaAlerta.descripcion || 'Sin observaciones'}</p>
                </div>
                <p style="color: #94a3b8; font-size: 12px;">
                  Te notificaremos a este mismo correo en cuanto un bien coincidente ingrese a portería o custodia.
                </p>
              </div>
            `,
          })
          .catch((err) => console.error('Error enviando correo al estudiante:', err));

        // 2. Obtener todos los correos de administradores registrados en MongoDB + ADMIN_ALERT_EMAIL
        const adminsDb = await usersCol
          .find({ rol: 'ADMIN' }, { projection: { correo: 1 } })
          .toArray();

        const listaCorreosAdmin = new Set<string>();
        if (adminAlertEmail && adminAlertEmail.includes('@')) {
          listaCorreosAdmin.add(adminAlertEmail.trim().toLowerCase());
        }
        adminsDb.forEach((admin) => {
          if (admin.correo && String(admin.correo).includes('@')) {
            listaCorreosAdmin.add(String(admin.correo).trim().toLowerCase());
          }
        });

        const destinatariosAdmin = Array.from(listaCorreosAdmin);

        if (destinatariosAdmin.length > 0) {
          await transporter
            .sendMail({
              from: `"Alertas Custodia FindCampus" <${gmailUser}>`,
              to: destinatariosAdmin.join(', '),
              subject: `🚨 Nuevo Reporte de Pérdida [${codigoAlerta}]: ${nuevaAlerta.titulo} (${nuevaAlerta.sede})`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #081326; color: #f8fafc; padding: 26px; border-radius: 16px; border: 1px solid #eab308;">
                  <span style="display: inline-block; background: #ef4444; color: #ffffff; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.5px;">
                    NOTIFICACIÓN PARA CUSTODIA &amp; VIGILANCIA • ${codigoAlerta}
                  </span>
                  <h2 style="margin: 14px 0 8px; color: #ffffff; font-size: 20px;">
                    Nuevo Objeto Reportado como Extraviado
                  </h2>
                  <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">
                    Un estudiante ha registrado una nueva alerta temprana en el portal institucional:
                  </p>
                  <div style="background: #0e1e38; border: 1px solid #1e3a8a; border-radius: 12px; padding: 15px; margin: 16px 0; font-size: 13px; color: #e2e8f0;">
                    <p style="margin: 5px 0;"><strong>Bien extraviado:</strong> ${nuevaAlerta.titulo}</p>
                    <p style="margin: 5px 0;"><strong>Categoría:</strong> ${nuevaAlerta.categoria}</p>
                    <p style="margin: 5px 0;"><strong>Sede / Lugar:</strong> ${nuevaAlerta.sede} • ${nuevaAlerta.lugar_aproximado || 'Sin lugar específico'}</p>
                    <p style="margin: 5px 0;"><strong>Descripción / Señas:</strong> ${nuevaAlerta.descripcion || 'Sin detalles adicionales'}</p>
                    <hr style="border: 0; border-top: 1px solid #1e3a8a; margin: 10px 0;" />
                    <p style="margin: 5px 0;"><strong>Reportante:</strong> ${nuevaAlerta.nombre_estudiante}</p>
                    <p style="margin: 5px 0;"><strong>Correo contacto:</strong> ${nuevaAlerta.correo_estudiante}</p>
                    <p style="margin: 5px 0;"><strong>Foto de referencia:</strong> ${nuevaAlerta.foto_referencia ? 'Sí adjuntó imagen (disponible en Panel de Custodia)' : 'No adjuntó foto'}</p>
                  </div>
                  <p style="color: #facc15; font-size: 12px; font-weight: bold;">
                    Ingresa al Panel de Custodia &rarr; Alertas Tempranas para gestionar este reporte o pasarlo a custodia si ingresa a portería.
                  </p>
                </div>
              `,
            })
            .catch((err) => console.error('Error enviando correo a administradores:', err));
        }
      }

      return res.status(201).json({
        ok: true,
        alerta: { ...nuevaAlerta, _id: result.insertedId.toString() },
      });
    }

    // PATCH: Actualizar estado de una alerta y notificar si fue resuelta
    if (req.method === 'PATCH') {
      const { id, estado, nota_admin } = req.body;
      if (!id || !estado) {
        return res.status(400).json({ error: 'Faltan parámetros para actualizar la alerta.' });
      }

      const filtro = ObjectId.isValid(String(id))
        ? { _id: new ObjectId(String(id)) }
        : { codigo_alerta: String(id) };

      const alertaActual = await alertasCol.findOne(filtro);
      if (!alertaActual) {
        return res.status(404).json({ error: 'Alerta no encontrada.' });
      }

      await alertasCol.updateOne(filtro, {
        $set: {
          estado,
          nota_admin: nota_admin || '',
          updated_at: new Date(),
        },
      });

      if (estado === 'RESUELTA' && alertaActual.correo_estudiante) {
        const transporter = crearTransporterGmail();
        if (transporter) {
          await transporter
            .sendMail({
              from: `"FindCampus UNIMINUTO" <${gmailUser}>`,
              to: alertaActual.correo_estudiante,
              subject: `¡Buenas noticias! Posible coincidencia para tu alerta ${alertaActual.codigo_alerta} • FindCampus`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #081326; color: #f8fafc; padding: 26px; border-radius: 16px; border: 1px solid #10b981;">
                  <span style="display: inline-block; background: #10b981; color: #052e16; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 999px;">
                    HALLAZGO REPORTADO • ${alertaActual.codigo_alerta}
                  </span>
                  <h2 style="margin: 14px 0 8px; color: #ffffff; font-size: 20px;">
                    Tu objeto coincide con un ingreso en custodia
                  </h2>
                  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
                    Hola <strong>${alertaActual.nombre_estudiante}</strong>, el equipo de Custodia y Vigilancia actualizó tu reporte sobre <strong>${alertaActual.titulo}</strong>:
                  </p>
                  <div style="background: #0e1e38; border: 1px solid #10b981; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 13px; color: #e2e8f0;">
                    ${nota_admin || 'Acércate al punto de custodia de tu sede con tu carné institucional para validar la entrega.'}
                  </div>
                </div>
              `,
            })
            .catch((err) => console.error('Error enviando correo de hallazgo:', err));
        }
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en API Alertas:', error);
    return res.status(500).json({ error: 'Error procesando alertas tempranas.' });
  }
}