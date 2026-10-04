import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { logActivity } from "@/api/activityLog";
import { toast } from "sonner";

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
    // La marca "corrigió y espera revisión" solo la escriben la función resubmit_for_review y
    // las decisiones del admin; un guardado del formulario (autoguardado) nunca debe pisarla.
    delete data.resubmitted_at;
    delete data.vacation_until; // solo la escriben start_vacation/end_vacation y el revisor de vacaciones
    delete data.deletion_requested_at; // solo la escriben las funciones request/cancel_profile_deletion
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

// Campos que el servidor calcula o que el formulario nunca debe mandar de
// vuelta: si cambian en pantalla (p. ej. el porcentaje de perfil completo que
// devuelve la base de datos tras guardar) NO cuentan como un cambio del usuario.
const SERVER_MANAGED_FIELDS = new Set([
  "id", "created_date", "updated_date", "owner_user_id",
  "completeness_score", "seo_score",
  "referral_code", "referred_by_id", "referral_rewarded_at",
  "account_created_at", "registration_step",
  "recovery_email_1_sent_at", "recovery_email_2_sent_at", "recovery_email_3_sent_at",
  "profile_reminder_sent_at", "cedula_reminder_sent_at", "deleted_at",
]);

const ser = (v) => JSON.stringify(v === undefined ? null : v);

// Autoguardado de verdad: guarda SOLO lo que cambió, unos 1.5 s después de que
// quien edita deja de escribir, y de inmediato al salir de la pantalla, cambiar
// de sección, apagar el celular o cerrar la pestaña. Sustituye al botón
// "Guardar cambios" y al guardado cada 30 s, que (1) en el celular no corría si
// la pantalla se apagaba o se cambiaba de app, (2) tragaba los errores en
// silencio y (3) mandaba el formulario COMPLETO cada vez, pisando lo que el
// otro (doctor o asistente) hubiera escrito en otro campo y moviendo siempre
// "Perfil actualizado". `onSaved` se dispara tras cada guardado exitoso.
//
// Devuelve { saveState, lastSaved, errorMessage, hasUnsaved, flush }:
//   saveState: "idle" | "saving" | "saved" | "error"
//   flush(): guarda ya lo pendiente (devuelve true si quedó todo guardado).
export function useAutoSaveSpecialist({ enabled, specialistId, form, formRef, buildData, onSaved, contactRef, byAdmin = false }) {
  const flushRef = useRef(null);
  const baselineRef = useRef(null); // { campo: JSON del último valor guardado/cargado }
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const retryTimerRef = useRef(null);
  const warnedRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  // buildData puede cambiar de identidad entre renders: se lee por ref para no
  // reiniciar los temporizadores ni los listeners cada vez.
  const buildDataRef = useRef(buildData);
  buildDataRef.current = buildData;
  const [saveState, setSaveState] = useState("idle");
  const [lastSaved, setLastSaved] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // Lo que cambió respecto a lo último guardado: { campo: valor }.
  const computeDiff = useCallback((f) => {
    const baseline = baselineRef.current;
    if (!baseline) return {};
    const data = buildDataRef.current(f);
    const diff = {};
    for (const key of Object.keys(data)) {
      if (SERVER_MANAGED_FIELDS.has(key)) continue;
      const value = data[key] === undefined ? null : data[key];
      if (ser(value) !== baseline[key]) diff[key] = value;
    }
    return diff;
  }, []);

  // La "foto" inicial: lo que ya estaba guardado cuando se abrió el perfil.
  useEffect(() => {
    if (!enabled || !specialistId) { baselineRef.current = null; return; }
    if (baselineRef.current) return;
    const data = buildDataRef.current(formRef.current);
    const baseline = {};
    for (const key of Object.keys(data)) baseline[key] = ser(data[key]);
    baselineRef.current = baseline;
  }, [enabled, specialistId]);

  const flush = useCallback(async () => {
    if (!enabled || !specialistId || !baselineRef.current) return true;
    if (savingRef.current) { queuedRef.current = true; return false; }
    const f = formRef.current;
    if (!f.full_name || !f.full_name.trim()) return true; // nunca guardar un perfil sin nombre
    const diff = computeDiff(f);
    if (Object.keys(diff).length === 0) { setHasUnsaved(false); return true; }
    savingRef.current = true;
    setSaveState("saving");
    let ok = false;
    try {
      await base44.entities.Specialist.update(specialistId, diff);
      for (const key of Object.keys(diff)) baselineRef.current[key] = ser(diff[key]);
      if (contactRef) trackContactChanges(contactRef, f, { specialistId, byAdmin });
      setLastSaved(new Date());
      setSaveState("saved");
      setErrorMessage("");
      warnedRef.current = false;
      setHasUnsaved(Object.keys(computeDiff(formRef.current)).length > 0);
      onSavedRef.current?.();
      ok = true;
    } catch (e) {
      setSaveState("error");
      // "Failed to fetch" / "Network request failed" = sin internet: se dice en
      // español sencillo; cualquier otro error (ej. cédula repetida) se muestra tal cual.
      const isNetwork = e instanceof TypeError || /failed to fetch|network|load failed/i.test(e?.message || "");
      const reason = isNetwork ? "revisa tu conexión a internet" : (e?.message || "error desconocido");
      setErrorMessage(reason);
      setHasUnsaved(true);
      // Un solo aviso por falla (no uno cada reintento) y un reintento solo.
      if (!warnedRef.current) {
        warnedRef.current = true;
        toast.error("No se pudieron guardar tus cambios (" + reason + "). Reintentando…");
      }
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => { flushRef.current(); }, 10000);
    } finally {
      savingRef.current = false;
      if (queuedRef.current) { queuedRef.current = false; flushRef.current(); }
    }
    return ok;
  }, [enabled, specialistId, computeDiff, contactRef, byAdmin]);

  flushRef.current = flush;

  // Cada cambio en el formulario programa un guardado corto.
  useEffect(() => {
    if (!enabled || !specialistId || !baselineRef.current) return undefined;
    const dirty = Object.keys(computeDiff(form)).length > 0;
    setHasUnsaved(dirty);
    if (!dirty) return undefined;
    const t = setTimeout(() => { flushRef.current(); }, 1500);
    return () => clearTimeout(t);
  }, [form, enabled, specialistId, computeDiff]);

  // Salir de la pantalla: guardar ya. En el celular, "hidden" es lo último que
  // dispara el navegador antes de congelar la pestaña o cerrarla.
  useEffect(() => {
    if (!enabled || !specialistId) return undefined;
    const onHidden = () => { if (document.visibilityState === "hidden") flushRef.current(); };
    const onPageHide = () => { flushRef.current(); };
    const onBeforeUnload = (e) => {
      if (Object.keys(computeDiff(formRef.current)).length > 0) { flushRef.current(); e.preventDefault(); e.returnValue = ""; }
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimeout(retryTimerRef.current);
      flushRef.current(); // al salir de la página (ej. otra ruta de la app)
    };
  }, [enabled, specialistId, computeDiff]);

  return { saveState, lastSaved, errorMessage, hasUnsaved, flush };
}
