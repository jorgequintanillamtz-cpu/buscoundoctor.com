import { User, Stethoscope, GraduationCap, Languages, MapPin, ShieldCheck, ListChecks, Cpu, Sparkles, Image as ImageIcon, ChevronRight, CheckCircle2 } from "lucide-react";

// Todo lo que el médico puede llenar de su perfil, en un solo lugar. Cada
// tarjeta abre la pantalla que ya existía (el panel las sigue mostrando con la
// misma clave). `done` apunta a la clave del completeness_checklist cuando esa
// sección forma parte del porcentaje; las demás no muestran etiqueta.
export const PROFILE_SECTIONS = [
  { group: "Lo esencial", items: [
    { key: "perfil", label: "Mis datos y presentación", desc: "Tu foto, tu nombre, tu especialidad y cómo te presentas.", icon: User, done: (c) => c.photo && c.biography },
    { key: "formacion", label: "Mi formación", desc: "Dónde estudiaste y tus certificaciones.", icon: GraduationCap, done: (c) => c.education },
    { key: "idiomas", label: "Idiomas", desc: "Los idiomas en los que atiendes.", icon: Languages, done: (c) => c.languages },
    { key: "consultorios", label: "Mis consultorios", desc: "La dirección y los horarios donde atiendes.", icon: MapPin, done: (c) => c.office },
    { key: "detalles", label: "Detalles y servicios", desc: "Años de experiencia, precio, modalidad y formas de pago.", icon: Stethoscope },
    { key: "aseguradoras", label: "Seguros que acepto", desc: "Las aseguradoras con las que trabajas.", icon: ShieldCheck },
  ]},
  { group: "Más sobre mí (opcional)", items: [
    { key: "enfermedades", label: "Enfermedades que trato", desc: "Las condiciones que atiendes con más frecuencia.", icon: ListChecks },
    { key: "subespecialidades", label: "Subespecialidades", desc: "Áreas en las que te enfocas dentro de tu especialidad.", icon: GraduationCap },
    { key: "tecnologia", label: "Tecnología y tratamientos", desc: "Equipos y tratamientos que ofreces.", icon: Cpu },
    { key: "casos", label: "Casos de éxito", desc: "Casos que quieras compartir con tus pacientes.", icon: Sparkles },
    { key: "publicaciones", label: "Publicaciones", desc: "Fotos y novedades para tu perfil.", icon: ImageIcon },
  ]},
];

// Claves de todas las secciones que viven dentro de "Mi perfil".
export const PROFILE_SUB_KEYS = PROFILE_SECTIONS.flatMap((g) => g.items.map((i) => i.key));

export default function ProfileHub({ checklist, onNavigate }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading font-bold text-xl text-foreground">Mi perfil</h2>
        <p className="text-sm text-muted-foreground mt-1">Elige qué quieres completar. Todo se guarda solo.</p>
      </div>

      {PROFILE_SECTIONS.map((g) => (
        <div key={g.group}>
          <p className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground mb-3">{g.group}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {g.items.map((item) => {
              const known = checklist && item.done;
              const isDone = known ? !!item.done(checklist) : null;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  className="flex items-center gap-4 text-left bg-card rounded-2xl border border-border/50 p-4 min-h-[76px] hover:border-brand-blue/40 hover:shadow-sm transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-brand-bluePale flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-brand-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      {isDone === true && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Listo
                        </span>
                      )}
                      {isDone === false && (
                        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Falta completar</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
