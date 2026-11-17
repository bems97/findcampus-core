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

async function llamarGemini(modelo: string, payload: object, timeoutMs = 4500) {
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

function respuestaConversacionalRespaldo(
  mensaje: string,
  objetosCustodia: Record<string, unknown>[]
): string {
  const q = mensaje.toLowerCase().trim();

  // 1. Saludos y cortesía
  if (/^(hola|buenas|buenos dias|buenos días|buenas tardes|buenas noches|hey|que tal|qué tal|saludos|holi)\b/.test(q)) {
    return `¡Guau, hola! Qué alegría saludarte por aquí. Soy Unimi, tu perrito guía en FindCampus UNIMINUTO.\n\nPuedo ayudarte a:\n• Rastrear si tu objeto perdido ya está en custodia.\n• Explicarte cómo reclamar un bien o activar una alerta temprana.\n• Resolver dudas sobre horarios y puntos de atención.\n\n¿Qué se te perdió o en qué te puedo echar una pata hoy?`;
  }

  if (/\b(gracias|muchas gracias|te agradezco|genial|excelente|perfecto)\b/.test(q)) {
    return `¡Con mucho gusto! Para eso estoy aquí en el campus. Si necesitas buscar otro objeto o reportar alguna novedad, solo escríbeme.`;
  }

  if (/\b(quien eres|quién eres|que haces|qué haces|como funcionas|cómo funcionas|ayuda)\b/.test(q)) {
    return `Soy Unimi, el asistente guía oficial de FindCampus en UNIMINUTO.\n\nMi trabajo es ayudarte a recuperar tus pertenencias:\n1. Busco en tiempo real entre los objetos entregados en porterías y Bienestar Universitario.\n2. Te indico en qué sede reclamarlos y qué necesitas llevar.\n3. Si tu objeto aún no aparece, te guío para activar una alerta temprana y avisarte apenas ingrese.`;
  }

  // 2. Preguntas frecuentes sobre reclamos, horarios o privacidad
  if (/\b(reclamar|requisitos|que llevo|qué llevo|como reclamo|cómo reclamo|validar|acta)\b/.test(q)) {
    return `Para reclamar un objeto en custodia sigue estos pasos:\n1. Ubica la tarjeta del objeto en el catálogo y haz clic en "Es mío • Iniciar Reclamo" (o acércate a la portería/sede indicada).\n2. Presenta tu carné universitario o documento de identidad.\n3. Valida algún dato único del bien (como fondo de pantalla, serial parcial o contenido) para firmar tu acta digital de restitución.`;
  }

  if (/\b(horario|donde queda|dónde queda|porteria|portería|bienestar|sede)\b/.test(q)) {
    return `Los puntos de recepción y entrega funcionan en las porterías principales y oficinas de Bienestar Universitario de cada sede UNIMINUTO (Sede Principal, Calle 80, Perdomo, Soacha y Centros Regionales) en horario académico habitual de lunes a sábado.`;
  }

  if (/\b(reportar|alerta|no aparece|extraviado|perdi|perdí)\b/.test(q)) {
    return `Si tu objeto aún no aparece en el catálogo, haz clic en el botón amarillo "Reportar Objeto Extraviado" en la parte superior de la página.\n\nSolo indica qué perdiste, en qué sede/lugar fue y tu correo institucional: te notificaremos apenas alguien lo entregue en portería.`;
  }

  if (/\b(ley 1581|privacidad|serial|imei|datos|seguridad)\b/.test(q)) {
    return `En FindCampus protegemos tus datos bajo la Ley 1581 (Habeas Data). Por seguridad, ocultamos parcialmente seriales, IMEI y documentos en el catálogo público para que solo el verdadero dueño pueda demostrar titularidad al reclamar.`;
  }

  // 3. Búsqueda inteligente en el inventario real en custodia
  const palabrasClave = q
    .replace(/[¿?¡!.,;:]/g, '')
    .split(/\s+/)
    .filter((p) => p.length > 3 && !['hay', 'algun', 'algún', 'custodia', 'busco', 'perdido', 'objeto', 'campus'].includes(p));

  const coincidencias = objetosCustodia.filter((obj) => {
    const textoObj = `${obj.titulo} ${obj.categoria} ${obj.sede} ${obj.edificio} ${JSON.stringify(obj.atributos || {})}`.toLowerCase();
    return palabrasClave.some((palabra) => textoObj.includes(palabra));
  });

  if (coincidencias.length > 0) {
    const lista = coincidencias
      .slice(0, 3)
      .map(
        (c) =>
          `• ${c.radicado_id}: ${c.titulo} — ${c.sede} (${c.edificio || 'Portería'})`
      )
      .join('\n');
    return `¡Buenas noticias! Encontré estas coincidencias en custodia:\n\n${lista}\n\nHaz clic en "Es mío • Iniciar Reclamo" en la tarjeta del objeto o acércate al punto indicado con tu carné institucional.`;
  }

  return objetosCustodia.length === 0
    ? `Revisé nuestro registro institucional de custodia y por ahora no hay objetos pendientes de reclamo.\n\nSi perdiste algo hace poco, te recomiendo pulsar el botón amarillo "Reportar Objeto Extraviado" arriba para dejar activa tu alerta temprana, o pregúntame cualquier duda sobre cómo funciona el portal.`
    : `Revisé los ${objetosCustodia.length} objeto(s) que tenemos actualmente en custodia y no encontré coincidencias exactas con "${mensaje.trim()}".\n\nTe sugiero activar una alerta temprana con el botón amarillo "Reportar Objeto Extraviado" para avisarte en cuanto llegue a portería.`;
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
Eres cálido, empático, conversacional, cercano y muy servicial.

PUEDES Y DEBES RESPONDER A:
1. Saludos, charlas cordiales y preguntas sobre quién eres ("Hola", "¿Cómo estás?", "¿Qué puedes hacer?", "Gracias").
2. Búsquedas de objetos perdidos en el campus, verificando el inventario actual en custodia.
3. Preguntas generales sobre cómo funciona FindCampus, requisitos para reclamar (carné o documento + validación de titularidad), horarios de porterías/Bienestar Universitario, consejos para cuidar pertenencias en el campus y protección de datos (Ley 1581 - Habeas Data).
4. Si el usuario pregunta algo general de la vida universitaria o pide un consejo rápido, respóndele con amabilidad y vuelve a ofrecerle ayuda con sus pertenencias en el campus.

REGLAS ESTRICTAS:
- NUNCA menciones tecnologías internas como MongoDB, NoSQL, bases de datos, APIs, JSON o servidores. Habla siempre en lenguaje natural ("nuestro registro institucional de custodia", "porterías y Bienestar Universitario").
- PRIVACIDAD (Ley 1581): Jamás reveles números de serie completos ni IMEI.
- Si encuentras coincidencias en el inventario, indica el código de radicado (ej. FIND-2026-XXXX), características y la sede donde reclamarlo.
- Si no hay coincidencias para un objeto buscado, sugiérele activar una alerta temprana con el botón amarillo "Reportar Objeto Extraviado".
- Responde en español, de forma natural, clara y amigable (máximo 3 párrafos cortos).

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
          temperature: 0.65,
          maxOutputTokens: 450,
        },
      };

      try {
        const res1 = await llamarGemini('models/gemini-3.8-flash', payload, 4500);
        if (res1.ok) {
          const data = await res1.json();
          const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (respuesta) return res.status(200).json({ respuesta });
        }
      } catch {
        // Siguiente intento
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
          // Respaldo conversacional
        }
      }
    }

    const respuestaRespaldo = respuestaConversacionalRespaldo(mensaje, objetosCustodia);
    return res.status(200).json({ respuesta: respuestaRespaldo });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return res.status(500).json({
      respuesta: 'Tuve un pequeño tropiezo momentáneo. ¿Me lo repites por favor?',
    });
  }
}