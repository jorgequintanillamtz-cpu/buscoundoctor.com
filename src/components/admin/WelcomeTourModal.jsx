import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper, Camera, ShieldCheck, MapPin, GraduationCap, ArrowRight } from "lucide-react";

// Una sola pantalla de bienvenida (antes eran 6 que no se podían cerrar).
// Solo informa: los formularios de verdad viven en "Llena tu perfil", que es
// a donde manda el botón principal.
const TIPS = [
  { icon: Camera, text: "Tu foto de perfil" },
  { icon: ShieldCheck, text: "Tu cédula, para el sello \"Verificado\"" },
  { icon: MapPin, text: "La dirección de tu consultorio" },
  { icon: GraduationCap, text: "Tu formación y tus idiomas" },
];

export default function WelcomeTourModal({ open, name, onFinish }) {
  const firstName = (name || "").replace(/^(dr\.?|dra\.?)\s+/i, "").split(" ")[0];
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onFinish(false); }}>
      <DialogContent className="max-w-md rounded-3xl">
        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-14 h-14 rounded-2xl bg-brand-bluePale flex items-center justify-center mb-4">
            <PartyPopper className="w-7 h-7 text-brand-blue" />
          </div>
          <h2 className="font-heading font-bold text-lg text-foreground mb-2">
            ¡Bienvenido a BuscoUnDoctor{firstName ? `, ${firstName}` : ""}!
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            Tu perfil ya está creado y en revisión. Para que los pacientes confíen en ti, te pedimos completar estos pasos. Toma unos minutos:
          </p>

          <ul className="w-full space-y-2 mb-6 text-left">
            {TIPS.map((tip) => (
              <li key={tip.text} className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
                <tip.icon className="w-5 h-5 text-brand-blue flex-shrink-0" />
                <span className="text-sm text-foreground">{tip.text}</span>
              </li>
            ))}
          </ul>

          <div className="w-full flex flex-col gap-2">
            <Button className="min-h-[48px] rounded-xl gap-1.5" onClick={() => onFinish(true)}>
              Empezar a llenar mi perfil
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" className="text-muted-foreground" onClick={() => onFinish(false)}>
              Lo haré después
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
