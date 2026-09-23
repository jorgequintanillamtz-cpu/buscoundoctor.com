import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Crown, Plus, Loader2, Trash2,
  ChevronDown, ChevronUp, Stethoscope, AlertTriangle, CheckCircle2, Ban, Power, Hourglass,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  startOfMonth, endOfMonth, isWithinInterval, parseISO,
  eachMonthOfInterval, subMonths, format, differenceInCalendarDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { logActivity } from "@/api/activityLog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { loadPremiumStatuses, mergePremiumStatus, savePremiumStatus } from "@/api/premiumStatus";

const METHOD_LABELS = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

const DEFAULT_RATE = 1999;
const DEFAULT_BILLING_DAY = 1;

const EMPTY_PAYMENT = { specialist_id: "", amount: String(DEFAULT_RATE), payment_date: new Date().toISOString().slice(0, 10), period_label: "", method: "transferencia", notes: "" };

const STAT_TONES = {
  blue: { bg: "bg-brand-blue", iconBg: "bg-white/20" },
  navy: { bg: "bg-brand-navy", iconBg: "bg-white/15" },
};

function KpiCard({ label, value, tone = "blue" }) {
  const t = STAT_TONES[tone] || STAT_TONES.blue;
  return (
    <div className={`${t.bg} rounded-2xl p-5`}>
      <p className="text-sm font-semibold text-white/90 mb-1.5">{label}</p>
      <p className="font-heading font-extrabold text-3xl lg:text-4xl text-white">{value}</p>
    </div>
  );
}

// Como Retrasados: naranja/rojo cuando hay algo pendiente, tono neutro claro
// cuando todo está al día (mismo patrón que las alertas del Dashboard). Sin
// ícono ni burbuja: la etiqueta va arriba del número, en texto plano.
function AlertKpiCard({ label, value, active }) {
  return (
    <div className={`rounded-2xl p-5 ${active ? "bg-red-500" : "bg-brand-bluePale"}`}>
      <p className={`text-sm font-semibold mb-1.5 ${active ? "text-white/90" : "text-brand-navy/80"}`}>{label}</p>
      <p className={`font-heading font-extrabold text-3xl lg:text-4xl ${active ? "text-white" : "text-brand-navy"}`}>{value}</p>
    </div>
  );
}

