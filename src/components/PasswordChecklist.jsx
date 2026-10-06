import { Check, Circle } from "lucide-react";
import { checkPassword } from "@/lib/passwordRules";

const LEVELS = {
  debil: { label: "Débil", bar: "bg-red-500", width: "w-1/4", text: "text-red-600" },
  casi: { label: "Casi", bar: "bg-amber-500", width: "w-2/4", text: "text-amber-600" },
  segura: { label: "Segura", bar: "bg-emerald-500", width: "w-3/4", text: "text-emerald-600" },
  "muy-segura": { label: "Muy segura", bar: "bg-emerald-600", width: "w-full", text: "text-emerald-700" },
};

// Lista que se va palomeando mientras la persona escribe + barra de seguridad.
// No muestra nada hasta que empieza a escribir (para no asustar con una lista
// de "faltantes" en la pantalla en blanco).
export default function PasswordChecklist({ password, email = "", className = "" }) {
  if (!password) {
    return (
      <p className={`text-xs text-muted-foreground ${className}`}>
        Usa 10 o más caracteres, con mayúscula, minúscula y un número.
      </p>
    );
  }
  const { checks, level } = checkPassword(password, email);
  const lv = LEVELS[level];
  return (
    <div className={`space-y-2 ${className}`} aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all ${lv.bar} ${lv.width}`} />
        </div>
        <span className={`text-xs font-semibold ${lv.text}`}>{lv.label}</span>
      </div>
      <ul className="grid gap-1">
        {checks.map((c) => (
          <li key={c.key} className={`flex items-center gap-1.5 text-xs ${c.ok ? "text-emerald-700" : "text-muted-foreground"}`}>
            {c.ok ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <Circle className="w-3 h-3 flex-shrink-0 ml-0.5" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
