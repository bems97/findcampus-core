import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';
import { enviarCorreoTransaccional } from './_mailer.js';

const uri = process.env.MONGODB_URI as string;

let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function construirHtmlBienvenida(datos: {
  nombre: string;
  correo: string;
  codigo_institucional: string;
  rol: 'ADMIN' | 'ESTUDIANTE';
}) {
  const esAdmin = datos.rol === 'ADMIN';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #081326; color: #f8fafc; padding: 28px; border-radius: 16px; border: 1px solid #1e3a8a;">
      <span style="display: inline-block; background: ${esAdmin ? '#10b981' : '#facc15'}; color: #081326; font-weight: 800; font-size: 11px; padding: 4px 12px; border-radius: 999px; letter-spacing: 0.4px;">
        ${esAdmin ? 'CUENTA ADMINISTRATIVA • RBAC CUSTODIA' : 'BIENVENIDO A FINDCAMPUS • UNIMINUTO'}
      </span>

      <h2 style="margin: 16px 0 8px; color: #ffffff; font-size: 21px;">
        ${esAdmin ? 'Alta de Operador de Custodia Confirmada' : '¡Tu cuenta institucional está activa!'}
      </h2>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.55;">
        Hola <strong>${datos.nombre}</strong>, te damos la bienvenida a <strong>FindCampus.core</strong>, la plataforma institucional de gestión y trazabilidad de objetos perdidos de UNIMINUTO.
      </p>

      <div style="background: #0e1e38; border: 1px solid #1e3a8a; border-radius: 12px; padding: 16px; margin: 18px 0; font-size: 13px; color: #e2e8f0;">
        <p style="margin: 5px 0;"><strong>Titular:</strong> ${datos.nombre}</p>
        <p style="margin: 5px 0;"><strong>Correo registrado:</strong> ${datos.correo}</p>
        <p style="margin: 5px 0;"><strong>ID Institucional:</strong> ${datos.codigo_institucional}</p>
        <p style="margin: 5px 0;"><strong>Perfil asignado:</strong> <span style="color: #facc15; font-weight: bold;">${datos.rol}</span></p>
      </div>

      ${
        esAdmin
          ? `<p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">
               Como operador autorizado podrás registrar hallazgos con evidencia fotográfica, gestionar alertas tempranas, emitir actas digitales de restitución y consultar la analítica multicampus. Recuerda cumplir los protocolos de confidencialidad de la <strong>Ley 1581 de 2012</strong>.
             </p>`
          : `<p style="color: #cbd5e1; font-size: 13px; line-height: 1.5;">
               Desde ahora puedes consultar el catálogo en tiempo real, iniciar solicitudes de reclamo sobre bienes custodiados, activar alertas tempranas con notificación automática y consultar a nuestro asistente virtual <strong>Unimi IA</strong>.
             </p>`
      }

      <div style="margin-top: 20px; text-align: center;">
        <a href="https://findcampus-core.vercel.app" style="display: inline-block; background: #facc15; color: #081326; font-weight: 800; font-size: 13px; text-decoration: none; padding: 11px 22px; border-radius: 10px;">
          Ingresar a FindCampus.core
        </a>
      </div>

      <p style="color: #64748b; font-size: 11px; margin-top: 20px; text-align: center;">
        UNIMINUTO • Sistema Institucional de Objetos Perdidos • Protección de Datos Ley 1581
      </p>
    </div>
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!uri) {
    return res.status(500).json({ error: 'Falta configurar MONGODB_URI' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('findcampus_db');
    const usersCol = db.collection('usuarios');

    if (req.method === 'GET') {
      const docs = await usersCol
        .find({}, { projection: { password_hash: 0, otp_hash: 0, otp_expira: 0 } })
        .sort({ created_at: -1 })
        .toArray();

      const usuarios = docs.map((u) => ({
        id: u._id.toString(),
        nombre: u.nombre,
        correo: u.correo,
        codigo_institucional: u.codigo_institucional || 'N/A',
        rol: u.rol === 'ADMIN' ? 'ADMIN' : 'ESTUDIANTE',
        created_at: u.created_at || null,
      }));

      return res.status(200).json({ usuarios });
    }

    if (req.method === 'PATCH') {
      const { id, rol } = req.body;
      if (!id || (rol !== 'ADMIN' && rol !== 'ESTUDIANTE')) {
        return res.status(400).json({ error: 'Datos inválidos para actualizar el rol.' });
      }

      const objectId = new ObjectId(String(id));
      const usuarioActualizado = await usersCol.findOne({ _id: objectId });
      await usersCol.updateOne({ _id: objectId }, { $set: { rol } });

      if (usuarioActualizado?.correo) {
        await enviarCorreoTransaccional({
          to: String(usuarioActualizado.correo),
          subject: `Actualización de Perfil (${rol}) • FindCampus UNIMINUTO`,
          html: construirHtmlBienvenida({
            nombre: String(usuarioActualizado.nombre || 'Usuario'),
            correo: String(usuarioActualizado.correo),
            codigo_institucional: String(usuarioActualizado.codigo_institucional || 'N/A'),
            rol,
          }),
        }).catch((err) => console.error('Error enviando correo de cambio de rol:', err));
      }

      return res.status(200).json({ ok: true, id, rol });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Falta el ID del usuario a eliminar.' });
      }

      await usersCol.deleteOne({ _id: new ObjectId(String(id)) });
      return res.status(200).json({ ok: true, id });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const {
      accion,
      nombre,
      correo,
      codigo_institucional,
      password,
      rol,
      clave_admin,
      otp,
      nueva_password,
    } = req.body;

    if (accion === 'REGISTER') {
      if (!nombre || !correo || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
      }

      const correoNormalizado = correo.trim().toLowerCase();
      const existe = await usersCol.findOne({ correo: correoNormalizado });
      if (existe) {
        return res.status(409).json({ error: 'Este correo institucional ya está registrado.' });
      }

      const rolAsignado = rol === 'ADMIN' ? 'ADMIN' : 'ESTUDIANTE';
      if (rolAsignado === 'ADMIN' && clave_admin !== 'UNIMINUTO-ADMIN') {
        return res.status(403).json({ error: 'Código de autorización de Seguridad inválido.' });
      }

      const nuevoUsuario = {
        nombre: nombre.trim(),
        correo: correoNormalizado,
        codigo_institucional: codigo_institucional?.trim() || 'N/A',
        password_hash: hashPassword(password),
        rol: rolAsignado,
        created_at: new Date(),
      };

      const result = await usersCol.insertOne(nuevoUsuario);

      // Envío de correo de confirmación y bienvenida según el rol
      await enviarCorreoTransaccional({
        to: nuevoUsuario.correo,
        subject:
          rolAsignado === 'ADMIN'
            ? 'Alta de Operador Administrativo • FindCampus UNIMINUTO'
            : 'Bienvenido a FindCampus • Cuenta Institucional Activa',
        html: construirHtmlBienvenida({
          nombre: nuevoUsuario.nombre,
          correo: nuevoUsuario.correo,
          codigo_institucional: nuevoUsuario.codigo_institucional,
          rol: rolAsignado,
        }),
      }).catch((err) => console.error('Error enviando correo de bienvenida:', err));

      return res.status(201).json({
        id: result.insertedId.toString(),
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        codigo_institucional: nuevoUsuario.codigo_institucional,
        rol: nuevoUsuario.rol,
      });
    }

    if (accion === 'LOGIN') {
      if (!correo || !password) {
        return res.status(400).json({ error: 'Ingresa tu correo y contraseña.' });
      }

      const correoNormalizado = correo.trim().toLowerCase();
      const usuario = await usersCol.findOne({ correo: correoNormalizado });

      if (!usuario || usuario.password_hash !== hashPassword(password)) {
        return res.status(401).json({ error: 'Credenciales incorrectas.' });
      }

      return res.status(200).json({
        id: usuario._id.toString(),
        nombre: usuario.nombre,
        correo: usuario.correo,
        codigo_institucional: usuario.codigo_institucional,
        rol: usuario.rol,
      });
    }

    if (accion === 'REQUEST_OTP') {
      if (!correo) {
        return res.status(400).json({ error: 'Ingresa tu correo registrado.' });
      }

      const correoNormalizado = correo.trim().toLowerCase();
      const usuario = await usersCol.findOne({ correo: correoNormalizado });

      if (!usuario) {
        return res.status(404).json({
          error: 'No encontramos una cuenta asociada a ese correo.',
        });
      }

      const codigoOtp = crypto.randomInt(100000, 999999).toString();
      const expiraEn = new Date(Date.now() + 10 * 60 * 1000);

      await usersCol.updateOne(
        { _id: usuario._id },
        {
          $set: {
            otp_hash: hashPassword(codigoOtp),
            otp_expira: expiraEn,
          },
        }
      );

      const enviado = await enviarCorreoTransaccional({
        to: correoNormalizado,
        subject: `Código de verificación OTP: ${codigoOtp} - FindCampus`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #081326; color: #f8fafc; padding: 28px; border-radius: 16px; border: 1px solid #1e3a8a;">
            <span style="display: inline-block; background: #facc15; color: #090d16; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 999px;">
              SEGURIDAD DE CUENTA - FINDCAMPUS
            </span>
            <h2 style="margin: 16px 0 8px; color: #ffffff; font-size: 20px;">
              Recuperación de Contraseña
            </h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
              Hola <strong>${usuario.nombre}</strong>, recibimos una solicitud para restablecer tu contraseña en el portal institucional de objetos perdidos.
            </p>
            <div style="margin: 22px 0; padding: 18px; background: #0e1e38; border: 1px dashed #facc15; border-radius: 12px; text-align: center;">
              <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                Tu código de verificación (válido por 10 min)
              </div>
              <div style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #facc15; font-family: monospace;">
                ${codigoOtp}
              </div>
            </div>
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
              Si no solicitaste este cambio, ignora este mensaje; tu contraseña actual seguirá protegida.
            </p>
          </div>
        `,
      });

      if (!enviado) {
        return res.status(500).json({
          error: 'El servicio de correo institucional aún no está configurado en el servidor.',
        });
      }

      return res.status(200).json({
        ok: true,
        mensaje: 'Código OTP enviado a tu correo electrónico.',
      });
    }

    if (accion === 'RESET_PASSWORD') {
      if (!correo || !otp || !nueva_password) {
        return res.status(400).json({
          error: 'Completa el correo, el código de 6 dígitos y la nueva contraseña.',
        });
      }

      if (String(nueva_password).trim().length < 6) {
        return res.status(400).json({
          error: 'La nueva contraseña debe tener al menos 6 caracteres.',
        });
      }

      const correoNormalizado = correo.trim().toLowerCase();
      const usuario = await usersCol.findOne({ correo: correoNormalizado });

      if (!usuario || !usuario.otp_hash || !usuario.otp_expira) {
        return res.status(400).json({
          error: 'No hay una solicitud de recuperación activa para este correo.',
        });
      }

      if (new Date() > new Date(usuario.otp_expira)) {
        return res.status(400).json({
          error: 'El código OTP ha expirado. Solicita uno nuevo.',
        });
      }

      if (usuario.otp_hash !== hashPassword(String(otp).trim())) {
        return res.status(401).json({
          error: 'El código de verificación ingresado es incorrecto.',
        });
      }

      await usersCol.updateOne(
        { _id: usuario._id },
        {
          $set: { password_hash: hashPassword(String(nueva_password).trim()) },
          $unset: { otp_hash: '', otp_expira: '' },
        }
      );

      return res.status(200).json({
        ok: true,
        mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
      });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (error) {
    console.error('Error en Auth MongoDB:', error);
    return res.status(500).json({ error: 'Error conectando con el servicio de autenticación.' });
  }
}