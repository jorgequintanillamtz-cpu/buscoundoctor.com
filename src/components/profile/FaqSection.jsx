import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { HelpCircle } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// FAQ del perfil: reutiliza preguntas reales ya publicadas para la
// especialidad del médico (entidad FaqItem), en vez de inventar contenido
// genérico. Si no hay FAQs publicadas para esa especialidad, no se muestra
// nada (mejor omitir que mostrar una sección vacía o inventada).
export default function FaqSection({ specialist }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    if (!specialist.specialty) return;
    (async () => {
      try {
        const list = await base44.entities.FaqItem.filter({ specialty: specialist.specialty, status: "publicado" });
        if (!active) return;
        setItems(list.slice(0, 6));
      } catch {}
    })();
    return () => { active = false; };
  }, [specialist.specialty]);

  useEffect(() => {
    if (items.length === 0) return;
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": items.map((f) => ({
        "@type": "Question",
        "name": f.question,
        "acceptedAnswer": { "@type": "Answer", "text": f.answer },
      })),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "specialist-faq-jsonld";
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div id="faq" className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8 scroll-mt-32">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg text-foreground">Preguntas frecuentes</h2>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {items.map((f) => (
          <AccordionItem key={f.id} value={f.id}>
            <AccordionTrigger className="text-sm font-semibold text-foreground text-left">{f.question}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
