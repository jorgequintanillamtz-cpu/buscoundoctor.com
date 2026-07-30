import { useState } from "react";
import { Calendar } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import BookingFlow from "./BookingFlow";

// Botón fijo abajo, siempre visible en móvil. Al tocarlo abre un Bottom
// Sheet (no una página nueva) con el mismo flujo de reserva que la tarjeta
// sticky de escritorio.
export default function MobileBookingBar({ specialist, offices, services, insurers = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card border-t border-border/50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 w-full bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-bold px-5 py-3.5 min-h-[44px] rounded-full shadow-sm transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Agendar cita
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[88vh] overflow-y-auto pb-8">
          <SheetHeader>
            <SheetTitle className="font-heading text-left">Agendar cita con {specialist.full_name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <BookingFlow specialist={specialist} offices={offices} services={services} insurers={insurers} onConfirmed={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
