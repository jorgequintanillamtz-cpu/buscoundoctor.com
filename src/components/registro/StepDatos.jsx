import { useState, useEffect, useMemo } from "react";
import { Gift, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";
import StepShell from "./StepShell";

// Paso 1 del wizard de registro de médicos ("Cuéntanos sobre ti"). Extraído
// de RegistroMedico.jsx a su propio componente para que tanto el registro
// real como AdminVistaRegistro.jsx (vista de previsualización del admin) lo
// importen del mismo lugar — cualquier cambio futuro a este paso se ve
// reflejado en ambos automáticamente, sin tener que mantenerlos en sync a mano.
export default function StepDatos({ data, update, error, specialties }) {
  // El doctor ya no escribe su subespecialidad como texto libre -- la elige
  // del banco Subspecialty (mismo banco que usa /admin/subespecialidades y
  // el panel del doctor ya registrado), acotada a las que cuelgan de la
  // especialidad que acaba de elegir arriba. Esto es lo que permite que el
  // buscador principal y /especialistas?subspecialty=slug encuentren a este
  // doctor con exactitud en cuanto termine el registro.
  const [allSubspecialties, setAllSubspecialties] = useState([]);

  useEffect(() => {
    base44.entities.Subspecialty.list("name", 500).then((list) => {
      setAllSubspecialties(list.filter((s) => s.active !== false));
    }).catch(() => {});
  }, []);

  const currentSpecialtyId = useMemo(
    () => specialties.find((s) => s.name === data.specialty)?.id,
    [specialties, data.specialty]
  );

  const availableSubspecialties = useMemo(
    () => allSubspecialties.filter((s) => s.parent_specialty_id === currentSpecialtyId),
    [allSubspecialties, currentSpecialtyId]
  );

  const selectedSubspecialties = data.subspecialties_relation || [];

  const toggleSubspecialty = (id) => {
    const next = selectedSubspecialties.includes(id)
      ? selectedSubspecialties.filter((x) => x !== id)
      : [...selectedSubspecialties, id];
    update("subspecialties_relation", next);
  };

  // Código de quien lo invitó (opcional). Se valida en vivo solo para
  // mostrarle "fuiste invitado por Dr. X" -- un código mal escrito o que no
  // exista NUNCA bloquea el registro, solo no se acredita el premio a nadie.
  const [referralCheck, setReferralCheck] = useState(null); // null | "checking" | { valid, full_name }
  useEffect(() => {
    const code = (data.referral_code || "").trim();
    if (!code) { setReferralCheck(null); return; }
    setReferralCheck("checking");
    const t = setTimeout(async () => {
      try {
        const { data: res } = await supabase.rpc("validate_referral_code", { p_code: code });
        setReferralCheck(res || { valid: false });
      } catch {
        setReferralCheck(null);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [data.referral_code]);

  return (
    <StepShell title="Cuéntanos sobre ti" subtitle="Así aparecerás en tu perfil público" error={error}>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre completo</label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button type="button" onClick={() => update("title", "Dr.")}
            className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${data.title === "Dr." ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent"}`}>
            Dr.
          </button>
          <button type="button" onClick={() => update("title", "Dra.")}
            className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${data.title === "Dra." ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent"}`}>
            Dra.
          </button>
        </div>
        <Input value={data.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Nombre completo" className="rounded-xl" />
      </div>

      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">WhatsApp</label>
        <Input value={data.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="Ej: 8181234567" type="tel" className="rounded-xl" />
        <p className="text-xs text-muted-foreground mt-1">Aquí te contactarán tus pacientes directamente</p>
      </div>

      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Correo electrónico</label>
        <Input value={data.email} onChange={(e) => update("email", e.target.value.trim())} placeholder="tu@correo.com" type="email" className="rounded-xl" />
        <p className="text-xs text-muted-foreground mt-1">Aquí te avisamos del avance de tu registro. Después es también el correo con el que entras a tu panel.</p>
      </div>

      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Especialidad</label>
        <select value={specialties.some((s) => s.name === data.specialty) ? data.specialty : (data.specialty ? "__otra__" : "")}
          onChange={(e) => update("specialty", e.target.value === "__otra__" ? " " : e.target.value)}
          className="w-full h-11 px-3 text-sm bg-background border border-input rounded-xl mb-2">
          <option value="">Selecciona tu especialidad</option>
          {specialties.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          <option value="__otra__">Otra (no está en la lista)</option>
        </select>
        {(data.specialty === " " || (!specialties.some((s) => s.name === data.specialty) && data.specialty)) && (
          <Input value={data.specialty.trim()} onChange={(e) => update("specialty", e.target.value)} placeholder="Escribe tu especialidad" className="rounded-xl mb-2" />
        )}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Subespecialidad certificada (opcional)</p>
          {!currentSpecialtyId ? (
            <p className="text-xs text-muted-foreground border border-dashed border-border rounded-xl px-3 py-2">
              Elige tu especialidad arriba para ver las subespecialidades disponibles.
            </p>
          ) : availableSubspecialties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableSubspecialties.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer border border-border rounded-xl px-3 py-2 hover:bg-accent/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedSubspecialties.includes(s.id)}
                    onChange={() => toggleSubspecialty(s.id)}
                    className="w-4 h-4 rounded border-input accent-primary flex-shrink-0"
                  />
                  <span className="text-sm text-foreground flex-1 min-w-0">{s.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground border border-dashed border-border rounded-xl px-3 py-2">
              Todavía no hay subespecialidades cargadas para {data.specialty} en el banco.
            </p>
          )}
        </div>
      </div>

      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cédula profesional</label>
        <Input value={data.cedula} onChange={(e) => update("cedula", e.target.value.replace(/\D/g, ""))} placeholder="Ej: 12345678" inputMode="numeric" className="rounded-xl" />
        <p className="text-xs text-muted-foreground mt-1">La verificamos manualmente antes de publicar tu perfil — le da confianza a tus pacientes.</p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Años de experiencia (opcional)</label>
        <Input value={data.years_experience} onChange={(e) => update("years_experience", e.target.value.replace(/\D/g, ""))} placeholder="Ej: 8" inputMode="numeric" className="rounded-xl" />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Precio de consulta de primera vez (MXN)</label>
        <Input value={data.service_price} onChange={(e) => update("service_price", e.target.value.replace(/[^\d.]/g, ""))} placeholder="Ej: 800" inputMode="decimal" className="rounded-xl" />
        <p className="text-xs text-muted-foreground mt-1">Ayuda a tus pacientes a saber qué esperar. Podrás agregar más precios y servicios después desde tu panel.</p>
      </div>

      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">¿Cómo atiendes?</label>
        <div className="grid grid-cols-3 gap-2">
          {[["presencial", "Presencial"], ["online", "En línea"], ["ambas", "Ambas"]].map(([val, label]) => (
            <button key={val} type="button" onClick={() => update("modality", val)}
              className={`h-11 rounded-xl border text-xs font-semibold transition-colors ${data.modality === val ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-accent"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="sm:col-span-2 bg-accent/40 border border-dashed border-border rounded-xl p-3.5">
        <label className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-brand-blue" />
          ¿Te invitó otro médico? (opcional)
        </label>
        <Input
          value={data.referral_code || ""}
          onChange={(e) => update("referral_code", e.target.value.toUpperCase().replace(/\s/g, ""))}
          placeholder="Código de invitación, ej: K7QX9P"
          className="rounded-xl uppercase"
          maxLength={12}
        />
        {referralCheck === "checking" && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Buscando…</p>
        )}
        {referralCheck?.valid && (
          <p className="text-xs text-emerald-700 mt-1.5 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Fuiste invitado por {referralCheck.full_name}</p>
        )}
        {referralCheck && referralCheck !== "checking" && !referralCheck.valid && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> No encontramos ese código — puedes dejarlo en blanco y seguir.</p>
        )}
      </div>
    </StepShell>
  );
}
