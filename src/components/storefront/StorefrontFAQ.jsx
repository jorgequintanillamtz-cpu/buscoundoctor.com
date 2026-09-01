import React from "react";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { CREAM } from "@/lib/storefrontThemes";

export default function StorefrontFAQ({ items, theme }) {
  return (
    <section id="preguntas" className="scroll-mt-4">
      <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-white mb-3">
        <HelpCircle className="w-5 h-5" style={{ color: CREAM }} />
        Preguntas frecuentes
      </h2>
      <Accordion type="single" collapsible className="space-y-2.5">
        {items.map((item, idx) => (
          <AccordionItem
            key={item.id}
            value={`faq-${idx}`}
            className="border-0 px-4 rounded-xl"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <AccordionTrigger className="text-sm font-medium text-white text-left [&>svg]:text-white/60">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-white/70 text-sm">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}