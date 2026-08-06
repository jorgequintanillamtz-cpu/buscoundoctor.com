import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Calendar, Phone, MessageCircle, User, Stethoscope, CheckCircle2,
  TrendingUp, Users, Search, ArrowUpDown,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  startOfWeek, eachWeekOfInterval, subWeeks, format, isWithinInterval, endOfWeek, parseISO,
} from "date-fns";
import { es } from "date-fns/locale";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const waLink = (phone) => {
  const digits = (phone || "").replace(/\D/g, "");
  return digits ? `https://wa.me/52${digits.replace(/^52/, "")}` : null;
};

// Tarjeta de KPI: mismo lenguaje visual que el Dashboard principal (azul y
// navy sólidos de marca, número grande en blanco).
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

// Un recuadro por doctor: cuántas citas ha generado el directorio para él,
// este mes y en total. No sabemos si el doctor le dio seguimiento al
// paciente (el contacto pasa directo a su WhatsApp), así que esto mide lo
// único que sí podemos medir: cuántos leads le está dando la plataforma.
// Es clickeable: al seleccionarlo se abre el detalle con todas sus citas.
function DoctorCard({ doc, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-card border border-border/50 rounded-2xl p-4 text-left hover:border-brand-blue/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        {doc.profile_photo ? (
          <img src={doc.profile_photo} alt={doc.full_name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold flex-shrink-0">
            {(doc.full_name || "D")[0]}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{doc.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">{doc.specialty || "Sin especialidad"}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Desde {fmtDate(doc.created_date)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-brand-bluePale/50 rounded-xl px-3 py-2 text-center">
          <p className="font-heading font-bold text-xl text-brand-navy leading-none">{doc.thisMonth}</p>
          <p className="text-[10px] text-muted-foreground mt-1">citas este mes</p>
        </div>
        <div className="bg-muted/50 rounded-xl px-3 py-2 text-center">
          <p className="font-heading font-bold text-xl text-foreground leading-none">{doc.total}</p>
          <p className="text-[10px] text-muted-foreground mt-1">citas totales</p>
        </div>
      </div>
    </button>
  );
}

function RequestCard({ req, hideDoctor = false }) {
  const wa = waLink(req.phone);
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {req.patient_name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hideDoctor ? "Solicitado el" : `Para ${req.specialist_name || "un doctor"} · Solicitado el`} {fmtDate(req.created_date)}
          </p>
        </div>
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
      </div>
    </div>
  );
}

export default function AdminSolicitudes() {
  const [requests, setRequests] = useState([]);
  const [specialists, setSpecialists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // "desc" = más citas primero, "asc" = menos citas primero
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.AppointmentRequest.list("-created_date", 2000),
      base44.entities.Specialist.list(),
    ]).then(([r, s]) => {
      setRequests(r);
      setSpecialists(s);
      setLoading(false);
    });
  }, []);

  // ---- KPIs: solo lo que sí podemos medir (leads generados), nada de
  // "seguimiento" porque el contacto real ocurre en el WhatsApp del doctor. ----
  const kpis = useMemo(() => {
    const total = requests.length;
    const now = new Date();
    const thisMonth = requests.filter((r) => {
      if (!r.created_date) return false;
      const d = new Date(r.created_date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thisWeek = requests.filter((r) => r.created_date && new Date(r.created_date) >= sevenDaysAgo).length;
    const doctorsWithRequests = new Set(requests.map((r) => r.specialist_id).filter(Boolean)).size;
    return { total, thisMonth, thisWeek, doctorsWithRequests };
  }, [requests]);

  // ---- Solicitudes por semana, últimas 8 semanas ----
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks = eachWeekOfInterval({ start: subWeeks(now, 7), end: now }, { weekStartsOn: 1 });
    return weeks.map((weekStart) => {
      const start = startOfWeek(weekStart, { weekStartsOn: 1 });
      const end = endOfWeek(weekStart, { weekStartsOn: 1 });
      const count = requests.filter(
        (r) => r.created_date && isWithinInterval(parseISO(r.created_date), { start, end })
      ).length;
      return { label: format(start, "d MMM", { locale: es }), Solicitudes: count };
    });
  }, [requests]);

  // ---- Un recuadro por doctor con sus citas de este mes y su histórico ----
  const allDoctorRows = useMemo(() => {
    const now = new Date();
    return specialists.map((doc) => {
      const docRequests = requests.filter((r) => r.specialist_id === doc.id);
      const thisMonth = docRequests.filter((r) => {
        if (!r.created_date) return false;
        const d = new Date(r.created_date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length;
      return { ...doc, thisMonth, total: docRequests.length };
    });
  }, [specialists, requests]);

  const specialtyOptions = useMemo(
    () => [...new Set(allDoctorRows.map((d) => d.specialty).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    [allDoctorRows]
  );

  const doctorRows = useMemo(() => {
    return allDoctorRows
      .filter((doc) => {
        if (specialtyFilter && doc.specialty !== specialtyFilter) return false;
        if (!doctorSearch.trim()) return true;
        const q = doctorSearch.trim().toLowerCase();
        return (doc.full_name || "").toLowerCase().includes(q) || (doc.specialty || "").toLowerCase().includes(q);
      })
      .sort((a, b) => (sortOrder === "desc" ? b.total - a.total : a.total - b.total));
  }, [allDoctorRows, doctorSearch, specialtyFilter, sortOrder]);

  const selectedDoctorRequests = useMemo(
    () => (selectedDoctor ? requests.filter((r) => r.specialist_id === selectedDoctor.id) : []),
    [requests, selectedDoctor]
  );

  const recentRequests = useMemo(() => requests.slice(0, 30), [requests]);

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
        El contacto pasa directo al WhatsApp del doctor, así que no sabemos si le dio seguimiento. Lo que sí puedes
        ver aquí es cuántos leads le está generando la plataforma a cada uno.
      </p>

      {/* KPIs */}
      <section className="mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <KpiCard icon={Calendar} label="Solicitudes totales" value={kpis.total} tone="blue" />
          <KpiCard icon={TrendingUp} label="Este mes" value={kpis.thisMonth} tone="navy" />
          <KpiCard icon={TrendingUp} label="Esta semana" value={kpis.thisWeek} tone="blue" />
          <KpiCard icon={Users} label="Doctores con citas" value={kpis.doctorsWithRequests} tone="navy" />
        </div>
      </section>

      {/* Gráfica */}
      <section className="mb-6">
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
      </section>

      {/* Citas por doctor */}
      <section className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-heading font-semibold text-base text-foreground">Citas por doctor</h2>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
              placeholder="Buscar doctor o especialidad..."
              className="rounded-xl pl-9 h-9 text-sm w-64 max-w-full"
            />
          </div>
        </div>

        {doctorRows.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-foreground">No hay doctores que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {doctorRows.map((doc) => (
              <DoctorCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </section>

      {/* Solicitudes recientes */}
      <section>
        <h2 className="font-heading font-semibold text-base text-foreground mb-4">Solicitudes recientes</h2>
        {recentRequests.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Todavía no hay solicitudes de cita.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {recentRequests.map((req) => (
              <RequestCard key={req.id} req={req} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
