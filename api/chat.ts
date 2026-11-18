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

async function detectarModelosDisponibles(): Promise<string[]> {
  const ordenPreferido = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
  ];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiApiKey)}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) {
      return ordenPreferido;
    }

    const data = await res.json();
    const lista: { name?: string; supportedGenerationMethods?: string[] }[] =
      Array.isArray(data?.models) ? data.models : [];

    const compatibles = lista
      .filter(
        (m) =>
          m.name &&
          m.supportedGenerationMethods?.includes('generateContent') &&
          !m.name.includes('image') &&
          !m.name.includes('tts') &&
          !m.name.includes('robotics')
      )
      .map((m) => m.name!.replace(/^models\//, ''));

    const disponibles = ordenPreferido.filter((preferido) =>
      compatibles.includes(preferido)
    );

    return disponibles.length > 0 ? disponibles : ordenPreferido;
  } catch {
    return ordenPreferido;
  }
}

async function llamarGemini(modelo: string, payload: object, timeoutMs = 12000) {
  const nombreModelo = modelo.startsWith('models/') ? modelo : `models/${modelo}`;
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/${nombreModelo}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    }
  );
}

function respuestaConversacionalRespaldo(
  mensaje: string,
  objetosCustodia: Record<string, unknown>[],
  motivoFallo?: string
): string {
  const q = mensaje.toLowerCase().trim();

  if (/^(hola|buenas|buenos dias|buenos días|buenas tardes|buenas noches|hey|que tal|qué tal|saludos|holi)\b/.test(q)) {
    return `¡Hola! Soy Unimi, tu asistente virtual en UNIMINUTO.\n\nPuedo ayudarte a rastrear objetos perdidos en FindCampus o resolver dudas académicas y generales.\n\n¿En qué te puedo ayudar hoy?`;
  }

  if (/\b(duda|academica|académica|tarea|estudiar|programacion|programación|codigo|código|explica|ayuda)\b/.test(q)) {
    const avisoConfig = motivoFallo
      ? `\n\n*(Nota técnica: el motor Gemini IA devolvió "${motivoFallo}"). Intenta enviar tu consulta nuevamente en unos segundos).*`
      : '';
    return `¡Claro que sí! Cuéntame exactamente cuál es tu duda académica, de programación o tema universitario y lo revisamos paso a paso.${avisoConfig}`;
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

  return `En este momento tengo ${objetosCustodia.length} objeto(s) registrado(s) en custodia. Si buscas una pertenencia, dime qué objeto es; o si tienes una duda académica o técnica, escríbela directamente.`;
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

    let motivoFalloGemini = '';

    if (!geminiApiKey) {
      motivoFalloGemini = 'Falta configurar GEMINI_API_KEY';
    } else {
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

      const modelosCandidatos = await detectarModelosDisponibles();

      for (const modelo of modelosCandidatos) {
        try {
          const resGemini = await llamarGemini(modelo, payload, 12000);
          if (resGemini.ok) {
            const data = await resGemini.json();
            const respuesta = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (respuesta) {
              return res.status(200).json({ respuesta, modelo });
            }
          } else {
            const errBody = await resGemini.json().catch(() => ({}));
            motivoFalloGemini =
              errBody?.error?.message || `HTTP ${resGemini.status} en ${modelo}`;
            console.error(`Fallo modelo ${modelo}:`, motivoFalloGemini);
          }
        } catch (err) {
          motivoFalloGemini = err instanceof Error ? err.message : 'Timeout llamando a Gemini';
          console.error(`Excepción modelo ${modelo}:`, motivoFalloGemini);
        }
      }
    }

    const respuestaRespaldo = respuestaConversacionalRespaldo(
      mensaje,
      objetosCustodia,
      motivoFalloGemini
    );
    return res.status(200).json({ respuesta: respuestaRespaldo, motivoFalloGemini });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return res.status(500).json({
      respuesta: 'Tuve un pequeño tropiezo de conexión. ¿Me lo repites por favor?',
    });
  }
}