import { base44 } from "@/api/base44Client";

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
  const created = await base44.entities.PremiumStatus.create({ specialist_id: doc.id, ...patch });
  return created.id;
}
