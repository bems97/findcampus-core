import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI as string;

let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!uri) {
    return res.status(500).json({ error: 'Falta configurar MONGODB_URI en las variables de entorno.' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('findcampus_db');
    const collection = db.collection('objetos_custodia');

    // GET: Obtener todos los objetos registrados en MongoDB Atlas
    if (req.method === 'GET') {
      const docs = await collection.find({}).sort({ fecha_hallazgo: -1 }).toArray();
      const formateados = docs.map((d) => ({
        ...d,
        _id: d._id.toString(),
      }));
      return res.status(200).json(formateados);
    }

    // POST: Insertar nuevo documento BSON polimórfico
    if (req.method === 'POST') {
      const { _id, ...datosDocumento } = req.body;
      const resultado = await collection.insertOne({
        ...datosDocumento,
        created_at: new Date(),
      });
      return res.status(201).json({
        ...datosDocumento,
        _id: resultado.insertedId.toString(),
      });
    }

    // PATCH: Actualizar estado de custodia (EN_VALIDACION / RESTITUIDO)
    if (req.method === 'PATCH') {
      const { id, estado } = req.body;
      if (!id || !estado) {
        return res.status(400).json({ error: 'Se requiere id y estado.' });
      }

      const filtro = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
      await collection.updateOne(filtro, {
        $set: { estado, updated_at: new Date() },
      });
      return res.status(200).json({ ok: true, id, estado });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error MongoDB Atlas:', error);
    return res.status(500).json({ error: 'Error conectando con el clúster MongoDB Atlas' });
  }
}