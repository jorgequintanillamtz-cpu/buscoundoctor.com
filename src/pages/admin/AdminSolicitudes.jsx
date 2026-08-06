import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Calendar, Phone, MessageCircle, User, Stethoscope, CheckCircle2,
  Clock, TrendingUp, Trophy, XCircle, PhoneMissed,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  startOfWeek, eachWeekOfInterval, subWeeks, format, isWithinInterval, endOfWeek, parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

// Estados del embudo de seguimiento: de "pendiente" (recién llegó) a un
// desenlace real (agendada / no contestó / cancelada). Esto es lo que le
// permite al dueño saber si sus doctores realmente están cerrando citas,
// no solo cuántos mensajes les llegaron.
const STATUS_META = {
  pendiente: { label: "Pendiente", badge: "bg-amber-100 text-amber-700" },
  contactado: { label: "Contactado", badge: "bg-blue-100 text-blue-700" },
  agendada: { label: "Agendada", badge: "bg-emerald-100 text-emerald-700" },
  no_contesto: { label: "No contestó", badge: "bg-slate-200 text-slate-700" },
  cancelada: { label: "Cancelada", badge: "bg-red-100 text-red-700" },
};
const STATUS_ORDER = ["pendiente", "contactado", "agendada", "no_contesto", "cancelada"];

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const waLink = (phone) => {
  const digits = (phone || "").replace(/\D/g, "");
  return digits ? `https://wa.me/52${digits.replace(/^52/, "")}` : null;
};

