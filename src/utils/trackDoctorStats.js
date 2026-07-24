import { base44 } from "@/api/base44Client";

const _impressionedThisSession = new Set();

// Registra una impresión (vista) de la tarjeta de un médico, máximo una vez
// por médico por sesión de navegación. El fallo aquí nunca debe romper la UI.
export const trackDoctorImpression = async (specialist) => {
  if (!specialist?.id || _impressionedThisSession.has(specialist.id)) return;
  _impressionedThisSession.add(specialist.id);

  const today = new Date().toISOString().split("T")[0];

  try {
    const existing = await base44.entities.DoctorImpression.filter({ doctor_id: specialist.id, date: today });
    if (existing.length > 0) {
      await base44.entities.DoctorImpression.update(existing[0].id, { count: (existing[0].count || 0) + 1 });
    } else {
      await base44.entities.DoctorImpression.create({
        doctor_id: specialist.id,
        doctor_name: specialist.full_name,
        date: today,
        count: 1,
      });
    }
  } catch (e) {
    // fallo silencioso — el tracking nunca debe romper la UI
  }
};
