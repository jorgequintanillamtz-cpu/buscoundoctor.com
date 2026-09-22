import { Calendar, Star, FileText, CheckCircle2, AlertTriangle, PauseCircle, BadgeCheck, Bell, Plane, Gift } from "lucide-react";

// Cómo se ve cada tipo de aviso en el centro de notificaciones del médico.
// Los tipos los crea la base de datos (ver la migración doctor_notifications).
export const NOTIFICATION_STYLES = {
  cita_nueva: { icon: Calendar, tone: "bg-blue-50 text-blue-600" },
  resena_nueva: { icon: Star, tone: "bg-amber-50 text-amber-600" },
  resena_publicada: { icon: Star, tone: "bg-amber-50 text-amber-600" },
  documento_aprobado: { icon: FileText, tone: "bg-emerald-50 text-emerald-600" },
  documento_rechazado: { icon: FileText, tone: "bg-red-50 text-red-600" },
  perfil_publicado: { icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
  perfil_ajuste: { icon: AlertTriangle, tone: "bg-red-50 text-red-600" },
  referido_premiado: { icon: Gift, tone: "bg-violet-50 text-violet-600" },
  perfil_vacaciones: { icon: Plane, tone: "bg-sky-50 text-sky-600" },
  perfil_pausa: { icon: PauseCircle, tone: "bg-slate-100 text-slate-600" },
  cedula_verificada: { icon: BadgeCheck, tone: "bg-emerald-50 text-emerald-600" },
};

export function notificationStyle(type) {
  return NOTIFICATION_STYLES[type] || { icon: Bell, tone: "bg-muted text-muted-foreground" };
}

// Pantalla del panel a la que lleva cada aviso.
export const DEFAULT_NOTIFICATION_SECTION = "resumen";
