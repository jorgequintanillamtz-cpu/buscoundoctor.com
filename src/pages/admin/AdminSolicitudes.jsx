import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Calendar, Phone, MessageCircle, User, Stethoscope, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const waLink = (phone) => {
  const digits = (phone || "").replace(/\D/g, "");
  return digits ? `https://wa.me/52${digits.replace(/^52/, "")}` : null;
};

function RequestCard({ req, onMarkContacted }) {
  const [saving, setSaving] = useState(false);
  const wa = waLink(req.phone);
  const isPending = (req.status || "pendiente") === "pendiente";

  const markContacted = async () => {
    setSaving(true);
    try {
      await base44.entities.AppointmentRequest.update(req.id, { status: "contactado" });
      toast.success("Marcada como contactada");
      onMarkContacted(req.id);
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {req.patient_name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Para {req.specialist_name || "un doctor"} · Solicitado el {fmtDate(req.created_date)}
          </p>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
            isPending ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50"
          }`}
        >
          {isPending ? "Pendiente" : "Contactado"}
        </span>
      </div>

      <p className="text-sm text-foreground">{req.reason}</p>

      {(req.preferred_date || req.preferred_time) && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          Prefiere: {req.preferred_date || "cualquier fecha"} {req.preferred_time ? `a las ${req.preferred_time}` : ""}
        </p>
      )}

      {req.comments && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">{req.comments}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Phone className="w-3.5 h-3.5" /> {req.phone}
        </span>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
            </Button>
          </a>
        )}
        {isPending && (
          <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8" disabled={saving} onClick={markContacted}>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Marcar como contactado
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AdminSolicitudes() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pendientes");

  useEffect(() => {
    base44.entities.AppointmentRequest.list("-created_date", 500).then((r) => {
      setRequests(r);
      setLoading(false);
    });
  }, []);

  const handleMarked = (id) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "contactado" } : r)));
  };

  const pendientes = useMemo(
    () => requests.filter((r) => (r.status || "pendiente") === "pendiente"),
    [requests]
  );
  const visible = tab === "pendientes" ? pendientes : requests;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Calendar className="w-6 h-6 text-primary" />
        <h1 className="font-heading font-bold text-2xl text-foreground">Solicitudes de cita</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Pacientes que pidieron cita desde un perfil, con sus datos de contacto en un solo lugar.
      </p>

      <div className="inline-flex items-center bg-muted rounded-full p-1 mb-5">
        <button
          type="button"
          onClick={() => setTab("pendientes")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            tab === "pendientes" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Pendientes ({pendientes.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("todas")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            tab === "todas" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Todas ({requests.length})
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">
            {tab === "pendientes" ? "No hay solicitudes pendientes." : "Todavía no hay solicitudes de cita."}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {visible.map((req) => (
            <RequestCard key={req.id} req={req} onMarkContacted={handleMarked} />
          ))}
        </div>
      )}
    </div>
  );
}
