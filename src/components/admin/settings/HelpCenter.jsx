import { MessageCircle, Link2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { supportWhatsAppLink } from "@/components/DoctorSupportWhatsApp";
import { DOCTOR_HELP } from "@/lib/doctorHelp";

export default function HelpCenter({ slug }) {
  const [copied, setCopied] = useState(false);
  const profileUrl = slug ? `https://buscoundoctor.com/especialista/${slug}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Si el navegador no deja copiar, el enlace igual queda visible para seleccionarlo.
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {profileUrl && (
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <p className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" /> El enlace de tu perfil
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-foreground break-all flex-1 min-w-[200px] select-all">{profileUrl}</p>
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={copy}>
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Compártelo con tus pacientes por WhatsApp o en tus redes.</p>
        </div>
      )}

      {DOCTOR_HELP.map((g) => (
        <div key={g.group}>
          <p className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground mb-2">{g.group}</p>
          <Accordion type="multiple" className="bg-card rounded-2xl border border-border/50 px-5">
            {g.items.map((item, i) => (
              <AccordionItem key={item.q} value={`${g.group}-${i}`} className="border-border/50 last:border-b-0">
                <AccordionTrigger className="text-sm font-medium text-left hover:no-underline">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}

      <div className="bg-brand-bluePale/50 rounded-2xl border border-brand-blue/15 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-sm text-foreground">¿No encontraste tu respuesta?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Escríbenos por WhatsApp y te ayudamos.</p>
        </div>
        <Button className="rounded-xl gap-1.5 min-h-[44px] bg-[#25D366] hover:bg-[#20BD5A] text-white" asChild>
          <a href={supportWhatsAppLink()} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-4 h-4" />
            Escribirnos por WhatsApp
          </a>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground px-1">
        Consulta nuestro <Link to="/aviso-de-privacidad" className="text-brand-blue hover:underline">Aviso de privacidad</Link> y los <Link to="/terminos-y-condiciones" className="text-brand-blue hover:underline">Términos y condiciones</Link>.
      </p>
    </div>
  );
}
