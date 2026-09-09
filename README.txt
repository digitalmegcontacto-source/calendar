DIGITAL MEG — GENERADOR DE LINKS DE CALENDARIO

Esta versión genera:
1. Link de Google Calendar.
2. Link público para Apple/iPhone que responde como archivo .ics.

IMPORTANTE: esta versión utiliza una Netlify Function. No se debe publicar únicamente con el antiguo método de arrastrar una carpeta como sitio estático.

FORMA RECOMENDADA DE PUBLICAR:
- Sube esta carpeta a un repositorio de GitHub.
- En Netlify: Add new project / Import an existing project.
- Conecta GitHub y selecciona el repositorio.
- No requiere comando de build ni carpeta publish especial; la raíz contiene index.html.
- Publica el sitio.

Después, el generador producirá links parecidos a:
https://TU-SITIO.netlify.app/evento.ics?title=...&start=...&end=...

Ese link se puede pegar como hipervínculo en Canva.
