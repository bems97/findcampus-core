import nodemailer from 'nodemailer';

const gmailUser = process.env.GMAIL_USER as string;
const gmailPass = process.env.GMAIL_APP_PASSWORD as string;

function htmlATextoPlano(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|h1|h2|h3|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&rarr;/g, '->')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

export async function enviarCorreoTransaccional(opciones: {
  to: string;
  subject: string;
  html: string;
  remitente?: string;
}) {
  if (!gmailUser || !gmailPass || !opciones.to) return false;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  // Limpiar emojis llamativos del asunto para reducir puntaje de spam en Hotmail/Outlook
  const asuntoLimpio = opciones.subject
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  await transporter.sendMail({
    from: `"${opciones.remitente || 'FindCampus UNIMINUTO'}" <${gmailUser}>`,
    replyTo: gmailUser,
    to: opciones.to,
    subject: asuntoLimpio,
    text: htmlATextoPlano(opciones.html),
    html: opciones.html,
    headers: {
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
    },
  });

  return true;
}