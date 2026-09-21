import { base44 } from "@/api/base44Client";
import { logActivity } from "@/api/activityLog";
import { notifyProfileApproved, notifyProfileRejected } from "@/api/doctorNotify";

// Aprobar y rechazar a un doctor. Es el ÚNICO lugar donde se hace, para que la
// Bandeja, la lista de Doctores y la pantalla de revisión se comporten igual.
//
// "Aprobar" deja el perfil publicado Y visible en el directorio (antes solo lo
// marcaba como publicado y avisaba al doctor por correo, pero el perfil seguía
// sin aparecer hasta que alguien encendía "Perfil activo" aparte). El correo de
// "tu perfil ya está publicado" se manda una sola vez: solo si el perfil no
// estaba ya visible.
// ¿Este perfil espera que el administrador lo revise? Perfiles en revisión,
// borradores con dueño, y perfiles a los que se les pidieron cambios y el doctor
// ya los corrigió (resubmitted_at). Lo usan la Bandeja, la lista y los contadores.
export function isAwaitingReview(s) {
  if (!s || s.deleted_at) return false;
  return (
    s.publication_status === "pending_review" ||
    (s.publication_status === "draft" && !!s.owner_user_id) ||
    (s.publication_status === "rejected" && !!s.resubmitted_at)
  );
}

export async function approveDoctor(doc) {
  const alreadyVisible = doc.publication_status === "published" && doc.active === true;
  await base44.entities.Specialist.update(doc.id, { publication_status: "published", active: true, resubmitted_at: null });
  logActivity({
    type: "doctor_aprobado",
    description: `Se aprobó y publicó el perfil de ${doc.full_name}`,
    specialistId: doc.id,
    specialistName: doc.full_name,
  });
  if (!alreadyVisible) notifyProfileApproved({ ...doc, publication_status: "published", active: true });
  return { publication_status: "published", active: true };
}

export async function rejectDoctor(doc, reason) {
  await base44.entities.Specialist.update(doc.id, { publication_status: "rejected", resubmitted_at: null });
  logActivity({
    type: "doctor_rechazado",
    description: `Se rechazó el perfil de ${doc.full_name}. Motivo: ${reason}`,
    specialistId: doc.id,
    specialistName: doc.full_name,
  });
  notifyProfileRejected(doc, reason);
  return { publication_status: "rejected" };
}

// Cambia el estado de un perfil desde el editor del admin, con las tres
// opciones que entiende cualquiera: en revisión, publicado (visible) o en
// pausa (oculto). Devuelve los campos que quedaron para reflejarlos en el
// formulario (si no, el autoguardado los revertiría).
export async function setDoctorState(doc, next) {
  if (next === "published") return approveDoctor(doc);
  const fields = next === "paused"
    ? { publication_status: "published", active: false, resubmitted_at: null }
    : { publication_status: "pending_review", active: false, resubmitted_at: null };
  await base44.entities.Specialist.update(doc.id, fields);
  logActivity({
    type: "perfil_desactivado",
    description: next === "paused"
      ? `Se puso en pausa el perfil de ${doc.full_name}`
      : `Se regresó a revisión el perfil de ${doc.full_name}`,
    specialistId: doc.id,
    specialistName: doc.full_name,
  });
  return fields;
}
