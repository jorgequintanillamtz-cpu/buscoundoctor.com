import { ArrowLeft, ArrowRight, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Barra fija de abajo del "paso a paso": le dice al médico en qué paso va y le
// da Atrás / Siguiente. Las pantallas que se ven arriba son las de siempre;
// esta barra solo las encadena.
export default function GuidedStepBar({ stepNumber, total, title, done, isLast, onBack, onNext, onExit }) {
  return (
    <div className="fixed bottom-0 inset-x-0 lg:left-72 z-40 pr-20 bg-card border-t border-border shadow-[0_-4px_16px_rgba(11,30,77,0.08)]">
      <div className="max-w-6xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full flex-1 transition-colors ${i < stepNumber ? "bg-brand-blue" : "bg-border"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Paso {stepNumber} de {total}</p>
            <p className="text-sm font-heading font-semibold text-foreground flex items-center gap-1.5">
              {title}
              {done && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-label="Listo" />}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-1" onClick={onExit}>
              <X className="w-4 h-4" />
              Salir
            </Button>
            {stepNumber > 1 && (
              <Button variant="outline" className="rounded-xl gap-1.5 min-h-[44px]" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
                Atrás
              </Button>
            )}
            <Button className="rounded-xl gap-1.5 min-h-[44px]" onClick={onNext}>
              {isLast ? "Terminar" : "Siguiente"}
              {!isLast && <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
