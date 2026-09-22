import { supabase } from "@/lib/supabaseClient";
import { base44 } from "@/api/base44Client";

// Datos de la pantalla "Ajustes" del admin doctores (panel del médico).

const DEFAULT_PREFS = { citas: true, estado: true, aviso_email: "" };

// Preferencias de correo. Si el doctor nunca las tocó, todo está activado.
export async function getEmailPreferences(specialistId) {
  const { data } = await supabase
    .from("doctor_email_preference")
    .select("citas, estado, aviso_email")
    .eq("specialist_id", specialistId)
    .maybeSingle();
  return { ...DEFAULT_PREFS, ...(data || {}), aviso_email: data?.aviso_email || "" };
}

export async function saveEmailPreferences(specialistId, prefs) {
  const { error } = await supabase
    .from("doctor_email_preference")
    .upsert({ specialist_id: specialistId, citas: !!prefs.citas, estado: !!prefs.estado, aviso_email: (prefs.aviso_email || "").trim().toLowerCase() || null, updated_date: new Date().toISOString() });
  if (error) throw error;
}

// ¿La cuenta entra con correo y contraseña? (Quien entra solo con Google o Microsoft no tiene contraseña que cambiar.)
export async function hasPasswordLogin() {
  const { data } = await supabase.auth.getUser();
  const identities = data?.user?.identities || [];
  return identities.length === 0 || identities.some((i) => i.provider === "email");
}

// Cambiar contraseña: primero se comprueba la actual (entrando otra vez) y luego se guarda la nueva.
export async function changePassword(email, currentPassword, newPassword) {
  try {
    await base44.auth.loginViaEmailPassword(email, currentPassword);
  } catch {
    throw new Error("La contraseña actual no es correcta");
  }
  await base44.auth.updatePassword(newPassword);
}
