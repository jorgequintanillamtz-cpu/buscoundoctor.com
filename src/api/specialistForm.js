import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { logActivity } from "@/api/activityLog";

// Compara el email/whatsapp que se está por guardar contra el último valor
// conocido (guardado en `contactRef`) y deja constancia en el historial si
// cambiaron. Se usa tanto en el guardado manual como en el autoguardado, y
// tanto desde el panel del propio doctor como desde el editor del admin,
// para que un cambio de datos de contacto quede siempre registrado sin
// importar por dónde se hizo.
export function trackContactChanges(contactRef, current, { specialistId, byAdmin = false } = {}) {
  if (!contactRef) return;
  const nextEmail = current.email || "";
  const nextWhatsapp = current.whatsapp || "";
  const prev = contactRef.current;
  const actor = byAdmin ? "Un admin" : (current.full_name || "Un doctor");
  const suffix = byAdmin ? " (editado desde el panel admin)" : "";
  if (nextEmail !== prev.email) {
    logActivity({
      type: "cambio_email",
      description: `${actor} cambió el email de contacto de "${prev.email || "(vacío)"}" a "${nextEmail || "(vacío)"}"${suffix}`,
      specialistId: specialistId || "",
      specialistName: current.full_name || "",
    });
  }
  if (nextWhatsapp !== prev.whatsapp) {
    logActivity({
      type: "cambio_telefono",
      description: `${actor} cambió el WhatsApp de "${prev.whatsapp || "(vacío)"}" a "${nextWhatsapp || "(vacío)"}"${suffix}`,
      specialistId: specialistId || "",
      specialistName: current.full_name || "",
    });
  }
  contactRef.current = { email: nextEmail, whatsapp: nextWhatsapp };
}

// Estado y lógica compartida por los dos lugares donde se edita el perfil
// de un doctor: AdminDoctorEditor.jsx (el admin, cualquier perfil) y
// DoctorPanel.jsx (el propio doctor, solo su perfil). Antes cada archivo
// tenía su propia copia casi idéntica de este código (formulario, guardar,
// autoguardado, recalcular score) y había que tocar los dos cada vez que
// cambiaba algo. RegistroMedico.jsx también usa generateSlug de aquí.

export const EMPTY_SPECIALIST_FORM = {
  full_name: "",
  slug: "",
  professional_license_number: "",
  specialty: "",
  subspecialty: "",
  description: "",
  years_experience: "",
  rating: "",
  location: "",
  city: "Monterrey",
  zone: "",
  address: "",
  whatsapp: "",
  email: "",
  instagram: "",
  modality: "presencial",
  services: [],
  insurers_relation: [],
  conditions_relation: [],
  gallery: [],
  video_url: "",
  certifications: "",
  profile_photo: "",
  featured: false,
  active: true,
  price_range: "$$",
  completeness_score: 0,
  seo_score: 0,
};

export function generateSlug(nombre) {
  return (nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Campos que un doctor jamás debe poder cambiar desde su propio panel: los
// controla exclusivamente el admin (verificación de cédula, visibilidad en
// el sitio, destacado). Solo DoctorPanel usa esto vía `stripFields`; el
// admin sí puede tocarlos, por eso AdminDoctorEditor no los excluye.
export const DOCTOR_RESTRICTED_FIELDS = [
  "publication_status",
  "license_verification_status",
  "license_verified_at",
  "license_verified_by",
  "active",
  "featured",
];

// Estado del formulario + helpers de guardado, compartidos por ambos
// editores. `stripFields` deja fuera del payload de guardado los campos que
// quien esté editando no debe poder tocar.
export function useSpecialistForm({ stripFields = [] } = {}) {
  const [form, setForm] = useState(EMPTY_SPECIALIST_FORM);
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  const update = useCallback((field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // La dirección web (slug) se genera sola a partir del nombre SOLO mientras
      // el perfil todavía no existe. Una vez guardado (tiene `id`) ya no cambia
      // al editar el nombre: cambiarla rompe los enlaces compartidos y el
      // posicionamiento en Google. Para cambiarla a propósito, el admin la edita
      // en "Avanzado".
      if (field === "full_name" && !prev._slugManual && !prev.id) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  }, []);

  const buildData = useCallback((f) => {
    const data = {
      ...f,
      years_experience: f.years_experience ? Number(f.years_experience) : undefined,
      rating: f.rating ? Number(f.rating) : undefined,
      slug: f.slug || generateSlug(f.full_name),
    };
    delete data._slugManual;
    stripFields.forEach((field) => { delete data[field]; });
    return data;
  }, [stripFields]);

  return { form, setForm, formRef, update, buildData };
}

// Recalcula completitud/SEO invocando la función del backend y actualiza el
// form. Devuelve el checklist (lo usa la pantalla "Llena tu perfil" del panel del
// doctor; el editor del admin simplemente lo ignora).
export function useRecalculateScore(setForm) {
  return useCallback(async (specialistId) => {
    if (!specialistId) return null;
    try {
      const res = await base44.functions.invoke("recalculateSpecialistScore", { specialist_id: specialistId });
      const data = res.data || res;
      if (typeof data.completeness_score === "number") {
        setForm((prev) => ({
          ...prev,
          completeness_score: data.completeness_score,
          seo_score: data.seo_score ?? prev.seo_score,
        }));
      }
      // Los 9 puntos del porcentaje "perfil completo" (ver recalculate_specialist_score).
      return data.completeness_checklist || null;
    } catch {
      return null;
    }
  }, [setForm]);
}

// Autoguardado cada 30s mientras haya un perfil ya guardado. `onSaved` se
// dispara después de cada guardado exitoso (para refrescar "Guardado a
// las..." y, si aplica, recalcular el score).
export function useAutoSaveSpecialist({ enabled, specialistId, formRef, buildData, onSaved, contactRef, byAdmin = false }) {
  useEffect(() => {
    if (!enabled || !specialistId) return;
    const interval = setInterval(async () => {
      const f = formRef.current;
      if (!f.full_name) return;
      try {
        await base44.entities.Specialist.update(specialistId, buildData(f));
        if (contactRef) trackContactChanges(contactRef, f, { specialistId, byAdmin });
        onSaved?.();
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [enabled, specialistId]);
}
