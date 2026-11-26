const qs = new URLSearchParams(location.search);
const generatorView = document.getElementById('generatorView');
const eventView = document.getElementById('eventView');

function pad(n) {
  return String(n).padStart(2, '0');
}

function icsEscape(s = '') {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function compactLocal(date, time) {
  return date.replaceAll('-', '') + 'T' + time.replace(':', '') + '00';
}

function googleLocal(date, time) {
  return date.replaceAll('-', '') + 'T' + time.replace(':', '') + '00';
}

function nextDay(date) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0,10);
}
function finishDate(data) {
  return data.endDate || (data.end < data.start ? nextDay(data.date) : data.date);
}
// Resolve wall-clock times in the event zone, not the device zone.
function utcStamp(date, time, zone) {
  const target = Date.parse(date + 'T' + time + ':00Z');
  const fmt = new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const wall = ms => { const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map(x=>[x.type,x.value])); return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second); };
  const offsets = new Set([-36,-12,0,12,36].map(h=>{const t=target+h*3600000;return wall(t)-t;}));
  const matches = [...offsets].map(o=>target-o).filter(t=>wall(t)===target).sort((a,b)=>a-b);
  if (!matches.length) throw new Error('Invalid local time');
  return new Date(matches[0]).toISOString().replace(/[-:]/g,'').replace(/\.000Z$/,'Z');
}
function validate(data) {
  const a=utcStamp(data.date,data.start,data.timezone), b=utcStamp(finishDate(data),data.end,data.timezone);
  if(b<=a) throw new Error('End must follow start');
}
function makeUid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@digitalmeg.site`;
}

/* GOOGLE CALENDAR */
function buildGoogleUrl(data) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: data.title,
    dates: `${utcStamp(data.date, data.start, data.timezone)}/${utcStamp(finishDate(data), data.end, data.timezone)}`,
    details: data.description || '',
    location: data.location || '',
    ctz: data.timezone
  });

  return `https://calendar.google.com/calendar/r/eventedit?${p.toString()}`;
}

