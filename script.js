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

function makeUid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@digitalmeg.site`;
}

/* GOOGLE CALENDAR */
function buildGoogleUrl(data) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: data.title,
    dates: `${googleLocal(data.date, data.start)}/${googleLocal(data.date, data.end)}`,
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
    `DTSTART;TZID=${data.timezone}:${compactLocal(data.date, data.start)}`,
    `DTEND;TZID=${data.timezone}:${compactLocal(data.date, data.end)}`,
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
function formatDateSpanish(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);

  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

function formatTime(time) {
  const [h, m] = time.split(':').map(Number);

  const dt = new Date(
    Date.UTC(2000, 0, 1, h, m)
  );

  return new Intl.DateTimeFormat('es-MX', {
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

  document.title =
    `${data.title} · Añadir al calendario`;

  document.getElementById(
    'eventTitle'
  ).textContent = data.title;

  document.getElementById(
    'eventDate'
  ).textContent =
    data.date
      ? formatDateSpanish(data.date)
      : '';

  document.getElementById(
    'eventTime'
  ).textContent =
    data.start && data.end
      ? `${formatTime(data.start)} – ${formatTime(data.end)}`
      : '';

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

  googleBtn.href =
    buildGoogleUrl(data);

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

      if (
        data.end <= data.start
      ) {

        alert(
          'La hora de término debe ser posterior a la hora de inicio.'
        );

        return;

      }

      const p =
        new URLSearchParams({

          event: '1',

          t: data.title,

          d: data.date,

          s: data.start,

          e: data.end,

          z: data.timezone

        });

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
