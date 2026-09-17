import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  PartyPopper, Camera, GraduationCap, ShieldCheck, Tag, Globe, ArrowRight,
} from "lucide-react";

// Pantallas del recorrido de bienvenida: solo informan y emocionan, no
// piden datos aquí mismo -- los formularios de verdad ya existen en sus
// propias secciones del panel, y duplicarlos aquí sería mantener dos
// veces la misma lógica. El botón final manda a "Score SEO", que ya tiene
// el checklist real con enlaces a cada sección.
const STEPS = [
  {
    icon: PartyPopper,
    title: "¡Bienvenido a BuscoUnDoctor!",
    body: "Tu perfil ya está creado y en revisión. Antes de que lleguen tus primeros pacientes, aquí tienes lo más importante que puedes agregar para que tu perfil brille -- vamos a verlo rápido.",
  },
  {
    icon: Camera,
    title: "Foto de perfil y galería",
    body: "Los perfiles con foto generan mucha más confianza -- y más clics -- que los que no tienen. También puedes subir fotos de tu consultorio.",
  },
  {
    icon: GraduationCap,
    title: "Formación académica",
    body: "Dónde estudiaste, tu especialidad y tus certificaciones le muestran a tus pacientes que eres un profesional certificado.",
  },
  {
    icon: ShieldCheck,
    title: "Documentos y cédula profesional",
    body: "Sube tu cédula para que aprobemos tu perfil y aparezca el sello de \"Verificado\" -- es lo que más confianza le da a un paciente nuevo.",
  },
  {
    icon: Tag,
    title: "Servicios y precios",
    body: "Dile a tus pacientes qué tratamientos ofreces y cuánto cuesta tu primera consulta, así saben qué esperar antes de agendar.",
  },
  {
    icon: Globe,
    title: "Idiomas y aseguradoras",
    body: "Si hablas otros idiomas o aceptas seguros médicos, dilo -- muchos pacientes filtran justo por eso.",
  },
];

export default function WelcomeTourModal({ open, onFinish }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md rounded-3xl [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-14 h-14 rounded-2xl bg-brand-bluePale flex items-center justify-center mb-4">
            <Icon className="w-7 h-7 text-brand-blue" />
          </div>
          <h2 className="font-heading font-bold text-lg text-foreground mb-2">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{current.body}</p>

          <div className="flex items-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-brand-blue" : "w-1.5 bg-border"}`}
              />
            ))}
          </div>

          <div className="w-full flex items-center gap-2">
            {!isLast && (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onFinish}>
                Saltar
              </Button>
            )}
            <Button
              className="flex-1 min-h-[44px] rounded-xl gap-1.5"
              onClick={() => (isLast ? onFinish() : setStep((s) => s + 1))}
            >
              {isLast ? "Empezar a completar mi perfil" : "Siguiente"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
