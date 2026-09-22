import { useState } from "react";
import { Loader2, Plane, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { formatDateOnly, dateInputValue } from "@/lib/dateLabels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const QUICK_DAYS = [
  { label: "1 semana", days: 7 },
  { label: "2 semanas", days: 14 },
  { label: "1 mes", days: 30 },
];

// Modo vacaciones: el médico oculta su perfil del directorio por unos días y
// regresa solo en la fecha elegida (lo hace un proceso de la base de datos cada hora).
export default function VacationSettings({ specialist, onStatusChange }) {
  const [returnDate, setReturnDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const onVacation = !!specialist?.vacation_until;
  const visible = specialist?.publication_status === "published" && specialist?.active === true;
  const min = dateInputValue(1);
  const max = dateInputValue(90);
  const validDate = returnDate >= min && returnDate <= max;

  const start = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("startVacation", { return_date: returnDate });
      const data = res.data || res;
      onStatusChange?.({ vacation_until: data.vacation_until, active: false });
      toast.success(`Tu perfil está de vacaciones hasta el ${formatDateOnly(data.vacation_until)}`);
      setConfirming(false);
      setReturnDate("");
    } catch (e) {
      toast.error(e.message || "No se pudo activar");
    }
    setBusy(false);
  };

  const end = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("endVacation");
      const data = res.data || res;
      onStatusChange?.({ vacation_until: null, active: !!data.active });
      toast.success("Tu perfil volvió al directorio");
    } catch (e) {
      toast.error(e.message || "No se pudo reactivar");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
        <h3 className="font-heading font-semibold text-base text-foreground flex items-center gap-2">
          <Plane className="w-4 h-4 text-muted-foreground" />
          Modo vacaciones
        </h3>

        {onVacation ? (
          <>
            <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4">
              <EyeOff className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-sky-900">Tu perfil está de vacaciones</p>
                <p className="text-sm text-sky-900/80 mt-0.5">
                  No aparece en el directorio. Volverá solo el {formatDateOnly(specialist.vacation_until)}.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-xl gap-1.5 min-h-[44px]" disabled={busy} onClick={end}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Volver ahora
              </Button>
            </div>
            <div className="pt-3 border-t border-border/50 space-y-2">
              <label className="text-xs font-medium text-muted-foreground block">¿Cambió tu fecha de regreso?</label>
              <div className="flex flex-wrap gap-2">
                <Input type="date" min={min} max={max} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="rounded-xl w-full sm:w-52" />
                <Button variant="outline" className="rounded-xl min-h-[44px]" disabled={busy || !validDate} onClick={start}>
                  Cambiar fecha
                </Button>
              </div>
            </div>
          </>
        ) : visible ? (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si vas a estar fuera unos días, puedes esconder tu perfil del directorio para no recibir solicitudes que no vas a atender.
              Regresa solo en la fecha que elijas; también puedes volver antes cuando quieras.
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">¿Cuándo regresas?</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {QUICK_DAYS.map((q) => (
                  <button
                    key={q.days}
                    type="button"
                    onClick={() => setReturnDate(dateInputValue(q.days))}
                    className={`px-3 min-h-[36px] rounded-full text-xs font-medium border transition-colors ${
                      returnDate === dateInputValue(q.days) ? "bg-brand-blue text-white border-brand-blue" : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <Input type="date" min={min} max={max} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="rounded-xl w-full sm:w-52" />
              <p className="text-xs text-muted-foreground mt-1.5">Hasta 90 días. Tu perfil vuelve al directorio ese día.</p>
            </div>
            <Button className="rounded-xl gap-1.5 min-h-[44px]" disabled={!validDate} onClick={() => setConfirming(true)}>
              <Plane className="w-4 h-4" />
              Poner mi perfil de vacaciones
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tu perfil todavía no aparece en el directorio, así que no hay nada que esconder. Cuando lo publiquemos podrás usar esta opción.
          </p>
        )}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Poner tu perfil de vacaciones?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu perfil dejará de aparecer en el directorio y los pacientes no podrán pedirte citas. Volverá solo el {formatDateOnly(returnDate)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Volver</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" disabled={busy} onClick={(e) => { e.preventDefault(); start(); }}>
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Sí, ponerlo de vacaciones
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
