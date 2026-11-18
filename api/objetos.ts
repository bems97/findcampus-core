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

function extraerPalabrasClave(texto: string): string[] {
  const stopWords = new Set([
    'para',
    'con',
    'sin',
    'los',
    'las',
    'del',
    'una',
    'uno',
    'unos',
    'unas',
    'por',
    'que',
    'como',
    'sede',
    'color',
    'marca',
  ]);
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!uri) {
    return res
      .status(500)
      .json({ error: 'Falta configurar MONGODB_URI en las variables de entorno.' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('findcampus_db');
    const collection = db.collection('objetos_custodia');
    const alertasCol = db.collection('alertas_tempranas');
    const usersCol = db.collection('usuarios');

    // GET: Obtener todos los objetos registrados en MongoDB Atlas
    if (req.method === 'GET') {
      const docs = await collection.find({}).sort({ fecha_hallazgo: -1 }).toArray();
      const formateados = docs.map((d) => ({
        ...d,
        _id: d._id.toString(),
      }));
      return res.status(200).json(formateados);
    }

    // POST: Insertar nuevo hallazgo + Match Automático con Alertas Tempranas Activas
    if (req.method === 'POST') {
      const { _id, ...datosDocumento } = req.body;
      const resultado = await collection.insertOne({
        ...datosDocumento,
        created_at: new Date(),
      });

      // Cruce inteligente contra alertas tempranas activas
      try {
        const transporter = crearTransporterGmail();
        if (transporter && datosDocumento.titulo) {
          const alertasActivas = await alertasCol
            .find({ estado: { $in: ['ACTIVA', 'EN_REVISION'] } })
            .toArray();

          const textoObjeto = [
            datosDocumento.titulo,
            datosDocumento.atributos?.marca,
            datosDocumento.atributos?.modelo,
            datosDocumento.atributos?.color,
          ]
            .filter(Boolean)
            .join(' ');

          const palabrasObjeto = extraerPalabrasClave(textoObjeto);

          const coincidencias = alertasActivas.filter((alerta) => {
            const mismaCategoria =
              String(alerta.categoria || '').toUpperCase() ===
              String(datosDocumento.categoria || '').toUpperCase();
            const mismaSede =
              String(alerta.sede || '').toLowerCase() ===
              String(datosDocumento.sede || '').toLowerCase();

            const textoAlerta = `${alerta.titulo || ''} ${alerta.descripcion || ''}`;
            const palabrasAlerta = extraerPalabrasClave(textoAlerta);

            const interseccion = palabrasAlerta.filter((p) => palabrasObjeto.includes(p));

            // Coincide si comparte al menos 1 palabra clave + (misma categoría o sede)
            // o si comparte 2 o más palabras clave
            return (
              (interseccion.length >= 1 && (mismaCategoria || mismaSede)) ||
              interseccion.length >= 2
            );
          });

          for (const alerta of coincidencias) {
            if (!alerta.correo_estudiante || !String(alerta.correo_estudiante).includes('@')) {
              continue;
            }

            await transporter
              .sendMail({
                from: `"FindCampus Match Inteligente" <${gmailUser}>`,
                to: String(alerta.correo_estudiante).trim().toLowerCase(),
                subject: `🔍 Posible coincidencia con tu alerta ${alerta.codigo_alerta}: ${datosDocumento.titulo}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background: #081326; color: #f8fafc; padding: 26px; border-radius: 16px; border: 1px solid #facc15;">
                    <span style="display: inline-block; background: #facc15; color: #090d16; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 999px;">
                      MATCH AUTOMÁTICO • ALERTA ${alerta.codigo_alerta}
                    </span>
                    <h2 style="margin: 14px 0 8px; color: #ffffff; font-size: 20px;">
                      Acaba de ingresar un objeto similar al tuyo
                    </h2>
                    <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">
                      Hola <strong>${alerta.nombre_estudiante}</strong>, nuestro sistema detectó una coincidencia automática entre tu reporte (<em>"${alerta.titulo}"</em>) y un bien recién registrado en custodia:
                    </p>
                    <div style="background: #0e1e38; border: 1px solid #1e3a8a; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 13px; color: #e2e8f0;">
                      <p style="margin: 4px 0;"><strong>Radicado Custodia:</strong> ${datosDocumento.radicado_id}</p>
                      <p style="margin: 4px 0;"><strong>Bien Encontrado:</strong> ${datosDocumento.titulo}</p>
                      <p style="margin: 4px 0;"><strong>Sede / Punto:</strong> ${datosDocumento.sede} • ${datosDocumento.edificio || 'Portería Principal'}</p>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px;">
                      Ingresa al catálogo público de FindCampus, ubica el radicado <strong>${datosDocumento.radicado_id}</strong> y pulsa <strong>Solicitar Reclamo</strong> para iniciar la validación en portería.
                    </p>
                  </div>
                `,
              })
              .catch((err) => console.error('Error enviando correo de match:', err));
          }
        }
      } catch (matchErr) {
        console.error('Error en motor de match automático:', matchErr);
      }

      return res.status(201).json({
        ...datosDocumento,
        _id: resultado.insertedId.toString(),
      });
    }

    // PATCH: Actualizar estado de custodia (EN_VALIDACION / RESTITUIDO) + Notificaciones de Reclamo
    if (req.method === 'PATCH') {
      const { id, estado, reclamante } = req.body;
      if (!id || !estado) {
        return res.status(400).json({ error: 'Se requiere id y estado.' });
      }

      const filtro = ObjectId.isValid(String(id))
        ? { _id: new ObjectId(String(id)) }
        : { radicado_id: String(id) };

      const objetoActual = await collection.findOne(filtro);

      const updateFields: Record<string, unknown> = {
        estado,
        updated_at: new Date(),
      };

      if (reclamante) {
        updateFields.reclamante_info = reclamante;
      }

      await collection.updateOne(filtro, { $set: updateFields });

      // Si es una solicitud de reclamo (EN_VALIDACION), notificar a admins y al reclamante
      if (estado === 'EN_VALIDACION' && objetoActual) {
        try {
          const transporter = crearTransporterGmail();
          if (transporter) {
            const adminsDb = await usersCol
              .find({ rol: 'ADMIN' }, { projection: { correo: 1 } })
              .toArray();

            const listaAdmins = new Set<string>();
            if (adminAlertEmail && adminAlertEmail.includes('@')) {
              listaAdmins.add(adminAlertEmail.trim().toLowerCase());
            }
            adminsDb.forEach((a) => {
              if (a.correo && String(a.correo).includes('@')) {
                listaAdmins.add(String(a.correo).trim().toLowerCase());
              }
            });

            const nombreRec = reclamante?.nombre || 'Estudiante / Usuario Portal';
            const idInstRec = reclamante?.codigo_institucional || 'No especificado';
            const correoRec = reclamante?.correo
              ? String(reclamante.correo).trim().toLowerCase()
              : '';
            const notaRec = reclamante?.nota || 'Sin observaciones adicionales';

            const destinatariosAdmin = Array.from(listaAdmins);
            if (destinatariosAdmin.length > 0) {
              await transporter
                .sendMail({
                  from: `"Custodia FindCampus" <${gmailUser}>`,
                  to: destinatariosAdmin.join(', '),
                  subject: `📩 Solicitud de Reclamo [${objetoActual.radicado_id}]: ${objetoActual.titulo}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background: #081326; color: #f8fafc; padding: 26px; border-radius: 16px; border: 1px solid #f59e0b;">
                      <span style="display: inline-block; background: #f59e0b; color: #090d16; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 999px;">
                        SOLICITUD DE RECLAMO • EN VALIDACIÓN
                      </span>
                      <h2 style="margin: 14px 0 8px; color: #ffffff; font-size: 20px;">
                        Un usuario ha reclamado un objeto en custodia
                      </h2>
                      <div style="background: #0e1e38; border: 1px solid #1e3a8a; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 13px; color: #e2e8f0;">
                        <p style="margin: 4px 0;"><strong>Radicado:</strong> ${objetoActual.radicado_id}</p>
                        <p style="margin: 4px 0;"><strong>Bien:</strong> ${objetoActual.titulo}</p>
                        <p style="margin: 4px 0;"><strong>Sede:</strong> ${objetoActual.sede} (${objetoActual.edificio || 'Portería'})</p>
                        <hr style="border: 0; border-top: 1px solid #1e3a8a; margin: 10px 0;" />
                        <p style="margin: 4px 0;"><strong>Solicitante:</strong> ${nombreRec}</p>
                        <p style="margin: 4px 0;"><strong>ID Institucional:</strong> ${idInstRec}</p>
                        <p style="margin: 4px 0;"><strong>Correo:</strong> ${correoRec || 'No registrado'}</p>
                        <p style="margin: 4px 0;"><strong>Señas de validación:</strong> ${notaRec}</p>
                      </div>
                      <p style="color: #facc15; font-size: 12px;">
                        Cuando el titular se presente en portería con su carné, genera el Acta Digital desde <strong>Gestión de Custodia &rarr; Inventario y Actas</strong>.
                      </p>
                    </div>
                  `,
                })
                .catch((err) => console.error('Error enviando correo reclamo a admins:', err));
            }

            if (correoRec && correoRec.includes('@')) {
              await transporter
                .sendMail({
                  from: `"FindCampus UNIMINUTO" <${gmailUser}>`,
                  to: correoRec,
                  subject: `Solicitud de reclamo registrada (${objetoActual.radicado_id}) • FindCampus`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #081326; color: #f8fafc; padding: 26px; border-radius: 16px; border: 1px solid #10b981;">
                      <span style="display: inline-block; background: #10b981; color: #052e16; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 999px;">
                        SOLICITUD RECIBIDA • ${objetoActual.radicado_id}
                      </span>
                      <h2 style="margin: 14px 0 8px; color: #ffffff; font-size: 20px;">
                        Tu reclamo está en validación
                      </h2>
                      <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">
                        Hola <strong>${nombreRec}</strong>, hemos reservado temporalmente el bien <strong>${objetoActual.titulo}</strong> para validación de titularidad.
                      </p>
                      <div style="background: #0e1e38; border: 1px solid #1e3a8a; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 13px; color: #e2e8f0;">
                        <p style="margin: 4px 0;"><strong>Punto de entrega:</strong> ${objetoActual.sede} • ${objetoActual.edificio || 'Portería Principal'}</p>
                        <p style="margin: 4px 0;"><strong>Requisitos:</strong> Presentar carné institucional o documento de identidad y acreditar señas particulares o serial.</p>
                      </div>
                    </div>
                  `,
                })
                .catch((err) => console.error('Error enviando correo reclamo a estudiante:', err));
            }
          }
        } catch (mailErr) {
          console.error('Error enviando notificaciones de reclamo:', mailErr);
        }
      }

      return res.status(200).json({ ok: true, id, estado });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error MongoDB Atlas:', error);
    return res.status(500).json({ error: 'Error conectando con el clúster MongoDB Atlas' });
  }
}
