function escapeIcs(text = '') {
  return String(text).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
function safeCalendarUtc(value) {
  return /^\d{8}T\d{6}Z$/.test(value || '') ? value : null;
}
function makeUid(title, start) {
  const raw = `${title}-${start}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  return `${Math.abs(hash)}-${start}@digitalmeg`;
}
export default async (req) => {
  const url = new URL(req.url);
  const title = (url.searchParams.get('title') || 'Evento').slice(0, 200);
  const start = safeCalendarUtc(url.searchParams.get('start'));
  const end = safeCalendarUtc(url.searchParams.get('end'));
  const location = (url.searchParams.get('location') || '').slice(0, 500);
  const description = (url.searchParams.get('description') || '').slice(0, 3000);
  if (!start || !end) return new Response('Datos de fecha inválidos.', { status: 400 });
  const now = new Date();
  const p = n => String(n).padStart(2, '0');
  const stamp = `${now.getUTCFullYear()}${p(now.getUTCMonth()+1)}${p(now.getUTCDate())}T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Digital Meg//Calendar Link//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${makeUid(title, start)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="evento.ics"',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
export const config = { path: '/evento.ics', method: 'GET' };
