import React from "react";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export default function StorefrontFAQ({ items }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-gray-900 mb-3">
        <HelpCircle className="w-5 h-5 text-blue-600" />
        Preguntas frecuentes
      </h2>
      <Accordion type="single" collapsible className="space-y-2">
        {items.map((item, idx) => (
          <AccordionItem
            key={item.id}
            value={`faq-${idx}`}
            className="bg-white rounded-xl px-4 shadow-sm border border-gray-100"
          >
            <AccordionTrigger className="text-sm font-medium text-gray-900 text-left">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 text-sm">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}