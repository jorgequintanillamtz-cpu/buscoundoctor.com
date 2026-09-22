import { base44 } from "@/api/base44Client";
import { logActivity } from "@/api/activityLog";
import { notifyProfileApproved, notifyProfileRejected } from "@/api/doctorNotify";
import { formatDateOnly } from "@/lib/dateLabels";

// Un solo lugar para "¿en qué estado real está este doctor?", en vez de
// que cada pantalla (lista de Doctores, revisión individual) lo calcule a
// su manera y se puedan ir desincronizando. Antes la lista de Doctores solo
// mostraba "Activo/Inactivo" -- un doctor que nunca se ha revisado se veía
// idéntico a uno que un admin pausó a propósito.
export const DOCTOR_STATE_STYLES = {
  draft: { label: "Borrador", cls: "bg-muted text-muted-foreground" },
  pending_review: { label: "En revisión", cls: "bg-amber-100 text-amber-700" },
  rejected: { label: "Con cambios pendientes", cls: "bg-red-100 text-red-700" },
  rejected_resubmitted: { label: "Corrigió y espera revisión", cls: "bg-blue-100 text-blue-700" },
  published: { label: "Publicado", cls: "bg-green-100 text-green-700" },
  paused: { label: "En pausa", cls: "bg-amber-100 text-amber-700" },
  vacation: { cls: "bg-sky-100 text-sky-700" }, // label se arma con la fecha
};

export function getDoctorStateInfo(doc) {
  if (!doc) return DOCTOR_STATE_STYLES.draft;
  if (doc.vacation_until) {
    return { ...DOCTOR_STATE_STYLES.vacation, label: `De vacaciones hasta el ${formatDateOnly(doc.vacation_until)}` };
  }
  if (doc.publication_status === "rejected") {
    return doc.resubmitted_at ? DOCTOR_STATE_STYLES.rejected_resubmitted : DOCTOR_STATE_STYLES.rejected;
  }
  if (doc.publication_status === "published") {
    return doc.active === true ? DOCTOR_STATE_STYLES.published : DOCTOR_STATE_STYLES.paused;
  }
  if (doc.publication_status === "suspended") return DOCTOR_STATE_STYLES.paused;
  if (doc.publication_status === "pending_review") return DOCTOR_STATE_STYLES.pending_review;
  return DOCTOR_STATE_STYLES.draft;
}

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
  await base44.entities.Specialist.update(doc.id, { publication_status: "published", active: true, resubmitted_at: null, vacation_until: null });
  logActivity({
    type: "doctor_aprobado",
    description: `Se aprobó y publicó el perfil de ${doc.full_name}`,
    specialistId: doc.id,
    specialistName: doc.full_name,
  });
  if (!alreadyVisible) notifyProfileApproved({ ...doc, publication_status: "published", active: true });
  return { publication_status: "published", active: true, vacation_until: null };
}

export async function rejectDoctor(doc, reason) {
  await base44.entities.Specialist.update(doc.id, { publication_status: "rejected", resubmitted_at: null, vacation_until: null });
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
    ? { publication_status: "published", active: false, resubmitted_at: null, vacation_until: null }
    : { publication_status: "pending_review", active: false, resubmitted_at: null, vacation_until: null };
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
