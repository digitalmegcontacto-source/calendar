const form = document.getElementById('eventForm');
const results = document.getElementById('results');
const googleLink = document.getElementById('googleLink');
const appleLink = document.getElementById('appleLink');
const appleUrl = document.getElementById('appleUrl');
const copyGoogle = document.getElementById('copyGoogle');
const copyApple = document.getElementById('copyApple');
const previewTitle = document.getElementById('previewTitle');
const previewMeta = document.getElementById('previewMeta');
const toast = document.getElementById('toast');
let currentEvent = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}
function pad(n) { return String(n).padStart(2, '0'); }
function zonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  return Object.fromEntries(fmt.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
function zonedTimeToUtc(dateStr, timeStr, timeZone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  let guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(guess, timeZone);
    const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    const target = Date.UTC(y, m - 1, d, hh, mm, 0);
    guess = new Date(guess.getTime() + (target - asIfUtc));
  }
  return guess;
}
function toCalendarUtc(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}
function buildGoogleUrl(evt) {
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: evt.title,
    dates: `${toCalendarUtc(evt.startUtc)}/${toCalendarUtc(evt.endUtc)}`,
    details: evt.description, location: evt.location
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
function buildAppleUrl(evt) {
  const params = new URLSearchParams({
    title: evt.title,
    start: toCalendarUtc(evt.startUtc),
    end: toCalendarUtc(evt.endUtc),
    location: evt.location,
    description: evt.description
  });
  return `${window.location.origin}/evento.ics?${params.toString()}`;
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); showToast('Link copiado'); }
  catch { showToast('No se pudo copiar automáticamente'); }
}
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const date = document.getElementById('date').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const timezone = document.getElementById('timezone').value;
  const location = document.getElementById('location').value.trim();
  const description = document.getElementById('description').value.trim();
  const startUtc = zonedTimeToUtc(date, startTime, timezone);
  let endUtc = zonedTimeToUtc(date, endTime, timezone);
  if (endUtc <= startUtc) endUtc = new Date(endUtc.getTime() + 86400000);
  currentEvent = { title, date, startTime, endTime, timezone, location, description, startUtc, endUtc };
  const gUrl = buildGoogleUrl(currentEvent);
  const aUrl = buildAppleUrl(currentEvent);
  googleLink.href = gUrl;
  appleLink.href = aUrl;
  appleUrl.value = aUrl;
  previewTitle.textContent = title;
  previewMeta.textContent = `${date} · ${startTime}–${endTime} · ${timezone}${location ? ` · ${location}` : ''}`;
  results.classList.remove('hidden');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
copyGoogle.addEventListener('click', () => currentEvent && copyText(buildGoogleUrl(currentEvent)));
copyApple.addEventListener('click', () => currentEvent && copyText(buildAppleUrl(currentEvent)));