const fmtMoney = (n) => `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
// `payment_date` viene de una columna `date` de Postgres ("YYYY-MM-DD", sin
// hora): `new Date("YYYY-MM-DD")` la interpreta como medianoche UTC, y en
// zonas horarias detrás de UTC (como México) eso se muestra como el día
// anterior. Si la fecha viene sin hora, se ancla a medianoche local en vez
// de UTC. Los campos con hora/zona (timestamptz, como trial_ends_at) se
// parsean normal, ya representan un instante absoluto real.
const fmtDate = (d) => {
  if (!d) return "—";
  const isDateOnly = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
  const date = isDateOnly ? new Date(`${d}T00:00:00`) : new Date(d);
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Con pruebas de 1/3/12 meses, mostrar el conteo en días se ve raro para
// las largas ("364 días más"); se redondea a la unidad más legible.
const fmtTrialRemaining = (days) => {
  if (days >= 60) {
    const months = Math.round(days / 30);
    return `${months} mes${months !== 1 ? "es" : ""} más`;
  }
  if (days >= 14) {
    const weeks = Math.round(days / 7);
    return `${weeks} semana${weeks !== 1 ? "s" : ""} más`;
  }
  return `${days} día${days !== 1 ? "s" : ""} más`;
};

// Tarjeta de un doctor Premium: su ciclo de cobro (día del mes que le toca
// pagar, monto), si está al día o cuántos días lleva de retraso, y las
// acciones disponibles (registrar pago, desactivar perfil si no ha pagado,
// ver historial).
function PremiumDoctorCard({
  doc, onOpenPayment, onToggleActive,
  expanded, onToggleExpand, onDeletePayment,
  amountDraft, onAmountChange, onAmountBlur,
  billingDayDraft, onBillingDayChange, onBillingDayBlur,
  onStartTrial, onEndTrial,
}) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 flex-wrap">
        {doc.profile_photo ? (
          <img src={doc.profile_photo} alt={doc.full_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-sm font-bold">
            {(doc.full_name || "D")[0]}
          </div>
        )}
        <div className="flex-1 min-w-[140px]">
          <p className="font-medium text-foreground truncate text-sm">{doc.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">{doc.specialty}</p>
        </div>
        {doc.isTrial ? (
          <span className="text-[11px] px-2 py-1 rounded-full font-semibold bg-brand-bluePale text-brand-navy flex items-center gap-1 flex-shrink-0">
            <Hourglass className="w-3 h-3" /> Prueba · {fmtTrialRemaining(doc.trialDaysLeft)}
          </span>
        ) : doc.isUpToDate ? (
          <span className="text-[11px] px-2 py-1 rounded-full font-semibold bg-green-100 text-green-700 flex items-center gap-1 flex-shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Al día
          </span>
        ) : (
          <span className="text-[11px] px-2 py-1 rounded-full font-semibold bg-red-100 text-red-700 flex items-center gap-1 flex-shrink-0">
            <AlertTriangle className="w-3 h-3" /> {doc.daysLate} día{doc.daysLate !== 1 ? "s" : ""} de retraso
          </span>
        )}
      </div>

      <div className="px-4 pb-3 flex items-center gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Cobro día</span>
          <Input
            type="number"
            min="1"
            max="28"
            value={billingDayDraft ?? doc.billingDay}
            onChange={onBillingDayChange}
            onBlur={onBillingDayBlur}
            className="rounded-lg h-7 w-14 px-1.5 text-xs text-center"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Monto</span>
          <span className="text-muted-foreground">$</span>
          <Input
            type="number"
            min="0"
            value={amountDraft ?? doc.rate}
            onChange={onAmountChange}
            onBlur={onAmountBlur}
            className="rounded-lg h-7 w-20 px-1.5 text-xs"
          />
        </div>
        <span className="text-muted-foreground">
          {doc.isTrial ? `Prueba termina: ${fmtDate(doc.trialEndsAt)}` : `Último pago: ${fmtDate(doc.lastPayment)}`}
        </span>
      </div>

      <div className="px-4 pb-4 flex items-center gap-1.5 flex-wrap">
        <Button size="sm" variant="outline" className="rounded-lg h-8 gap-1.5" onClick={onOpenPayment}>
          <Plus className="w-3.5 h-3.5" /> Pago
        </Button>
        {doc.isTrial ? (
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg h-8 gap-1.5 text-brand-navy border-brand-blue/30 hover:bg-brand-bluePale"
            onClick={onEndTrial}
          >
            <Hourglass className="w-3.5 h-3.5" /> Terminar prueba
          </Button>
        ) : (
          <>
            {!doc.isUpToDate && (
              <Button
                size="sm"
                variant="outline"
                className={`rounded-lg h-8 gap-1.5 ${
                  doc.active
                    ? "text-destructive border-destructive/30 hover:bg-destructive/5"
                    : "text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                }`}
                onClick={onToggleActive}
              >
                {doc.active ? (
                  <><Ban className="w-3.5 h-3.5" /> Desactivar perfil</>
                ) : (
                  <><Power className="w-3.5 h-3.5" /> Reactivar perfil</>
                )}
              </Button>
            )}
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onStartTrial(Number(e.target.value));
                  e.target.value = "";
                }
              }}
              className="h-8 text-xs rounded-lg border border-input bg-background px-2 text-muted-foreground"
            >
              <option value="">Poner en prueba…</option>
              <option value="1">1 mes</option>
              <option value="3">3 meses</option>
              <option value="12">12 meses</option>
            </select>
          </>
        )}
        <button
          type="button"
          aria-label="Ver pagos"
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground ml-auto"
          onClick={onToggleExpand}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 bg-muted/30">
          {doc.payments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">Sin pagos registrados todavía.</p>
          ) : (
            <div className="space-y-1.5 pt-2">
              {doc.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm bg-card rounded-lg px-3 py-2 border border-border/40">
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{fmtMoney(p.amount)}</span>
                    <span className="text-muted-foreground"> · {fmtDate(p.payment_date)} · {METHOD_LABELS[p.method] || p.method}</span>
                    {p.period_label && <span className="text-muted-foreground"> · {p.period_label}</span>}
                    {p.notes && <p className="text-xs text-muted-foreground truncate">{p.notes}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label="Eliminar pago"
                    className="p-1.5 rounded-lg hover:bg-destructive/10 flex-shrink-0"
                    onClick={() => onDeletePayment(p.id, doc)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Panel de negocio del plan Premium: como el cobro es manual (transferencia,
// efectivo, etc., no hay pasarela de pagos conectada), aquí el dueño marca
// quién está Premium, cuánto y qué día del mes le toca pagar, y registra
// cada pago que recibe. La app calcula sola quién está al día y quién va
// retrasado (y cuántos días), usando el día de cobro de cada doctor.
export default function AdminPremium() {
  const { confirm, dialogProps } = useConfirmDialog();
  const [specialists, setSpecialists] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [amountDrafts, setAmountDrafts] = useState({});
  const [billingDayDrafts, setBillingDayDrafts] = useState({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_PAYMENT);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [specs, pays, premiumStatuses] = await Promise.all([
      base44.entities.Specialist.list(),
      base44.entities.PremiumPayment.list("-payment_date", 1000),
      loadPremiumStatuses(),
    ]);
    // Los doctores en la papelera dejan de contar para Premium: ya no se
    // les cobra ni aparecen como retrasados.
    setSpecialists(mergePremiumStatus(specs.filter((s) => !s.deleted_at), premiumStatuses));
    setPayments(pays);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const premiumDoctors = useMemo(() => specialists.filter((s) => s.plan_slug === "premium"), [specialists]);

  // Ingresos y último pago por doctor, calculados a partir de TODOS los
  // pagos registrados (aunque el doctor ya no sea Premium hoy, su historial
  // de ingresos sigue contando para el negocio).
  const revenueByDoctor = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      if (!p.specialist_id) return;
      if (!map[p.specialist_id]) map[p.specialist_id] = { total: 0, last: null, list: [] };
      map[p.specialist_id].total += p.amount || 0;
      map[p.specialist_id].list.push(p);
      if (!map[p.specialist_id].last || (p.payment_date && p.payment_date > map[p.specialist_id].last)) {
        map[p.specialist_id].last = p.payment_date;
      }
    });
    Object.values(map).forEach((v) => v.list.sort((a, b) => (b.payment_date || "").localeCompare(a.payment_date || "")));
    return map;
  }, [payments]);

  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => startOfMonth(now), [now]);
  const monthEnd = useMemo(() => endOfMonth(now), [now]);
  const currentMonthLabel = useMemo(() => capitalize(format(now, "MMMM yyyy", { locale: es })), [now]);

  // Ciclo de cobro por doctor: cada uno tiene un "día de cobro" (día del mes,
  // 1-28 para que exista en todos los meses). La fecha de corte del ciclo
  // actual es la ocurrencia más reciente de ese día que ya pasó (o es hoy).
  // Si el último pago registrado es posterior a esa fecha de corte, está al
  // día; si no, lleva retraso, y se cuentan los días desde el corte.
  const premiumRows = useMemo(
    () =>
      premiumDoctors
        .map((doc) => {
          const rate = doc.monthly_amount || DEFAULT_RATE;
          const billingDay = Math.min(28, Math.max(1, doc.billing_day || (
            doc.premium_activated_at ? new Date(doc.premium_activated_at).getDate() : DEFAULT_BILLING_DAY
          )));
          let dueDate = new Date(now.getFullYear(), now.getMonth(), billingDay);
          if (dueDate > now) {
            dueDate = new Date(now.getFullYear(), now.getMonth() - 1, billingDay);
          }
          const lastPayment = revenueByDoctor[doc.id]?.last || null;
          // `lastPayment` es "YYYY-MM-DD" (columna `date`, sin hora). Comparar
          // como texto contra la fecha de corte (también reducida a
          // "YYYY-MM-DD" desde sus propios getFullYear/getMonth/getDate, no
          // re-parseada) evita el mismo desfase de zona horaria que `fmtDate`:
          // `new Date("YYYY-MM-DD") >= dueDate` fallaba en México porque el
          // string se interpreta como medianoche UTC, 6 horas antes de la
          // medianoche local de `dueDate`.
          const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
          const isUpToDate = !!(lastPayment && lastPayment >= dueDateStr);
          const daysLate = isUpToDate ? 0 : Math.max(0, differenceInCalendarDays(now, dueDate));

          // Modo prueba: mientras dure, el doctor no cuenta en las métricas de
          // ventas ni aparece como retrasado, aunque no haya pagado todavía.
          const trialEndsAt = doc.trial_ends_at || null;
          const isTrial = !!(trialEndsAt && new Date(trialEndsAt) >= now);
          const trialDaysLeft = isTrial ? Math.max(0, differenceInCalendarDays(new Date(trialEndsAt), now)) : 0;

          return {
            ...doc,
            rate,
            billingDay,
            dueDate,
            totalRevenue: revenueByDoctor[doc.id]?.total || 0,
            lastPayment,
            payments: revenueByDoctor[doc.id]?.list || [],
            isUpToDate,
            daysLate,
            trialEndsAt,
            isTrial,
            trialDaysLeft,
          };
        })
        .sort((a, b) => b.daysLate - a.daysLate || b.totalRevenue - a.totalRevenue),
    [premiumDoctors, revenueByDoctor, now]
  );

  const trialDoctors = useMemo(() => premiumRows.filter((d) => d.isTrial), [premiumRows]);
  const onTimeDoctors = useMemo(() => premiumRows.filter((d) => !d.isTrial && d.isUpToDate), [premiumRows]);
  const lateDoctors = useMemo(() => premiumRows.filter((d) => !d.isTrial && !d.isUpToDate), [premiumRows]);

  const totalRevenue = useMemo(() => payments.reduce((sum, p) => sum + (p.amount || 0), 0), [payments]);
  const revenueThisMonth = useMemo(
    () =>
      payments
        .filter((p) => p.payment_date && isWithinInterval(parseISO(p.payment_date), { start: monthStart, end: monthEnd }))
        .reduce((sum, p) => sum + (p.amount || 0), 0),
    [payments, monthStart, monthEnd]
  );
  // Cuánto debería entrar este mes según el monto de cada doctor Premium.
  // Los que están en modo prueba no suman aquí: todavía no les toca pagar.
  const expectedThisMonth = useMemo(
    () => premiumRows.filter((d) => !d.isTrial).reduce((sum, d) => sum + d.rate, 0),
    [premiumRows]
  );

  // Ingresos por mes, últimos 6 meses (histórico, se recalcula solo).
  const chartData = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    return months.map((month) => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const total = payments
        .filter((p) => p.payment_date && isWithinInterval(parseISO(p.payment_date), { start: mStart, end: mEnd }))
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      return { label: format(month, "MMM yy", { locale: es }), Ingresos: total };
    });
  }, [payments, now]);

  const handleAmountBlur = async (doc) => {
    const raw = amountDrafts[doc.id];
    if (raw === undefined) return;
    const value = Number(raw);
    setAmountDrafts((prev) => { const next = { ...prev }; delete next[doc.id]; return next; });
    if (!value || value <= 0 || value === doc.rate) return;
    const prevAmount = doc.monthly_amount;
    setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, monthly_amount: value } : d)));
    try {
      const statusId = await savePremiumStatus(doc, { monthly_amount: value });
      setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, _premiumStatusId: statusId } : d)));
      toast.success(`Monto mensual de ${doc.full_name} actualizado a ${fmtMoney(value)}`);
      logActivity({
        type: "monto_actualizado",
        description: `Monto mensual de ${doc.full_name} actualizado a ${fmtMoney(value)}`,
        specialistId: doc.id,
        specialistName: doc.full_name,
      });
    } catch (e) {
      setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, monthly_amount: prevAmount } : d)));
      toast.error("No se pudo actualizar el monto: " + e.message);
    }
  };

  const handleBillingDayBlur = async (doc) => {
    const raw = billingDayDrafts[doc.id];
    if (raw === undefined) return;
    const value = Math.min(28, Math.max(1, Number(raw) || doc.billingDay));
    setBillingDayDrafts((prev) => { const next = { ...prev }; delete next[doc.id]; return next; });
    if (!value || value === doc.billingDay) return;
    const prevValue = doc.billing_day;
    setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, billing_day: value } : d)));
    try {
      const statusId = await savePremiumStatus(doc, { billing_day: value });
      setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, _premiumStatusId: statusId } : d)));
      toast.success(`Día de cobro de ${doc.full_name} actualizado al día ${value}`);
      logActivity({
        type: "dia_cobro_actualizado",
        description: `Día de cobro de ${doc.full_name} actualizado al día ${value}`,
        specialistId: doc.id,
        specialistName: doc.full_name,
      });
    } catch (e) {
      setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, billing_day: prevValue } : d)));
      toast.error("No se pudo actualizar el día de cobro: " + e.message);
    }
  };

  // Pone a un doctor Premium en modo prueba por N meses: mientras dure, no
  // cuenta en "Esperado" ni puede aparecer como retrasado.
  const startTrial = async (doc, months) => {
    const end = new Date();
    end.setMonth(end.getMonth() + months);
    const iso = end.toISOString();
    const prevValue = doc.trial_ends_at || null;
    setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, trial_ends_at: iso } : d)));
    try {
      const statusId = await savePremiumStatus(doc, { trial_ends_at: iso });
      setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, _premiumStatusId: statusId } : d)));
      toast.success(`${doc.full_name} en prueba hasta el ${fmtDate(iso)}`);
      logActivity({
        type: "prueba_iniciada",
        description: `${doc.full_name} entró en modo prueba hasta el ${fmtDate(iso)}`,
        specialistId: doc.id,
        specialistName: doc.full_name,
      });
    } catch (e) {
      setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, trial_ends_at: prevValue } : d)));
      toast.error("No se pudo activar la prueba: " + e.message);
    }
  };

  const endTrial = async (doc) => {
    const prevValue = doc.trial_ends_at || null;
    setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, trial_ends_at: null } : d)));
    try {
      const statusId = await savePremiumStatus(doc, { trial_ends_at: null });
      setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, _premiumStatusId: statusId } : d)));
      toast.success(`Prueba de ${doc.full_name} terminada`);
      logActivity({
        type: "prueba_terminada",
        description: `Se terminó manualmente la prueba de ${doc.full_name}`,
        specialistId: doc.id,
        specialistName: doc.full_name,
      });
    } catch (e) {
      setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, trial_ends_at: prevValue } : d)));
      toast.error("No se pudo terminar la prueba: " + e.message);
    }
  };

  const toggleActive = async (doc) => {
    const next = !doc.active;
    if (!next) {
      const ok = await confirm({
        title: `¿Desactivar el perfil de ${doc.full_name}?`,
        description: "Mientras no ha pagado, dejará de verse en el directorio hasta que lo reactives.",
        confirmLabel: "Desactivar",
      });
      if (!ok) return;
    }
    setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, active: next } : d)));
    try {
      await base44.entities.Specialist.update(doc.id, { active: next });
      toast.success(next ? `${doc.full_name} reactivado` : `${doc.full_name} desactivado`);
      logActivity({
        type: next ? "perfil_activado" : "perfil_desactivado",
        description: next ? `Se reactivó el perfil de ${doc.full_name}` : `Se desactivó el perfil de ${doc.full_name} por falta de pago`,
        specialistId: doc.id,
        specialistName: doc.full_name,
      });
    } catch (e) {
      setSpecialists((prev) => prev.map((d) => (d.id === doc.id ? { ...d, active: !next } : d)));
      toast.error("No se pudo actualizar: " + e.message);
    }
  };

  const openPaymentDialog = (doc) => {
    if (doc) {
      setForm({
        ...EMPTY_PAYMENT,
        specialist_id: doc.id,
        amount: String(doc.rate),
        period_label: currentMonthLabel,
      });
    } else {
      setForm({ ...EMPTY_PAYMENT, specialist_id: premiumRows[0]?.id || "" });
    }
    setDialogOpen(true);
  };

  const handleSavePayment = async () => {
    if (!form.specialist_id) { toast.error("Elige un doctor"); return; }
    const amountNum = Number(form.amount);
    if (!amountNum || amountNum <= 0) { toast.error("El monto debe ser mayor a 0"); return; }
    if (!form.payment_date) { toast.error("La fecha es obligatoria"); return; }
    setSaving(true);
    try {
      const paidDoc = premiumRows.find((d) => d.id === form.specialist_id);
      await base44.entities.PremiumPayment.create({
        specialist_id: form.specialist_id,
        owner_user_id: paidDoc?.owner_user_id || null,
        amount: amountNum,
        payment_date: form.payment_date,
        period_label: form.period_label.trim(),
        method: form.method,
        notes: form.notes.trim(),
      });
      toast.success("Pago registrado");
      logActivity({
        type: "pago_registrado",
        description: `Se registró un pago de ${fmtMoney(amountNum)} de ${paidDoc?.full_name || "un doctor"}`,
        specialistId: form.specialist_id,
        specialistName: paidDoc?.full_name || "",
      });
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setSaving(false);
  };

  const handleDeletePayment = async (id, doc) => {
    const ok = await confirm({ title: "¿Eliminar este pago del historial?", confirmLabel: "Eliminar" });
    if (!ok) return;
    try {
      await base44.entities.PremiumPayment.delete(id);
      toast.success("Pago eliminado");
      logActivity({
        type: "pago_eliminado",
        description: `Se eliminó un pago del historial de ${doc?.full_name || "un doctor"}`,
        specialistId: doc?.id || "",
        specialistName: doc?.full_name || "",
      });
      load();
    } catch (e) {
      toast.error("Error: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Crown className="w-6 h-6 text-purple-500" fill="currentColor" />
          <h1 className="font-heading font-bold text-2xl text-foreground">Premium</h1>
        </div>
        <Button className="rounded-xl gap-2" onClick={() => openPaymentDialog(null)} disabled={premiumRows.length === 0}>
          <Plus className="w-4 h-4" /> Registrar pago
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Cobro manual: tú recibes el pago (transferencia, efectivo, etc.) y lo registras aquí. Cada doctor tiene su
        propio día de cobro del mes; la app calcula sola quién está al día y quién va retrasado, y cuántos días.
        También puedes ponerlo en modo prueba por un tiempo: mientras dure, no cuenta en las ventas ni aparece como
        retrasado.
      </p>

      {/* KPIs del ciclo mensual */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <KpiCard label="Doctores Premium" value={premiumDoctors.length} tone="navy" />
        <KpiCard label="En prueba" value={trialDoctors.length} tone="blue" />
        <KpiCard label={`Esperado ${currentMonthLabel}`} value={fmtMoney(expectedThisMonth)} tone="navy" />
        <KpiCard label={`Cobrado ${currentMonthLabel}`} value={fmtMoney(revenueThisMonth)} tone="blue" />
        <AlertKpiCard label="Retrasados" value={lateDoctors.length} active={lateDoctors.length > 0} />
        <KpiCard label="Ingresos totales" value={fmtMoney(totalRevenue)} tone="navy" />
      </div>

      {/* Gráfica de ingresos por mes */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6">
        <h2 className="font-heading font-semibold text-sm text-foreground mb-4">Ingresos cobrados por mes (últimos 6 meses)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value) => fmtMoney(value)}
              contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(var(--border))" }}
            />
            <Bar dataKey="Ingresos" fill="#a855f7" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Doctores Premium: en prueba, al día y retrasados, en tres columnas */}
      {premiumRows.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 text-center py-16 text-muted-foreground px-5">
          <Crown className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Todavía no hay doctores en plan Premium.</p>
          <p className="text-xs mt-1">Márcalos como Premium desde la pestaña Doctores.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-brand-blue flex-shrink-0" />
              <h2 className="font-heading font-semibold text-sm text-foreground">En prueba ({trialDoctors.length})</h2>
            </div>
            <div className="space-y-3">
              {trialDoctors.length === 0 ? (
                <div className="bg-card border border-border/50 rounded-2xl p-6 text-center text-sm text-muted-foreground">
                  Ningún doctor en prueba ahora mismo.
                </div>
              ) : (
                trialDoctors.map((doc) => (
                  <PremiumDoctorCard
                    key={doc.id}
                    doc={doc}
                    onOpenPayment={() => openPaymentDialog(doc)}
                    onToggleActive={() => toggleActive(doc)}
                    onStartTrial={(days) => startTrial(doc, days)}
                    onEndTrial={() => endTrial(doc)}
                    expanded={expandedId === doc.id}
                    onToggleExpand={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                    onDeletePayment={handleDeletePayment}
                    amountDraft={amountDrafts[doc.id]}
                    onAmountChange={(e) => setAmountDrafts((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                    onAmountBlur={() => handleAmountBlur(doc)}
                    billingDayDraft={billingDayDrafts[doc.id]}
                    onBillingDayChange={(e) => setBillingDayDrafts((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                    onBillingDayBlur={() => handleBillingDayBlur(doc)}
                  />
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <h2 className="font-heading font-semibold text-sm text-foreground">Al día con su pago ({onTimeDoctors.length})</h2>
            </div>
            <div className="space-y-3">
              {onTimeDoctors.length === 0 ? (
                <div className="bg-card border border-border/50 rounded-2xl p-6 text-center text-sm text-muted-foreground">
                  Ningún doctor está al día todavía.
                </div>
              ) : (
                onTimeDoctors.map((doc) => (
                  <PremiumDoctorCard
                    key={doc.id}
                    doc={doc}
                    onOpenPayment={() => openPaymentDialog(doc)}
                    onToggleActive={() => toggleActive(doc)}
                    onStartTrial={(days) => startTrial(doc, days)}
                    onEndTrial={() => endTrial(doc)}
                    expanded={expandedId === doc.id}
                    onToggleExpand={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                    onDeletePayment={handleDeletePayment}
                    amountDraft={amountDrafts[doc.id]}
                    onAmountChange={(e) => setAmountDrafts((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                    onAmountBlur={() => handleAmountBlur(doc)}
                    billingDayDraft={billingDayDrafts[doc.id]}
                    onBillingDayChange={(e) => setBillingDayDrafts((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                    onBillingDayBlur={() => handleBillingDayBlur(doc)}
                  />
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <h2 className="font-heading font-semibold text-sm text-foreground">Retrasados en su pago ({lateDoctors.length})</h2>
            </div>
            <div className="space-y-3">
              {lateDoctors.length === 0 ? (
                <div className="bg-card border border-border/50 rounded-2xl p-6 text-center text-sm text-muted-foreground">
                  Nadie está retrasado.
                </div>
              ) : (
                lateDoctors.map((doc) => (
                  <PremiumDoctorCard
                    key={doc.id}
                    doc={doc}
                    onOpenPayment={() => openPaymentDialog(doc)}
                    onToggleActive={() => toggleActive(doc)}
                    onStartTrial={(days) => startTrial(doc, days)}
                    onEndTrial={() => endTrial(doc)}
                    expanded={expandedId === doc.id}
                    onToggleExpand={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                    onDeletePayment={handleDeletePayment}
                    amountDraft={amountDrafts[doc.id]}
                    onAmountChange={(e) => setAmountDrafts((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                    onAmountBlur={() => handleAmountBlur(doc)}
                    billingDayDraft={billingDayDrafts[doc.id]}
                    onBillingDayChange={(e) => setBillingDayDrafts((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                    onBillingDayBlur={() => handleBillingDayBlur(doc)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Registrar pago Premium</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Doctor *</label>
              <select
                value={form.specialist_id}
                onChange={(e) => {
                  const doc = premiumRows.find((d) => d.id === e.target.value);
                  setForm((prev) => ({ ...prev, specialist_id: e.target.value, amount: doc ? String(doc.rate) : prev.amount }));
                }}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecciona un doctor</option>
                {premiumRows.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Monto (MXN) *</label>
                <Input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Fecha *</label>
                <Input
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Método</label>
              <select
                value={form.method}
                onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value }))}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {Object.entries(METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Periodo cubierto</label>
              <Input
                value={form.period_label}
                onChange={(e) => setForm((prev) => ({ ...prev, period_label: e.target.value }))}
                placeholder="Ej: Agosto 2026"
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notas</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Opcional"
                className="rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSavePayment} disabled={saving} className="rounded-xl">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                Registrar pago
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
