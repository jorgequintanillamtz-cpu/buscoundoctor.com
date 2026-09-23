import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { loadPremiumStatuses, mergePremiumStatus } from "@/api/premiumStatus";
import DoctorStatsPanel from "@/components/admin/DoctorStatsPanel";
import {
  Stethoscope, TrendingUp, BarChart3, Heart, MapPin, Filter,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { eachWeekOfInterval, subWeeks, startOfWeek, endOfWeek, isWithinInterval, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";

const fmtMoney = (n) => `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

// Mismos colores de marca que se usan en el resto del sitio (countdown,
// footer, botones): azul y navy sólidos con texto blanco, en vez de los
// tonos pastel apagados. Dos variantes para dar un poco de ritmo visual.
const STAT_TONES = {
  blue: { bg: "bg-brand-blue" },
  navy: { bg: "bg-brand-navy" },
};

function StatCard({ label, value, tone = "blue" }) {
  const c = STAT_TONES[tone];
  return (
    <div className={`rounded-xl p-3.5 ${c.bg}`}>
      <p className="text-sm font-semibold text-white/90 mb-1">{label}</p>
      <p className="font-heading font-extrabold text-4xl text-white leading-tight">{value}</p>
    </div>
  );
}

// Chip de título de sección, en el mismo azul de marca que el resto del sitio.
function SectionLabel({ icon: Icon, children }) {
  return (
    <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-brand-bluePale text-brand-navy px-2.5 py-1 rounded-full mb-3">
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </h2>
  );
}

// Nombres cortos para el eje del gráfico de crecimiento: semana del lunes
// tal cual, ej. "13 ene".
function weekLabel(weekStart) {
  return format(weekStart, "d MMM", { locale: es });
}

// El paso del formulario público (/registro-medico) en el que se guardó el
// último avance -- lo escribe la RPC save_registration_draft cada vez que
// alguien completa "Datos", "Ubicación" o "Fotos", antes incluso de tener
// cuenta. Un doctor creado por otro camino (ej. el editor del admin) nunca
// toca esta columna, así que sirve para aislar solo intentos de
// autoregistro público del resto de la tabla specialist.
const STEP_LABELS = { datos: "Datos", ubicacion: "Ubicación", fotos: "Fotos" };
const STEP_ORDER = ["datos", "ubicacion", "fotos"];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [specialists, setSpecialists] = useState([]);
  const [offices, setOffices] = useState([]);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    async function load() {
      const [rawSpecialists, payments, premiumStatuses, rawOffices, rawZones] = await Promise.all([
        base44.entities.Specialist.list(),
        base44.entities.PremiumPayment.list(),
        loadPremiumStatuses(),
        base44.entities.Office.list(),
        base44.entities.Zone.list(),
      ]);
      // Los doctores en la papelera no cuentan en las métricas del dashboard.
      const merged = mergePremiumStatus(rawSpecialists, premiumStatuses).filter((s) => !s.deleted_at);
      setSpecialists(merged);
      setOffices(rawOffices);
      setZones(rawZones);

      const activeDoctors = merged.filter((s) => s.active).length;
      const premiumDoctors = merged.filter((s) => s.plan_slug === "premium").length;

      // Valor ventas al mes = solo lo YA cobrado este mes (pagos registrados
      // en PremiumPayment con fecha dentro del mes en curso), no lo esperado.
      const now = new Date();
      const monthlyValue = payments
        .filter((p) => {
          if (!p.payment_date) return false;
          const d = new Date(p.payment_date);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        })
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newLast30 = merged.filter(
        (s) => s.created_date && new Date(s.created_date) >= thirtyDaysAgo
      ).length;

      setData({
        business: {
          activeDoctors,
          newLast30,
          premiumDoctors,
          monthlyValue,
        },
      });
      setLoading(false);
    }
    load();
  }, []);

  // ---- Crecimiento: registros nuevos por semana, últimas 12 semanas ----
  const growthData = useMemo(() => {
    const now = new Date();
    const weeks = eachWeekOfInterval(
      { start: subWeeks(now, 11), end: now },
      { weekStartsOn: 1 }
    );
    return weeks.map((weekStartRaw) => {
      const weekStart = startOfWeek(weekStartRaw, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStartRaw, { weekStartsOn: 1 });
      const count = specialists.filter(
        (s) => s.created_date && isWithinInterval(parseISO(s.created_date), { start: weekStart, end: weekEnd })
      ).length;
      return { label: weekLabel(weekStart), "Registros nuevos": count };
    });
  }, [specialists]);

  // ---- Embudo de registro (últimos 30 días): cuántos empiezan a llenar
  // /registro-medico, cuántos sí terminan (crean su cuenta), y en qué paso
  // se quedan los que no. Un intento "termina" cuando queda con
  // owner_user_id -- create_doctor_profile lo pone al reclamar el borrador;
  // mientras tanto, el borrador vive con publication_status='draft' y sin
  // dueño. Ojo: esto mide desde que alguien ya llenó nombre+WhatsApp+
  // especialidad (lo mínimo para que se guarde el primer borrador) -- no
  // sabemos cuánta gente solo abrió la página sin llegar a eso; para verlo
  // haría falta Google Analytics/Search Console, que hoy no está conectado.
  const registrationFunnel = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const attempts = specialists.filter(
      (s) => s.registration_step && s.created_date && new Date(s.created_date) >= thirtyDaysAgo
    );
    const finished = attempts.filter((s) => s.owner_user_id);
    const stuck = attempts.filter((s) => !s.owner_user_id);
    const stuckByStep = STEP_ORDER.map((step) => ({
      step,
      label: STEP_LABELS[step],
      count: stuck.filter((s) => s.registration_step === step).length,
    }));
    return {
      started: attempts.length,
      finished: finished.length,
      stuckTotal: stuck.length,
      conversionPct: attempts.length > 0 ? Math.round((finished.length / attempts.length) * 100) : null,
      stuckByStep,
    };
  }, [specialists]);

  // ---- Doctores por especialidad: top 8, el resto agrupado en "Otras" ----
  const specialtyData = useMemo(() => {
    const totals = {};
    specialists.forEach((s) => {
      const name = (s.specialty || "").trim();
      if (!name) return;
      totals[name] = (totals[name] || 0) + 1;
    });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 8).map(([name, count]) => ({ name, count }));
    const restTotal = sorted.slice(8).reduce((sum, [, count]) => sum + count, 0);
    if (restTotal > 0) top.push({ name: "Otras", count: restTotal });
    const max = Math.max(1, ...top.map((t) => t.count));
    return top.map((t) => ({ ...t, pct: Math.round((t.count / max) * 100) }));
  }, [specialists]);

  // ---- Doctores por zona: vía los consultorios (specialist.zone es campo
  // legado; la zona real de hoy vive en office.zone_id -> catálogo Zone).
  // Un doctor con consultorios en dos zonas cuenta en ambas -- de verdad
  // atiende en las dos.
  const zoneData = useMemo(() => {
    const zoneNameById = Object.fromEntries(zones.map((z) => [z.id, z.name]));
    const specialistIdsBySpecialist = new Set(specialists.map((s) => s.id));
    const seen = {}; // `${zoneName}|${specialistId}` -> true, para no contar 2 consultorios del mismo doctor en la misma zona
    const totals = {};
    offices.forEach((o) => {
      if (!o.zone_id || !o.specialist_id || !specialistIdsBySpecialist.has(o.specialist_id)) return;
      const zoneName = zoneNameById[o.zone_id];
      if (!zoneName) return;
      const key = `${zoneName}|${o.specialist_id}`;
      if (seen[key]) return;
      seen[key] = true;
      totals[zoneName] = (totals[zoneName] || 0) + 1;
    });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...sorted.map(([, count]) => count));
    return sorted.map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }));
  }, [offices, zones, specialists]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  const { business } = data;

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl text-foreground mb-1">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Resumen general del negocio y actividad de la plataforma.
      </p>

      {/* Resumen: los 4 números que más le importan al dueño, hasta arriba */}
      <section className="mb-6">
        <SectionLabel icon={TrendingUp}>Resumen</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatCard label="Registros nuevos (30 días)" value={business.newLast30} tone="blue" />
          <StatCard label="Doctores activos" value={business.activeDoctors} tone="navy" />
          <StatCard label="Doctores premium" value={business.premiumDoctors} tone="blue" />
          <StatCard label="Valor ventas al mes (cobrado)" value={fmtMoney(business.monthlyValue)} tone="navy" />
        </div>
      </section>

      {/* Embudo de registro: no solo "cuántos", sino "dónde se quedan" los
          que no terminan -- para saber si conviene simplificar el
          formulario o si el problema es que casi nadie ni siquiera lo
          empieza. */}
      <section className="mb-6">
        <SectionLabel icon={Filter}>Embudo de registro</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
          <StatCard label="Empezaron el registro (30 días)" value={registrationFunnel.started} tone="blue" />
          <StatCard label="Crearon su cuenta" value={registrationFunnel.finished} tone="navy" />
          <StatCard label="Tasa de conversión" value={registrationFunnel.conversionPct != null ? `${registrationFunnel.conversionPct}%` : "—"} tone="blue" />
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground mb-1">¿En qué paso se quedan los que no terminan?</p>
          <p className="text-xs text-muted-foreground mb-3">
            Solo cuenta a quienes ya empezaron a escribir su nombre — no sabemos cuánta gente nomás abrió la página sin escribir nada.
          </p>
          {registrationFunnel.started === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Todavía no hay intentos de registro en los últimos 30 días.</p>
          ) : registrationFunnel.stuckTotal === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Todos los que empezaron, terminaron. 🎉</p>
          ) : (
            <div className="space-y-2.5">
              {registrationFunnel.stuckByStep.map((s) => (
                <div key={s.step}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">Se quedaron en "{s.label}"</span>
                    <span className="text-muted-foreground">{s.count}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${Math.round((s.count / registrationFunnel.stuckTotal) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Crecimiento: cuántos doctores nuevos se registran cada semana, y en
          qué especialidades y zonas está la base actual -- para ver el
          ritmo de crecimiento y dónde conviene reclutar más. */}
      <section className="mb-6">
        <SectionLabel icon={TrendingUp}>Crecimiento</SectionLabel>
        <div className="bg-card border border-border/50 rounded-2xl p-4 mb-3">
          <p className="text-sm font-semibold text-foreground mb-3">Registros nuevos por semana (últimas 12 semanas)</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F6FED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2F6FED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E7EC" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
                <Tooltip />
                <Area type="monotone" dataKey="Registros nuevos" stroke="#2F6FED" fill="url(#growthFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-card border border-border/50 rounded-2xl p-4">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-muted-foreground" /> Doctores por especialidad
            </p>
            {specialtyData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Todavía no hay especialidades capturadas.</p>
            ) : (
              <div className="space-y-2.5">
                {specialtyData.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground truncate pr-2">{s.name}</span>
                      <span className="text-muted-foreground flex-shrink-0">{s.count}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-brand-blue rounded-full" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-4">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Doctores por zona
            </p>
            {zoneData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Todavía no hay consultorios con zona capturada.</p>
            ) : (
              <div className="space-y-2.5">
                {zoneData.map((z) => (
                  <div key={z.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground truncate pr-2">{z.name}</span>
                      <span className="text-muted-foreground flex-shrink-0">{z.count}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-brand-navy rounded-full" style={{ width: `${z.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Estadísticas: impresiones, clicks y citas agendadas de todos los
          doctores. Antes vivía en /admin/estadisticas como página aparte;
          se fusionó aquí para no tener que saltar entre pantallas. */}
      <section className="mb-6">
        <SectionLabel icon={BarChart3}>Estadísticas</SectionLabel>
        <div className="bg-brand-bluePale/30 border border-brand-blue/10 rounded-2xl p-3">
          <DoctorStatsPanel />
        </div>
      </section>

    </div>
  );
}
