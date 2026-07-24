import { base44 } from "@/api/base44Client";

// Log crudo: un registro por cada click en una tarjeta de m\u00e9dico que navega a su perfil.
export const trackDoctorClick = async (specialist, sourcePage) => {
  try {
    await base44.entities.DoctorClick.create({
      doctor_id: specialist.id,
      doctor_name: specialist.full_name,
      specialty: specialist.specialty,
      source_page: sourcePage,
    });
  } catch (e) {
    console.error("Track error:", e);
  }
};
