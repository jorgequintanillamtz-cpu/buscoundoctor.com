import { base44 } from "@/api/base44Client";

// Bitácora de cada correo que manda la plataforma, para la vista de admin
// "Correos enviados" (fecha/hora, destinatario, tema, tipo, estado). Se
// llama justo después de cada intento real de SendEmail, sin importar si
// tuvo éxito o falló — así el admin también puede ver los que fallaron.
//
// "Best effort": igual que logActivity/doctorNotify, un fallo al escribir
// la bitácora nunca debe tumbar el flujo que mandó el correo de verdad.
export async function logEmail({ to, subject, type, specialistId, specialistName, status = "sent", error }) {
  if (!to || !subject || !type) return;
  try {
    await base44.entities.EmailLog.create({
      to,
      subject,
      type,
      specialist_id: specialistId || undefined,
      specialist_name: specialistName || undefined,
      status,
      error_message: error ? String(error).slice(0, 500) : undefined,
    });
  } catch (e) {
    console.error("No se pudo registrar el correo en la bitácora:", e);
  }
}
