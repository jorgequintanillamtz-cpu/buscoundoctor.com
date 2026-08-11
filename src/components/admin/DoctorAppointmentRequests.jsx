import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Phone, MessageCircle, User, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaginatedList } from "@/api/usePaginatedList";
import Pagination from "@/components/admin/Pagination";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const waLink = (phone) => {
  const digits = (phone || "").replace(/\D/g, "");
  return digits ? `https://wa.me/52${digits.replace(/^52/, "")}` : null;
};

const STAT_TONES = { blue: "bg-brand-blue", navy: "bg-brand-navy" };
function KpiCard({ label, value, tone = "blue" }) {
  return (
    <div className={`rounded-xl p-3.5 ${STAT_TONES[tone]}`}>
      <p className="text-sm font-semibold text-white/90 mb-1">{label}</p>
      <p className="font-heading font-extrabold text-3xl text-white leading-tight">{value}</p>
    </div>
  );
}

function RequestCard({ req }) {
  const wa = waLink(req.phone);
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          {req.patient_name || "Paciente"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">Solicitado el {fmtDate(req.created_date)}</p>
      </div>

      {req.reason && <p className="text-sm text-foreground">{req.reason}</p>}

      {(req.preferred_date || req.preferred_time) && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          Prefiere: {req.preferred_date || "cualquier fecha"} {req.preferred_time ? `a las ${req.preferred_time}` : ""}
        </p>
      )}

      {req.comments && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">{req.comments}</p>
      )}

      {(req.phone || wa) && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
          {req.phone && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> {req.phone}
            </span>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
              </Button>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// Bandeja de solicitudes de cita del propio doctor. Antes este dato (nombre,
// teléfono, motivo de cada solicitud) solo lo podía ver el admin desde
// /admin/solicitudes — el doctor solo veía un número agregado en su
// "Inicio". El contacto real pasa por WhatsApp, pero eso depende de que el
// paciente sí apriete "enviar" del otro lado; esta lista queda como red de
// seguridad para cuando ese mensaje nunca llegó.
export default function DoctorAppointmentRequests({ specialistId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!specialistId) return;
    base44.entities.AppointmentRequest.filter({ specialist_id: specialistId }, "-created_date", 500)
      .then(setRequests)
      .finally(() => setLoading(false));
  }, [specialistId]);

  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = requests.filter((r) => {
      if (!r.created_date) return false;
      const d = new Date(r.created_date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thisWeek = requests.filter((r) => r.created_date && new Date(r.created_date) >= sevenDaysAgo).length;
    return { total: requests.length, thisMonth, thisWeek };
  }, [requests]);

  const { pageItems: pagedRequests, page, setPage, totalPages } = usePaginatedList(requests, { pageSize: 20 });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Solicitudes de cita
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
          Pacientes que pidieron cita contigo desde tu perfil. El contacto pasa directo a tu WhatsApp — esta lista
          queda aquí como respaldo, por si algún mensaje no te llegó.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 max-w-md">
        <KpiCard label="Total" value={kpis.total} tone="navy" />
        <KpiCard label="Este mes" value={kpis.thisMonth} tone="blue" />
        <KpiCard label="Esta semana" value={kpis.thisWeek} tone="navy" />
      </div>

      {requests.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-foreground">Todavía no has recibido solicitudes de cita.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {pagedRequests.map((req) => (
            <RequestCard key={req.id} req={req} />
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={requests.length} pageSize={20} />
    </div>
  );
}
