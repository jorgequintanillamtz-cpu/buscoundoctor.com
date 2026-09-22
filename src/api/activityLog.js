import { base44 } from "@/api/base44Client";

// Etiquetas legibles para cada tipo de movimiento, compartidas entre las
// páginas que registran actividad y la página de historial que las lista.
export const ACTIVITY_TYPE_LABELS = {
  premium_activado: "Premium activado",
  premium_desactivado: "Premium desactivado",
  prueba_iniciada: "Prueba iniciada",
  prueba_terminada: "Prueba terminada",
  perfil_activado: "Perfil activado",
  perfil_desactivado: "Perfil desactivado",
  destacado_activado: "Destacado activado",
  destacado_desactivado: "Destacado quitado",
  pago_registrado: "Pago registrado",
  pago_eliminado: "Pago eliminado",
  monto_actualizado: "Monto mensual actualizado",
  dia_cobro_actualizado: "Día de cobro actualizado",
  doctor_aprobado: "Doctor aprobado",
  doctor_rechazado: "Doctor rechazado",
  doctor_eliminado: "Doctor eliminado permanentemente",
  doctor_papelera: "Doctor movido a la papelera",
  doctor_restaurado: "Doctor restaurado",
  doctor_solicita_baja: "Doctor pidió darse de baja",
  doctor_cancela_baja: "Doctor canceló su solicitud de baja",
  doctor_inicia_vacaciones: "Doctor se fue de vacaciones",
  doctor_termina_vacaciones: "Doctor terminó sus vacaciones",
  doctor_descarga_datos: "Doctor descargó sus datos",
  doctor_invita_asistente: "Doctor invitó a un asistente",
  doctor_quita_asistente: "Doctor quitó el acceso de su asistente",
  registro_eliminado: "Registro en progreso eliminado permanentemente",
  registro_papelera: "Registro en progreso movido a la papelera",
  documento_aprobado: "Documento aprobado",
  documento_rechazado: "Documento rechazado",
  resena_aprobada: "Reseña aprobada",
  resena_eliminada: "Reseña eliminada",
  resena_rechazada: "Reseña rechazada",
  blog_aprobado: "Artículo de blog aprobado",
  blog_rechazado: "Artículo de blog rechazado",
  cambio_email: "Email de contacto modificado",
  cambio_telefono: "WhatsApp modificado",
  acceso_admin_denegado: "Intento de acceso admin denegado",
};

// Agrupación por "tono" (positivo/negativo/neutro), usada para colorear la
// fila en la página de historial sin tener que repetir esta lista ahí.
export const ACTIVITY_POSITIVE = new Set([
  "premium_activado", "prueba_iniciada", "perfil_activado", "destacado_activado",
  "pago_registrado", "doctor_aprobado", "doctor_restaurado", "documento_aprobado", "resena_aprobada", "blog_aprobado",
]);
export const ACTIVITY_NEGATIVE = new Set([
  "premium_desactivado", "perfil_desactivado", "destacado_desactivado", "pago_eliminado",
  "doctor_rechazado", "doctor_solicita_baja", "doctor_eliminado", "doctor_papelera", "registro_eliminado", "registro_papelera",
  "documento_rechazado", "resena_eliminada", "resena_rechazada", "blog_rechazado", "acceso_admin_denegado",
]);

// Registra un movimiento en el historial. Es "best effort": si falla, no
// debe romper la acción principal que el admin acaba de hacer (por eso
// nunca se usa `await` bloqueante desde quien la llama ni se relanza el
// error — solo se deja constancia en consola).
export async function logActivity({ type, description, specialistId = "", specialistName = "" }) {
  try {
    await base44.entities.ActivityLog.create({
      type,
      description,
      specialist_id: specialistId || "",
      specialist_name: specialistName || "",
    });
  } catch (e) {
    console.error("No se pudo registrar el movimiento en el historial:", e);
  }
}
