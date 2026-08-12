import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Prueba puntual: solo el header con el logo nuevo (PNG), para confirmar
// que ya no aparece con fondo sólido en el correo. Se borra después.

const LOGO_URL = 'https://base44.app/api/apps/69daf616236dcba44672309d/files/mp/public/69daf616236dcba44672309d/493678fd4_buscoundoctor-logo.png';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const to = body.to;
    if (!to) return Response.json({ error: 'Falta "to"' }, { status: 400 });

    const html = `<!doctype html><html lang="es"><body style="margin:0;padding:0;background-color:#EAF2FF;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EAF2FF;padding:32px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;"><tr><td style="background-color:#0B1E4D;padding:22px 32px;text-align:center;"><img src="${LOGO_URL}" alt="BuscoUnDoctor" height="34" style="height:34px;width:auto;display:inline-block;border:0;" /></td></tr><tr><td style="padding:20px 32px 28px;font-size:14px;color:#334155;">Header con el logo en PNG (antes era webp). Si el fondo detrás del logo se ve navy liso, sin caja blanca ni gris alrededor de las letras, ya quedó bien.</td></tr></table></td></tr></table></body></html>`;

    await base44.integrations.Core.SendEmail({ to, subject: '[Prueba] Logo en el header del correo', body: html, from_name: 'BuscoUnDoctor' });
    return Response.json({ ok: true, sent_to: to });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
