import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI as string;
const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();

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

async function llamarGemini(modelo: string, payload: object, timeoutMs = 4000) {
  const nombreModelo = modelo.startsWith('models/') ? modelo : `models/${modelo}`;
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/${nombreModelo}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    }
  );
}

async function obtenerFlashActivo(): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiApiKey)}`,
      {
        headers: { 'x-goog-api-key': geminiApiKey },
        signal: AbortSignal.timeout(2500),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const modelos: { name?: string; supportedGenerationMethods?: string[] }[] =
      Array.isArray(data?.models) ? data.models : [];

    const flash = modelos.find(
      (m) =>
        m.name &&
        m.name.includes('flash') &&
        !m.name.includes('3.8-flash') &&
        !m.name.includes('2.5') &&
        !m.name.includes('2.0') &&
        !m.name.includes('1.5') &&
        m.supportedGenerationMethods?.includes('generateContent')
    );

    return flash?.name || null;
  } catch {
    return null;
  }
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

  try {
    let objetosCustodia: Record<string, unknown>[] = [];
    let resumenInventario = 'Actualmente no hay objetos pendientes de reclamo en custodia.';

    if (mongoUri) {
      const client = await connectToDatabase();
      const db = client.db('findcampus_db');
      objetosCustodia = await db
        .collection('objetos_custodia')
        .find({ estado: { $in: ['EN_CUSTODIA', 'EN_VALIDACION'] } })
        .sort({ created_at: -1 })
        .limit(40)
        .toArray();

      if (objetosCustodia.length > 0) {
        resumenInventario = objetosCustodia
          .map((obj) => {
            const meta = (obj.atributos || obj.metadatos || {}) as Record<string, unknown>;
            const detalleMarca = [meta.marca, meta.modelo, meta.color]
              .filter(Boolean)
              .join(' ');
            const serialSeguro = meta.numero_serie
              ? ` | Serial parcial: ${censurarSerial(String(meta.numero_serie))}`
              : '';
            return `- Radicado: ${obj.radicado_id} | Título: ${obj.titulo} | Categoría: ${obj.categoria} | Sede: ${obj.sede} (${obj.edificio || 'Portería'}) | Estado: ${obj.estado}${detalleMarca ? ` | Características: ${detalleMarca}` : ''}${serialSeguro}`;
          })
          .join('\n');
      }
    }

    if (geminiApiKey) {
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

      const payload = {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 450,
        },
      };

      // Máximo 2 intentos rápidos (4s + 3.5s) para nunca agotar el límite de 10s de Vercel
      try {
        const res1 = await llamarGemini('models/gemini-3.8-flash', payload, 4000);
        if (res1.ok) {
          const data = await res1.json();
          const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (respuesta) return res.status(200).json({ respuesta });
        }
      } catch {
        // Timeout o fallo puntual, pasamos al segundo modelo flash
      }

      const otroFlash = await obtenerFlashActivo();
      if (otroFlash) {
        try {
          const res2 = await llamarGemini(otroFlash, payload, 3500);
          if (res2.ok) {
            const data = await res2.json();
            const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (respuesta) return res.status(200).json({ respuesta });
          }
        } catch {
          // Pasamos al respaldo instantáneo sobre MongoDB
        }
      }
    }

    // Respaldo instantáneo directo sobre el inventario institucional
    const consulta = mensaje.toLowerCase();
    const coincidencias = objetosCustodia.filter((obj) => {
      const textoObj = `${obj.titulo} ${obj.categoria} ${obj.sede} ${obj.edificio} ${JSON.stringify(obj.atributos || {})}`.toLowerCase();
      return consulta
        .split(/\s+/)
        .filter((p) => p.length > 3)
        .some((palabra) => textoObj.includes(palabra));
    });

    if (coincidencias.length > 0) {
      const lista = coincidencias
        .slice(0, 3)
        .map(
          (c) =>
            `• ${c.radicado_id}: ${c.titulo} en ${c.sede} (${c.edificio || 'Portería'})`
        )
        .join('\n');
      return res.status(200).json({
        respuesta: `¡Guau! Encontré estas coincidencias en nuestro registro institucional de custodia:\n\n${lista}\n\nAcércate a la portería o punto de custodia indicado con tu carné institucional o haz clic en "Es mío • Iniciar Reclamo" en la tarjeta correspondiente.`,
      });
    }

    return res.status(200).json({
      respuesta:
        objetosCustodia.length === 0
          ? '¡Hola! Revisé nuestro registro institucional de custodia y en este momento no hay objetos pendientes de reclamo. Si perdiste algo recientemente, usa el botón amarillo "Reportar Objeto Extraviado" en la parte superior para activar una alerta temprana.'
          : `¡Hola! Revisé los ${objetosCustodia.length} objeto(s) que tenemos actualmente en custodia y no encontré coincidencias exactas con tu búsqueda. Te recomiendo activar una alerta temprana con el botón amarillo "Reportar Objeto Extraviado" para avisarte apenas ingrese a portería.`,
    });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return res.status(500).json({
      respuesta: 'Ocurrió un error al consultar los objetos en custodia. Intenta nuevamente.',
    });
  }
}