/* APPLE CALENDAR */
function buildICS(data) {
  const now = new Date();

  const stamp =
    `${now.getUTCFullYear()}` +
    `${pad(now.getUTCMonth() + 1)}` +
    `${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}` +
    `${pad(now.getUTCMinutes())}` +
    `${pad(now.getUTCSeconds())}Z`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Digital Meg//Calendar Link//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${makeUid()}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${utcStamp(data.date, data.start, data.timezone)}`,
    `DTEND:${utcStamp(finishDate(data), data.end, data.timezone)}`,
    `SUMMARY:${icsEscape(data.title)}`,
    `DESCRIPTION:${icsEscape(data.description || '')}`,
    `LOCATION:${icsEscape(data.location || '')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

function downloadICS(data) {
  const blob = new Blob(
    [buildICS(data)],
    { type: 'text/calendar;charset=utf-8' }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;

  a.download =
    `${data.title
      .replace(/[^a-z0-9áéíóúñü _-]/gi, '')
      .trim()
      .replace(/\s+/g, '-') || 'evento'}.ics`;

  document.body.appendChild(a);

  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* FORMATO DE FECHA */
function formatDateSpanish(dateStr, locale = "es-MX") {
  const [y, m, d] = dateStr.split('-').map(Number);

  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

function formatTime(time, locale = "es-MX") {
  const [h, m] = time.split(':').map(Number);

  const dt = new Date(
    Date.UTC(2000, 0, 1, h, m)
  );

  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC'
  }).format(dt);
}

/* LEER DATOS DEL LINK */
function readDataFromQuery() {
  return {
    title: qs.get('t') || 'Evento',
    date: qs.get('d') || '',
    start: qs.get('s') || '',
    end: qs.get('e') || '',
    endDate: qs.get('ed') || '',
    location: qs.get('l') || '',
    description: qs.get('x') || '',
    timezone:
      qs.get('z') ||
      'America/Mexico_City'
  };
}

/* PÁGINA DEL EVENTO */
if (qs.get('event') === '1') {

  generatorView.classList.add('hidden');
  eventView.classList.remove('hidden');

  const data = readDataFromQuery();

  function renderLanguage(lang) {
    const en = lang === 'en', locale = en ? 'en-US' : 'es-MX';
    document.documentElement.lang = lang;
    document.title = `${data.title} · ${en ? 'Add to calendar' : 'Añadir al calendario'}`;
    document.getElementById('saveDate').textContent = en ? 'SAVE THE DATE' : 'GUARDA LA FECHA';
    document.getElementById('eventTitle').textContent = qs.get('t') || (en ? 'Event' : 'Evento');
    document.getElementById('eventDate').textContent = data.date ? formatDateSpanish(data.date,locale) : '';
    document.getElementById('eventTime').textContent = data.start && data.end ? `${formatTime(data.start,locale)} – ${formatTime(data.end,locale)}${finishDate(data)!==data.date ? ' · '+formatDateSpanish(finishDate(data),locale) : ''}` : '';
    document.getElementById('eventZone').textContent = (en ? 'Event time zone: ' : 'Zona horaria del evento: ') + data.timezone;
    document.querySelector('#iosHelp strong').textContent = en ? 'Using an iPhone?' : '¿Estás en iPhone?';
    document.querySelector('#iosHelp p').textContent = en ? 'If the event does not open automatically, use Safari and tap Apple Calendar again. The file is generated on your device; it is not a subscription calendar.' : 'Si el evento no se abre automáticamente, usa Safari y vuelve a tocar “Apple Calendar”. El archivo se genera directamente en tu teléfono; no es un calendario de suscripción.';
    document.querySelector('.powered').textContent = en ? 'Calendar powered by Digital Meg' : 'Calendario generado con Digital Meg';
    for(const l of ['es','en']) document.getElementById(l==='es'?'langEs':'langEn').setAttribute('aria-pressed',String(l===lang));
  }
  const preferred = qs.get('lang');
  renderLanguage(['es','en'].includes(preferred) ? preferred : /^en/i.test(navigator.language) ? 'en' : 'es');
  document.getElementById('langEs').onclick = () => renderLanguage('es');
  document.getElementById('langEn').onclick = () => renderLanguage('en');

  const locationRow =
    document.getElementById('locationRow');

  if (data.location) {

    document.getElementById(
      'eventLocation'
    ).textContent = data.location;

  } else {

    locationRow.classList.add('hidden');

  }

  const desc =
    document.getElementById(
      'eventDescription'
    );

  if (data.description) {

    desc.textContent =
      data.description;

  } else {

    desc.classList.add('hidden');

  }

  /* GOOGLE CALENDAR */
  const googleBtn =
    document.getElementById(
      'googleBtn'
    );

  try { validate(data); googleBtn.href = buildGoogleUrl(data); } catch { googleBtn.removeAttribute("href"); document.getElementById("appleBtn").disabled = true; document.getElementById("eventTime").textContent += " · Invalid event time / Horario inválido"; }

  /* Importante para permitir que iOS
     decida abrir Google Calendar */
  googleBtn.target = '_self';

  /* APPLE CALENDAR */
  document.getElementById(
    'appleBtn'
  ).addEventListener(
    'click',
    () => {

      downloadICS(data);

      if (
        /iPhone|iPad|iPod/i.test(
          navigator.userAgent
        )
      ) {

        document.getElementById(
          'iosHelp'
        ).classList.remove(
          'hidden'
        );

      }

    }
  );

}

/* GENERADOR */
else {

  const form =
    document.getElementById(
      'eventForm'
    );

  const result =
    document.getElementById(
      'result'
    );

  const output =
    document.getElementById(
      'universalUrl'
    );

  let currentUrl = '';

  form.addEventListener(
    'submit',
    e => {

      e.preventDefault();

      const data = {

        title:
          document.getElementById(
            'title'
          ).value.trim(),

        date:
          document.getElementById(
            'date'
          ).value,

        start:
          document.getElementById(
            'start'
          ).value,

        end:
          document.getElementById(
            'end'
          ).value,

        endDate: document.getElementById("endDate").value,

        location:
          document.getElementById(
            'location'
          ).value.trim(),

        description:
          document.getElementById(
            'description'
          ).value.trim(),

        timezone:
          document.getElementById(
            'timezone'
          ).value

      };

      try { validate(data); } catch { alert('La fecha y hora de término deben ser posteriores al inicio y existir en la zona horaria elegida.'); return; }

      const p =
        new URLSearchParams({

          event: '1',

          t: data.title,

          d: data.date,

          s: data.start,

          e: data.end,

          z: data.timezone

        });

      p.set("ed", finishDate(data));
      const lang = document.getElementById("eventLang").value;
      if(lang !== "auto") p.set("lang",lang);

      if (data.location) {

        p.set(
          'l',
          data.location
        );

      }

      if (data.description) {

        p.set(
          'x',
          data.description
        );

      }

      currentUrl =
        `${location.origin}${location.pathname}?${p.toString()}`;

      output.value =
        currentUrl;

      result.classList.remove(
        'hidden'
      );

      result.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });

    }
  );

  document.getElementById(
    'copyUniversal'
  ).addEventListener(
    'click',
    async () => {

      try {

        await navigator.clipboard.writeText(
          output.value
        );

        document.getElementById(
          'copyUniversal'
        ).textContent =
          '¡Copiado!';

        setTimeout(
          () => {

            document.getElementById(
              'copyUniversal'
            ).textContent =
              'Copiar link';

          },
          1600
        );

      } catch {

        output.select();

        document.execCommand(
          'copy'
        );

      }

    }
  );

  document.getElementById(
    'previewUniversal'
  ).addEventListener(
    'click',
    () => {

      if (currentUrl) {

        window.open(
          currentUrl,
          '_blank'
        );

      }

    }
  );

}