// Tarjeta de KPI: mismo lenguaje visual que el Dashboard principal (azul y
// navy sólidos de marca, número grande en blanco), para que se sienta como
// parte del mismo panel de control.
const STAT_TONES = {
  blue: { bg: "bg-brand-blue", iconBg: "bg-white/20" },
  navy: { bg: "bg-brand-navy", iconBg: "bg-white/15" },
};
function KpiCard({ icon: Icon, label, value, tone = "blue" }) {
  const c = STAT_TONES[tone];
  return (
    <div className={`rounded-xl p-3.5 ${c.bg}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 text-white ${c.iconBg}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-heading font-extrabold text-4xl text-white leading-tight">{value}</p>
      <span className="inline-block text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full truncate max-w-full bg-white/20 text-white">
        {label}
      </span>
    </div>
  );
}

function RequestCard({ req, onStatusChange }) {
  const [saving, setSaving] = useState(false);
  const wa = waLink(req.phone);
  const status = req.status || "pendiente";
  const meta = STATUS_META[status] || STATUS_META.pendiente;

  const updateStatus = async (next) => {
    if (next === status) return;
    setSaving(true);
    const prev = status;
    onStatusChange(req.id, next);
    try {
      await base44.entities.AppointmentRequest.update(req.id, { status: next });
    } catch (e) {
      onStatusChange(req.id, prev);
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
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${meta.badge}`}>
          {meta.label}
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

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground hidden sm:inline">Estado:</span>
          <select
            value={status}
            disabled={saving}
            onChange={(e) => updateStatus(e.target.value)}
            className="h-8 text-xs rounded-lg border border-input bg-background px-2"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function AdminSolicitudes() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pendiente");

  useEffect(() => {
    base44.entities.AppointmentRequest.list("-created_date", 1000).then((r) => {
      setRequests(r);
      setLoading(false);
    });
  }, []);

  const handleStatusChange = (id, status) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  // ---- KPIs del embudo ----
  const kpis = useMemo(() => {
    const total = requests.length;
    const byStatus = { pendiente: 0, contactado: 0, agendada: 0, no_contesto: 0, cancelada: 0 };
    requests.forEach((r) => {
      const s = r.status || "pendiente";
      if (byStatus[s] === undefined) byStatus[s] = 0;
      byStatus[s] += 1;
    });
    const contacted = total - byStatus.pendiente;
    const contactRate = total > 0 ? Math.round((contacted / total) * 100) : 0;
    const conversionRate = total > 0 ? Math.round((byStatus.agendada / total) * 100) : 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thisWeek = requests.filter((r) => r.created_date && new Date(r.created_date) >= sevenDaysAgo).length;
    return { total, byStatus, contactRate, conversionRate, thisWeek };
  }, [requests]);

  // ---- Solicitudes por semana, últimas 8 semanas ----
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks = eachWeekOfInterval(
      { start: subWeeks(now, 7), end: now },
      { weekStartsOn: 1 }
    );
    return weeks.map((weekStart) => {
      const start = startOfWeek(weekStart, { weekStartsOn: 1 });
      const end = endOfWeek(weekStart, { weekStartsOn: 1 });
      const count = requests.filter(
        (r) => r.created_date && isWithinInterval(parseISO(r.created_date), { start, end })
      ).length;
      return { label: format(start, "d MMM", { locale: es }), Solicitudes: count };
    });
  }, [requests]);

  // ---- Top doctores por solicitudes recibidas ----
  const topDoctors = useMemo(() => {
    const totals = {};
    requests.forEach((r) => {
      const key = r.specialist_id || r.specialist_name || "otro";
      if (!totals[key]) totals[key] = { name: r.specialist_name || "Sin nombre", total: 0, agendadas: 0 };
      totals[key].total += 1;
      if ((r.status || "pendiente") === "agendada") totals[key].agendadas += 1;
    });
    return Object.values(totals).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [requests]);

  const visible = useMemo(
    () =>
      statusFilter === "todas"
        ? requests
        : requests.filter((r) => (r.status || "pendiente") === statusFilter),
    [requests, statusFilter]
  );

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
      <p className="text-sm text-muted-foreground mb-6">
        No las gestionas tú directamente, pero es lo más importante del negocio: que los doctores realmente consigan
        pacientes. Aquí le das seguimiento a todo el embudo.
      </p>

      {/* KPIs */}
      <section className="mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          <KpiCard icon={Calendar} label="Solicitudes totales" value={kpis.total} tone="blue" />
          <KpiCard icon={Clock} label="Pendientes por contactar" value={kpis.byStatus.pendiente} tone="navy" />
          <KpiCard icon={MessageCircle} label="Tasa de contacto" value={`${kpis.contactRate}%`} tone="blue" />
          <KpiCard icon={CheckCircle2} label="Citas agendadas" value={kpis.byStatus.agendada} tone="navy" />
          <KpiCard icon={TrendingUp} label="Esta semana" value={kpis.thisWeek} tone="blue" />
        </div>
      </section>

      {/* Gráfica + leaderboard */}
      <section className="mb-6 grid lg:grid-cols-[1.4fr,1fr] gap-4">
        <div className="bg-card rounded-2xl border border-border/50 p-4 sm:p-5">
          <h2 className="font-heading font-semibold text-sm text-foreground mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-muted-foreground" /> Solicitudes por semana (últimas 8 semanas)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="Solicitudes" fill="#2F6FED" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-4 sm:p-5">
          <h2 className="font-heading font-semibold text-sm text-foreground mb-4 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-muted-foreground" /> Doctores con más solicitudes
          </h2>
          {topDoctors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aún no hay solicitudes.</p>
          ) : (
            <div className="space-y-1">
              {topDoctors.map((d, i) => (
                <div key={d.name + i} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-heading font-bold text-muted-foreground w-5 flex-shrink-0">{i + 1}</span>
                    <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {d.agendadas > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {d.agendadas} agendada{d.agendadas !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="text-sm font-heading font-bold text-foreground">{d.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lista de solicitudes, filtrable por estado */}
      <section>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-heading font-semibold text-base text-foreground">Solicitudes</h2>
          <div className="flex items-center gap-1 flex-wrap bg-muted rounded-full p-1">
            {["todas", ...STATUS_ORDER].map((s) => {
              const count = s === "todas" ? kpis.total : kpis.byStatus[s] || 0;
              const label = s === "todas" ? "Todas" : STATUS_META[s].label;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
            {statusFilter === "cancelada" ? (
              <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            ) : statusFilter === "no_contesto" ? (
              <PhoneMissed className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            )}
            <p className="text-sm font-medium text-foreground">No hay solicitudes en este estado.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {visible.map((req) => (
              <RequestCard key={req.id} req={req} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
