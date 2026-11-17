import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!uri) {
    return res.status(500).json({ error: 'Falta configurar MONGODB_URI' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('findcampus_db');
    const usersCol = db.collection('usuarios');

    const { accion, nombre, correo, codigo_institucional, password, rol, clave_admin } = req.body;

    // 1. REGISTRO DE NUEVO USUARIO (ESTUDIANTE O ADMIN)
    if (accion === 'REGISTER') {
      if (!nombre || !correo || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
      }

      const correoNormalizado = correo.trim().toLowerCase();
      const existe = await usersCol.findOne({ correo: correoNormalizado });
      if (existe) {
        return res.status(409).json({ error: 'Este correo institucional ya está registrado.' });
      }

      // Validar clave maestra si intenta registrarse como ADMIN
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

      return res.status(201).json({
        id: result.insertedId.toString(),
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        codigo_institucional: nuevoUsuario.codigo_institucional,
        rol: nuevoUsuario.rol,
      });
    }

    // 2. INICIO DE SESIÓN (LOGIN)
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

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (error) {
    console.error('Error en Auth MongoDB:', error);
    return res.status(500).json({ error: 'Error conectando con el servicio de autenticación.' });
  }
}