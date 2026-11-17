import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI as string;
const geminiApiKey = process.env.GEMINI_API_KEY as string;

let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(mongoUri);
  await client.connect();
  cachedClient = client;
  return client;
}

function censurarSerial(valor?: string): string {
  if (!valor || valor.length < 4) return 'PROTEGIDO-LEY-1581';
  return `${valor.slice(0, 2)}****${valor.slice(-2)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { mensaje, historial } = req.body as {
    mensaje?: string;
    historial?: { rol: 'user' | 'model'; texto: string }[];
  };

  if (!mensaje || !mensaje.trim()) {
    return res.status(400).json({ error: 'El mensaje es obligatorio.' });
  }

  if (!geminiApiKey) {
    return res.status(500).json({
      respuesta:
        '¡Guau! Aún falta configurar mi llave de conexión en el servidor. Pídele al administrador que active GEMINI_API_KEY.',
    });
  }

  try {
    let resumenInventario = 'No hay registros cargados en este momento.';

    if (mongoUri) {
      const client = await connectToDatabase();
      const db = client.db('findcampus_db');
      const objetos = await db
        .collection('objetos_custodia')
        .find({ estado: { $in: ['EN_CUSTODIA', 'EN_VALIDACION'] } })
        .sort({ created_at: -1 })
        .limit(40)
        .toArray();

      if (objetos.length > 0) {
        resumenInventario = objetos
          .map((obj) => {
            const meta = obj.atributos || obj.metadatos || {};
            const detalleMarca = [meta.marca, meta.modelo, meta.color]
              .filter(Boolean)
              .join(' ');
            const serialSeguro = meta.numero_serie
              ? ` | Serial parcial: ${censurarSerial(String(meta.numero_serie))}`
              : '';
            return `- Radicado: ${obj.radicado_id} | Título: ${obj.titulo} | Categoría: ${obj.categoria} | Sede: ${obj.sede} (${obj.edificio || 'Portería'}) | Estado: ${obj.estado}${detalleMarca ? ` | Características: ${detalleMarca}` : ''}${serialSeguro}`;
          })
          .join('\n');
      } else {
        resumenInventario = 'Actualmente no hay objetos pendientes de reclamo en custodia.';
      }
    }

    const systemInstruction = `Eres Unimi, el perrito labrador guía y asistente virtual oficial de FindCampus en UNIMINUTO.
Tu misión es ayudar a los estudiantes y miembros de la comunidad universitaria a verificar si sus objetos perdidos están en custodia, indicarles en qué sede o portería reclamarlos y guiarlos para reportar una alerta temprana si aún no aparecen.

REGLAS ESTRICTAS:
1. Tono amable, cercano, institucional y servicial (puedes usar un toque sutil y simpático acorde a un perro guía universitario, sin exagerar).
2. NUNCA menciones tecnologías internas como MongoDB, NoSQL, bases de datos, APIs, JSON, BSON o servidores. Habla siempre en lenguaje natural ("nuestro registro institucional de custodia", "porterías y bienestar universitario").
3. PRIVACIDAD (Ley 1581 - Habeas Data): Jamás reveles números de serie completos ni IMEI. Usa únicamente los datos del inventario proporcionado.
4. Si encuentras coincidencias con lo que busca el usuario, indica el código de radicado (ej. FIND-2026-XXXX), la descripción y la sede donde debe acercarse con su carné o documento institucional para validar titularidad.
5. Si no hay coincidencias en el inventario actual, dile que aún no ha ingresado a custodia y sugiérele usar el botón amarillo "Reportar Objeto Extraviado" en la pantalla principal para activar una alerta temprana.
6. Responde de forma clara, breve y bien estructurada en español.

INVENTARIO ACTUAL EN CUSTODIA:
${resumenInventario}`;

    const contents = [
      ...(Array.isArray(historial)
        ? historial.slice(-6).map((h) => ({
            role: h.rol,
            parts: [{ text: h.texto }],
          }))
        : []),
      {
        role: 'user',
        parts: [{ text: mensaje.trim() }],
      },
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 450,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Error Gemini API:', errText);
      return res.status(502).json({
        respuesta:
          'Tuve un pequeño tropiezo consultando el registro en este momento. Intenta preguntarme de nuevo en unos segundos.',
      });
    }

    const data = await geminiRes.json();
    const respuesta =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No pude generar una respuesta en este momento. Intenta reformular tu búsqueda.';

    return res.status(200).json({ respuesta });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return res.status(500).json({
      respuesta: 'Ocurrió un error al consultar los objetos en custodia. Intenta nuevamente.',
    });
  }
}