import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Genera 6 iconos planos (uno por paso del correo de bienvenida) usando la
// integracion GenerateImage de la plataforma. Funcion temporal: se borra
// despues de generar las imagenes y guardar sus URLs.

const STYLE = 'Flat minimal vector icon, single color navy blue (#0B1E4D) linework with soft light blue (#EAF2FF) flat fill accents, centered composition with generous padding, plain white background, no text, no shadow, no gradient, no 3D effects, clean simple geometric shapes, rounded corners, professional healthcare SaaS app icon style, square format.';

const PROMPTS = [
  { key: 'cedula', prompt: STYLE + ' Subject: a professional ID card with a checkmark shield badge overlapping the corner, representing document verification.' },
  { key: 'biografia', prompt: STYLE + ' Subject: a pen writing on a small profile card with a user avatar circle and short text lines, representing writing a biography.' },
  { key: 'zona', prompt: STYLE + ' Subject: a map location pin inside a soft circular radius ring with a small building marker, representing a coverage zone.' },
  { key: 'formacion', prompt: STYLE + ' Subject: a graduation cap resting on top of a small open book, representing academic education and languages.' },
  { key: 'aseguradoras', prompt: STYLE + ' Subject: a small medical insurance card with a checkmark and a soft cross symbol, representing accepted health insurers.' },
  { key: 'servicios', prompt: STYLE + ' Subject: a stethoscope wrapped around a small price tag with a currency symbol, representing services and pricing.' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const results = {};
    for (const p of PROMPTS) {
      try {
        const res = await base44.integrations.Core.GenerateImage({ prompt: p.prompt });
        results[p.key] = res.url;
      } catch (err) {
        results[p.key] = { error: err.message };
      }
    }
    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
