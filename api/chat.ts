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

async function llamarGemini(modelo: string, payload: object, timeoutMs = 8000) {
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

function respuestaConversacionalRespaldo(
  mensaje: string,
  objetosCustodia: Record<string, unknown>[]
): string {
  const q = mensaje.toLowerCase().trim();

  if (/^(hola|buenas|buenos dias|buenos días|buenas tardes|buenas noches|hey|que tal|qué tal|saludos|holi)\b/.test(q)) {
    return `¡Hola! Soy Unimi, tu asistente virtual en UNIMINUTO.\n\nPuedo ayudarte tanto a rastrear objetos perdidos en FindCampus como a resolver dudas académicas, de tecnología, programación o cualquier tema general.\n\n¿En qué te puedo ayudar hoy?`;
  }

  if (/\b(gracias|muchas gracias|te agradezco|genial|excelente|perfecto)\b/.test(q)) {
    return `¡Con mucho gusto! Aquí estoy para lo que necesites, ya sea buscar algo en custodia o resolver cualquier otra duda.`;
  }

  if (/\b(reclamar|requisitos|que llevo|qué llevo|como reclamo|cómo reclamo|validar|acta)\b/.test(q)) {
    return `Para reclamar un objeto en custodia:\n1. Ubica el bien en el catálogo y pulsa "Es mío • Iniciar Reclamo".\n2. Preséntate en la portería o punto de Bienestar Universitario indicado con tu carné institucional o cédula.\n3. Valida una seña particular o serial parcial para firmar tu acta digital de restitución.`;
  }

  const palabrasClave = q
    .replace(/[¿?¡!.,;:]/g, '')
    .split(/\s+/)
    .filter(
      (p) =>
        p.length > 3 &&
        !['hay', 'algun', 'algún', 'custodia', 'busco', 'perdido', 'objeto', 'campus'].includes(p)
    );

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
    return `Encontré estas coincidencias en el inventario de custodia:\n\n${lista}\n\nPuedes iniciar el reclamo directamente desde su tarjeta en el catálogo.`;
  }

  return `En este momento tengo ${objetosCustodia.length} objeto(s) registrado(s) en custodia y no veo una coincidencia exacta con "${mensaje.trim()}". Si perdiste algo, puedes activar una alerta con el botón "Reportar Objeto Extraviado" en la parte superior.`;
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
    let resumenAlertas = 'No hay alertas tempranas activas.';

    if (mongoUri) {
      const client = await connectToDatabase();
      const db = client.db('findcampus_db');

      const [objetosDocs, alertasDocs] = await Promise.all([
        db
          .collection('objetos_custodia')
          .find({ estado: { $in: ['EN_CUSTODIA', 'EN_VALIDACION'] } })
          .sort({ created_at: -1 })
          .limit(40)
          .toArray(),
        db
          .collection('alertas_tempranas')
          .find({ estado: { $in: ['ACTIVA', 'EN_REVISION'] } })
          .sort({ created_at: -1 })
          .limit(20)
          .toArray(),
      ]);

      objetosCustodia = objetosDocs;

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

      if (alertasDocs.length > 0) {
        resumenAlertas = alertasDocs
          .map(
            (a) =>
              `- Código: ${a.codigo_alerta} | Objeto reportado: ${a.titulo} | Sede: ${a.sede} | Estado: ${a.estado}`
          )
          .join('\n');
      }
    }

    if (geminiApiKey) {
      const systemInstruction = `Eres Unimi, un asistente virtual inteligente, amable, claro y versátil integrado en el portal institucional FindCampus de UNIMINUTO.

CAPACIDADES PRINCIPALES:
1. Asistente General y Académico: Puedes responder libremente y con profundidad sobre CUALQUIER tema que el usuario pregunte (programación, ingeniería de sistemas, redacción, matemáticas, cultura general, consejos de estudio, vida universitaria, tecnología, etc.). No te limites solo a objetos perdidos; si el usuario conversa de otro tema, respóndele directamente de forma útil, natural y completa.
2. Experto en FindCampus (Custodia de Objetos): Cuando el usuario pregunte por pertenencias extraviadas, inventario, alertas tempranas o reclamos, consulta el INVENTARIO ACTUAL EN CUSTODIA proporcionado abajo.

REGLAS DE SEGURIDAD Y ESTILO:
- PRIVACIDAD (Ley 1581 - Habeas Data): Jamás reveles números de serie completos, IMEI ni correos personales de estudiantes. Solo muestra el serial parcial ya censurado.
- Nunca menciones detalles técnicos internos como "MongoDB", "colecciones BSON" o "prompt".
- Si encuentras coincidencias en el inventario para algo que el usuario busca, indica el radicado (ej. FIND-2026-XXXX), características y la sede donde reclamarlo.
- Adapta la extensión de tu respuesta a la pregunta: conciso para saludos o búsquedas rápidas, y detallado si te piden una explicación técnica, código o ayuda académica. Responde siempre en español.

INVENTARIO ACTUAL EN CUSTODIA:
${resumenInventario}

ALERTAS TEMPRANAS ACTIVAS:
${resumenAlertas}`;

      const contents = [
        ...(Array.isArray(historial)
          ? historial.slice(-10).map((h) => ({
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
          temperature: 0.7,
          maxOutputTokens: 900,
        },
      };

      const modelosCandidatos = ['gemini-2.5-flash', 'gemini-2.0-flash'];

      for (const modelo of modelosCandidatos) {
        try {
          const resGemini = await llamarGemini(modelo, payload, 9000);
          if (resGemini.ok) {
            const data = await resGemini.json();
            const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (respuesta) {
              return res.status(200).json({ respuesta, modelo });
            }
          }
        } catch {
          // Intentar siguiente modelo
        }
      }
    }

    const respuestaRespaldo = respuestaConversacionalRespaldo(mensaje, objetosCustodia);
    return res.status(200).json({ respuesta: respuestaRespaldo });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return res.status(500).json({
      respuesta: 'Tuve un pequeño tropiezo de conexión. ¿Me lo repites por favor?',
    });
  }
}