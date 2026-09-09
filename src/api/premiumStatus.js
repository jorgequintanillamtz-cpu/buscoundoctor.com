import { base44 } from "@/api/base44Client";
import { differenceInCalendarDays } from "date-fns";

const DEFAULT_RATE = 1999;
const DEFAULT_BILLING_DAY = 1;

// Los datos de Premium (plan, fecha de activación, monto, día de cobro,
// prueba) viven en la entidad PremiumStatus, separada de Specialist, a
// propósito: los campos que se le agregan después a una entidad ya
// existente son los que la plataforma ha borrado solos varias veces. Esta
// entidad nació ya con estos campos, así que no debería sufrir lo mismo.

export async function loadPremiumStatuses() {
  return base44.entities.PremiumStatus.list();
}

// Junta cada doctor con su registro de PremiumStatus (si existe). Si un
// doctor no tiene registro todavía (nunca ha sido Premium), se le asignan
// valores por defecto para que el resto del código no tenga que
// preocuparse por el caso "todavía no existe". Guarda el id del registro
// de PremiumStatus en _premiumStatusId para saber si hay que crear o
// actualizar al guardar cambios.
export function mergePremiumStatus(specialists, statuses) {
  const byId = {};
  statuses.forEach((s) => { byId[s.specialist_id] = s; });
  return specialists.map((doc) => {
    const st = byId[doc.id];
    return {
      ...doc,
      plan_slug: st?.plan_slug || "gratis",
      premium_activated_at: st?.premium_activated_at || null,
      monthly_amount: st?.monthly_amount || null,
      billing_day: st?.billing_day || null,
      trial_ends_at: st?.trial_ends_at || null,
      _premiumStatusId: st?.id || null,
    };
  });
}

// Crea o actualiza el registro de PremiumStatus de un doctor. Si todavía no
// existe (primera vez que se toca algo de Premium para ese doctor), lo
// crea. Devuelve el id del registro (nuevo o existente) para poder
// guardarlo en el estado local.
export async function savePremiumStatus(doc, patch) {
  if (doc._premiumStatusId) {
    await base44.entities.PremiumStatus.update(doc._premiumStatusId, patch);
    return doc._premiumStatusId;
  }
  const created = await base44.entities.PremiumStatus.create({
    specialist_id: doc.id,
    owner_user_id: doc.owner_user_id || null,
    ...patch,
  });
  return created.id;
}

// Mismo cálculo de ciclo de cobro que usa AdminPremium.jsx (día de cobro
// del mes, corte más reciente, días de retraso). Se duplica aquí a
// propósito, como función pura y chiquita, para que la Bandeja de entrada
// pueda mostrar el conteo de retrasados sin depender de la forma interna
// (mucho más grande) de la página de Premium.
export function computeLateDoctors(specialists, payments, now = new Date()) {
  const lastPaymentByDoctor = {};
  payments.forEach((p) => {
    if (!p.specialist_id) return;
    if (!lastPaymentByDoctor[p.specialist_id] || (p.payment_date && p.payment_date > lastPaymentByDoctor[p.specialist_id])) {
      lastPaymentByDoctor[p.specialist_id] = p.payment_date;
    }
  });

  return specialists
    .filter((doc) => doc.plan_slug === "premium")
    .map((doc) => {
      const isTrial = !!(doc.trial_ends_at && new Date(doc.trial_ends_at) >= now);
      const billingDay = Math.min(28, Math.max(1, doc.billing_day || (
        doc.premium_activated_at ? new Date(doc.premium_activated_at).getDate() : DEFAULT_BILLING_DAY
      )));
      let dueDate = new Date(now.getFullYear(), now.getMonth(), billingDay);
      if (dueDate > now) {
        dueDate = new Date(now.getFullYear(), now.getMonth() - 1, billingDay);
      }
      const lastPayment = lastPaymentByDoctor[doc.id] || null;
      // `lastPayment` es "YYYY-MM-DD" (columna `date`, sin hora); comparar
      // como texto contra la fecha de corte reducida al mismo formato evita
      // el desfase de zona horaria de `new Date("YYYY-MM-DD") >= dueDate`
      // (el string se interpreta como medianoche UTC, no medianoche local —
      // en México eso corría la fecha de corte un día, marcando pagos del
      // mismo día como atrasados). Mismo fix que en AdminPremium.jsx.
      const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
      const isUpToDate = !!(lastPayment && lastPayment >= dueDateStr);
      const daysLate = isUpToDate ? 0 : Math.max(0, differenceInCalendarDays(now, dueDate));
      return { ...doc, rate: doc.monthly_amount || DEFAULT_RATE, isTrial, isUpToDate, daysLate };
    })
    .filter((doc) => !doc.isTrial && !doc.isUpToDate)
    .sort((a, b) => b.daysLate - a.daysLate);
}
