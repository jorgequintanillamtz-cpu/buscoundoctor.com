import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { renderEmail, detailTable, detailRow, esc } from "@/api/emailTemplate";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Formulario de "avísame cuando haya especialistas" para las páginas de
// especialidad+ciudad que todavía no tienen ningún médico dado de alta.
// Guarda el correo en Supabase (para poder avisarle al paciente después) y,
// aparte, le manda un correo al admin en tiempo real -- así Jorge se entera
// de en qué especialidad/ciudad hay demanda real de pacientes, señal útil
// para priorizar el reclutamiento de médicos.
export default function SpecialtyInterestForm({ specialtyName, cityName }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError("Escribe un correo válido.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await base44.entities.SpecialtyInterestSignup.create({
        email,
        specialty_name: specialtyName,
        city_name: cityName,
      });
      setSubmitted(true);
      // Best-effort: si falla el correo al admin, el registro ya quedó
      // guardado y el paciente igual ve el mensaje de éxito.
      const html = renderEmail({
        preheader: `Interés en ${specialtyName} en ${cityName}`,
        badge: "Interés de paciente",
        title: "Nuevo interés en una especialidad sin médicos aún",
        bodyHtml: detailTable([
          detailRow("Especialidad", esc(specialtyName)),
          detailRow("Ciudad", esc(cityName)),
          detailRow("Correo", esc(email)),
        ]),
      });
      base44.integrations.Core.SendEmail({
        type: "nuevo_interes_especialidad",
        subject: `Nuevo interés: ${specialtyName} en ${cityName}`,
        body: html,
      }).catch(() => {});
    } catch (err) {
      setError("No se pudo guardar tu correo. Intenta de nuevo.");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        <span>Listo, te avisaremos por correo en cuanto haya especialistas disponibles aquí.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu correo electrónico"
            className="h-10 rounded-xl text-sm pl-9"
            disabled={submitting}
          />
        </div>
        <Button type="submit" size="sm" className="rounded-xl flex-shrink-0" disabled={submitting}>
          {submitting ? "Enviando..." : "Avísame"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </form>
  );
}
