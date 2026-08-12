import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  SITE_URL,
  renderEmail,
  detailRow,
  detailTable,
  infoBox,
  esc,
  escMultiline,
} from '../../../src/api/emailTemplate.js';

// Función temporal, solo para mandar los 7 correos de muestra (con el nuevo
// diseño de marca) al buzón del dueño y que pueda revisar cómo quedaron.
// No se referencia desde ninguna pantalla del admin ni del panel del
// doctor — se invoca directo por URL y se borra después de la revisión.

const SITE_NAME = 'BuscoUnDoctor';
const PANEL_URL = `${SITE_URL}/panel-medico`;

const SAMPLE_DOC = { full_name: 'Dra. Ana Sofía Martínez', specialty: 'Dermatología', slug: 'ana-sofia-martinez' };

function buildEmails() {
  return [
    {
      subject: `Tu perfil en ${SITE_NAME} ya está publicado`,
      html: renderEmail({
        preheader: 'Tu perfil ya está aprobado y visible para pacientes.',
        badge: 'Perfil aprobado',
        badgeTone: 'green',
        title: '¡Tu perfil ya está publicado!',
        bodyHtml: `
          <p>Hola ${esc(SAMPLE_DOC.full_name)},</p>
          <p>Buenas noticias: revisamos tu perfil y ya está <strong>aprobado y publicado</strong> en ${SITE_NAME}. Los pacientes ya pueden encontrarte en el directorio.</p>
          ${detailTable([
            detailRow('Doctor', esc(SAMPLE_DOC.full_name)),
            detailRow('Especialidad', esc(SAMPLE_DOC.specialty)),
            detailRow('Perfil público', `<a href="${SITE_URL}/especialista/${SAMPLE_DOC.slug}" style="color:#2F6FED;text-decoration:none;">Ver mi perfil &rarr;</a>`),
          ])}
        `,
        ctaLabel: 'Ir a mi panel',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu perfil en ${SITE_NAME} necesita algunos cambios`,
      html: renderEmail({
        preheader: 'Tu perfil necesita algunos ajustes antes de publicarse.',
        badge: 'Cambios necesarios',
        badgeTone: 'red',
        title: 'Tu perfil necesita algunos ajustes',
        bodyHtml: `
          <p>Hola ${esc(SAMPLE_DOC.full_name)},</p>
          <p>Revisamos tu perfil y por ahora no pudimos publicarlo.</p>
          ${infoBox('Motivo', escMultiline('La foto de perfil se ve borrosa y la descripción tiene menos de 50 palabras. Súbela de nuevo en mejor calidad y amplía un poco tu biografía.'))}
          <p>Puedes hacer los ajustes necesarios desde tu panel y volver a enviarlo.</p>
        `,
        ctaLabel: 'Corregir mi perfil',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu documento fue aprobado en ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Uno de tus documentos fue aprobado.',
        badge: 'Documento aprobado',
        badgeTone: 'green',
        title: 'Tu documento fue aprobado',
        bodyHtml: `
          <p>Hola ${esc(SAMPLE_DOC.full_name)},</p>
          <p>Tu documento fue revisado y <strong>aprobado</strong>.</p>
          ${detailTable([detailRow('Doctor', esc(SAMPLE_DOC.full_name)), detailRow('Documento', 'Cédula profesional')])}
        `,
        ctaLabel: 'Ver mis documentos',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu documento necesita revisarse de nuevo — ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Uno de tus documentos necesita revisarse de nuevo.',
        badge: 'Cambios necesarios',
        badgeTone: 'red',
        title: 'Tu documento necesita revisarse de nuevo',
        bodyHtml: `
          <p>Hola ${esc(SAMPLE_DOC.full_name)},</p>
          <p>Revisamos tu documento y no pudimos aprobarlo.</p>
          ${detailTable([detailRow('Documento', 'Identificación oficial (INE/pasaporte)')])}
          ${infoBox('Motivo', escMultiline('La foto está borrosa y no se alcanza a leer el número de identificación.'))}
          <p>Puedes volver a subirlo desde tu panel.</p>
        `,
        ctaLabel: 'Subir de nuevo',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu artículo ya está publicado en el blog de ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Tu artículo ya está publicado en el blog.',
        badge: 'Artículo publicado',
        badgeTone: 'green',
        title: 'Tu artículo ya está publicado',
        bodyHtml: `
          <p>Hola ${esc(SAMPLE_DOC.full_name)},</p>
          <p>Tu artículo fue aprobado y ya está publicado en el blog de ${SITE_NAME}.</p>
          ${detailTable([
            detailRow('Artículo', '5 señales de que debes visitar a un dermatólogo'),
            detailRow('Ver publicado', `<a href="${SITE_URL}/blog/5-senales-dermatologo" style="color:#2F6FED;text-decoration:none;">Leer artículo &rarr;</a>`),
          ])}
        `,
        ctaLabel: 'Ir a mi panel',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Tu artículo necesita cambios — Blog de ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Tu artículo necesita algunos cambios.',
        badge: 'Cambios necesarios',
        badgeTone: 'red',
        title: 'Tu artículo necesita algunos cambios',
        bodyHtml: `
          <p>Hola ${esc(SAMPLE_DOC.full_name)},</p>
          <p>Revisamos tu artículo y por ahora no pudimos publicarlo.</p>
          ${detailTable([detailRow('Artículo', '5 señales de que debes visitar a un dermatólogo')])}
          ${infoBox('Motivo', escMultiline('El artículo menciona una marca comercial específica. Por nuestras políticas editoriales no podemos publicar contenido promocional de marcas.'))}
          <p>Puedes hacer los ajustes y volver a enviarlo desde tu panel.</p>
        `,
        ctaLabel: 'Corregir artículo',
        ctaUrl: PANEL_URL,
      }),
    },
    {
      subject: `Nueva solicitud de cita — ${SITE_NAME}`,
      html: renderEmail({
        preheader: 'Tienes una nueva solicitud de cita.',
        badge: 'Nueva solicitud',
        badgeTone: 'blue',
        title: 'Tienes una nueva solicitud de cita',
        bodyHtml: `
          <p>Hola ${esc(SAMPLE_DOC.full_name)},</p>
          <p>Un paciente acaba de solicitar una cita contigo en ${SITE_NAME}.</p>
          ${detailTable([
            detailRow('Paciente', 'María Fernanda López'),
            detailRow('Teléfono', '81 1234 5678'),
            detailRow('Motivo', 'Revisión de lunar sospechoso'),
            detailRow('Fecha preferida', '20 de agosto a las 10:00'),
            detailRow('Comentarios', escMultiline('Prefiero cita en la mañana si es posible, gracias.')),
          ])}
        `,
        ctaLabel: 'Ver mis solicitudes',
        ctaUrl: PANEL_URL,
      }),
    },
  ];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const to = body.to;
    if (!to) return Response.json({ error: 'Falta "to" en el body' }, { status: 400 });

    const emails = buildEmails();
    const results = [];
    for (const e of emails) {
      try {
        await base44.integrations.Core.SendEmail({
          to,
          subject: `[Muestra de diseño] ${e.subject}`,
          body: e.html,
          from_name: SITE_NAME,
        });
        results.push({ subject: e.subject, ok: true });
      } catch (err) {
        results.push({ subject: e.subject, ok: false, error: err.message });
      }
    }
    return Response.json({ sent_to: to, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
