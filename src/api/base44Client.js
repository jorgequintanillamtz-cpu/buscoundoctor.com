import { supabase } from '@/lib/supabaseClient';

// Compatibilidad con la forma del SDK de Base44 (`base44.entities.X.filter/get/...`,
// `base44.auth.*`, `base44.functions.invoke`, `base44.integrations.Core.*`) para no
// tener que tocar la sintaxis de cada uno de los ~240 archivos que lo usan. Esta
// capa traduce esas mismas llamadas a Supabase (Postgres + Auth + Storage + RPCs).

// ---------------------------------------------------------------------------
// Entidades: nombre de entidad (PascalCase, como en Base44) -> tabla real.
// DoctorStripeAccount y ProductSale (cobro real vía Stripe) siguen fuera de
// alcance a propósito y no están en este mapa: cualquier llamada a ellas
// lanza un error claro en vez de fallar de forma confusa. DoctorProduct SÍ
// se reactivó (2026-09) para el catálogo de guías digitales — el doctor
// administra su propio catálogo, pero comprar sigue sin existir.
// ---------------------------------------------------------------------------
const ENTITY_TABLE_MAP = {
  DoctorProduct: 'doctor_product',
  Guide: 'guide',
  Specialty: 'specialty',
  Zone: 'zone',
  Insurer: 'insurer',
  Language: 'language',
  Condition: 'condition',
  Subspecialty: 'subspecialty',
  ConditionRequest: 'condition_request',
  Specialist: 'specialist',
  Office: 'office',
  Hospital: 'hospital',
  OfficeHours: 'office_hours',
  SpecialistDocument: 'specialist_document',
  SpecialistEducation: 'specialist_education',
  SpecialistLanguage: 'specialist_language',
  SpecialistSeoChecklist: 'specialist_seo_checklist',
  Review: 'review',
  SpecialistQuestion: 'specialist_question',
  DoctorNotification: 'doctor_notification',
  AppointmentRequest: 'appointment_request',
  DoctorStorefront: 'doctor_storefront',
  StorefrontFAQ: 'storefront_faq',
  StorefrontLocation: 'storefront_location',
  StorefrontInsurance: 'storefront_insurance',
  StorefrontCondition: 'storefront_condition',
  StorefrontTimelineEntry: 'storefront_timeline_entry',
  ConsultSummary: 'consult_summary',
  ConsultReview: 'consult_review',
  DoctorConsultPreferences: 'doctor_consult_preferences',
  Plan: 'plan',
  PremiumStatus: 'premium_status',
  PremiumPayment: 'premium_payment',
  DoctorClick: 'doctor_click',
  DoctorContact: 'doctor_contact',
  DoctorImpression: 'doctor_impression',
  SpecialistCase: 'specialist_case',
  SpecialistPost: 'specialist_post',
  SpecialistHighlight: 'specialist_highlight',
  SpecialistService: 'specialist_service',
  SiteSettings: 'site_settings',
  ActivityLog: 'activity_log',
  EmailLog: 'email_log',
  NewsletterSubscriber: 'newsletter_subscriber',
  SpecialtyInterestSignup: 'specialty_interest_signup',
  BlogPost: 'blog_post',
  FaqPage: 'faq_page',
  FaqItem: 'faq_item',
};

const STRIPE_ENTITIES = new Set(['DoctorStripeAccount', 'ProductSale']);

// Columnas que se llaman distinto en el frontend que en la tabla real de
// Postgres (renombradas durante el diseño del esquema nuevo). Se traducen en
// ambas direcciones para que el código existente seed sin cambios.
const FIELD_RENAMES = {
  EmailLog: { to: 'to_email' },
};

// Entidades donde el INSERT público no puede pedir la fila de vuelta
// (`.select()`) porque Postgres re-checkea la policy de SELECT sobre la fila
// insertada -- y estas 5 no tienen SELECT público (solo admin, o solo
// aprobado/dueño, que una fila recién creada nunca cumple). Sin este ajuste,
// el INSERT en sí funciona pero el RETURNING lo tumba con un error de RLS
// que parece (pero no es) un rechazo del insert. Ver memoria de la migración
// para el mismo bug ya encontrado y corregido en v1.
const NO_RETURNING_ENTITIES = new Set(['AppointmentRequest', 'Review', 'DoctorClick', 'DoctorContact', 'DoctorImpression', 'SpecialtyInterestSignup', 'SpecialistQuestion', 'ActivityLog']);

function toDb(entityName, data) {
  const renames = FIELD_RENAMES[entityName];
  if (!renames || !data || typeof data !== 'object') return data;
  const out = { ...data };
  for (const [feField, dbField] of Object.entries(renames)) {
    if (feField in out) {
      out[dbField] = out[feField];
      delete out[feField];
    }
  }
  return out;
}

function fromDb(entityName, row) {
  const renames = FIELD_RENAMES[entityName];
  if (!renames || !row) return row;
  const out = { ...row };
  for (const [feField, dbField] of Object.entries(renames)) {
    if (dbField in out) {
      out[feField] = out[dbField];
      delete out[dbField];
    }
  }
  return out;
}

function fromDbList(entityName, rows) {
  if (!FIELD_RENAMES[entityName]) return rows;
  return (rows || []).map((r) => fromDb(entityName, r));
}

function applySort(query, sortStr) {
  if (!sortStr) return query;
  const desc = sortStr.startsWith('-');
  const field = desc ? sortStr.slice(1) : sortStr;
  return query.order(field, { ascending: !desc });
}

// Filtro simple de igualdad, como usa Base44 (`{campo: valor}`). El único
// caso especial real en todo el código es `updateMany`/`deleteMany` con
// `{ $ne: valor }`, manejado aparte en esos dos métodos.
function applyEqFilters(query, filterObj) {
  let q = query;
  for (const [key, value] of Object.entries(filterObj || {})) {
    q = q.eq(key, value);
  }
  return q;
}

// Columnas de `specialist` que un VISITANTE (sin sesión) puede leer. La base de datos solo le concede estas
// al rol `anon` (columnas privadas como email, owner_user_id, referral_code o suspension_reason no salen a
// la API pública), así que un visitante no puede pedir `select *`. Quien tiene sesión (doctor o admin) lee
// todo con `*`. Si agregas una columna pública a `specialist`, agrégala aquí Y concédesela a `anon` en
// Supabase (`grant select (columna) on public.specialist to anon`) o la página pública dejará de cargar.
export const SPECIALIST_PUBLIC_COLUMNS = [
  'id', 'full_name', 'slug', 'profile_photo', 'specialty_id', 'specialty', 'subspecialty',
  'subspecialties_relation', 'conditions_relation', 'description', 'years_experience', 'rating',
  'location', 'city', 'zone', 'address', 'address_street', 'address_neighborhood', 'address_ext_number',
  'address_int_number', 'address_floor', 'address_postal_code', 'whatsapp', 'instagram', 'modality',
  'schedule', 'services', 'insurers_relation', 'gallery', 'video_url', 'certifications', 'featured',
  'active', 'price_range', 'professional_license_number', 'license_verification_status',
  'license_verified_at', 'publication_status', 'completeness_score', 'seo_score', 'created_date',
  'updated_date', 'payment_methods', 'patient_types',
].join(',');

async function selectColumnsFor(entityName) {
  if (entityName !== 'Specialist') return '*';
  const { data } = await supabase.auth.getSession();
  return data?.session ? '*' : SPECIALIST_PUBLIC_COLUMNS;
}

function makeEntity(entityName) {
  if (STRIPE_ENTITIES.has(entityName)) {
    // Rechaza como promesa (no lanza sincrono) porque todo el código real
    // encadena `.catch(() => [])` sobre estas llamadas asumiendo un método
    // async normal -- lanzar sincrono rompe ese `.catch` antes de que se
    // pueda enganchar, y tumba páginas enteras que ni siquiera usan Stripe
    // de verdad (ej. el resto del editor de storefront).
    const stripeError = () => Promise.reject(new Error(
      `${entityName}: Stripe/pagos quedó fuera de alcance de esta migración a Supabase (sigue dormido en Base44).`
    ));
    return new Proxy({}, { get: () => stripeError });
  }

  // `User` no es una tabla propia -- vive en Supabase Auth (`auth.users`),
  // que no es accesible directo desde el navegador. Solo se soporta `.get(id)`,
  // el único método que el código real usa sobre esta "entidad" (para
  // resolver el correo del dueño de un perfil al mandar un aviso).
  if (entityName === 'User') {
    return {
      async get(id) {
        const { data, error } = await supabase.rpc('admin_get_user_email', { p_user_id: id });
        if (error) throw error;
        if (!data) throw new Error('Usuario no encontrado');
        return data;
      },
    };
  }

  const table = ENTITY_TABLE_MAP[entityName];
  if (!table) {
    throw new Error(`Entidad desconocida: ${entityName} (no tiene tabla asignada en base44Client.js)`);
  }

  return {
    // Este proyecto de Supabase tiene un límite de filas por request
    // (Dashboard > Settings > API > Max Rows, hoy en 1000) que un `.limit()`
    // del cliente NO evita -- PostgREST igual corta en ese tope. Detectado
    // con el banco de enfermedades real (1146 filas): un `.limit(2000)`
    // explícito seguía regresando solo 1000. Por eso, cuando se pide más de
    // `PAGE_SIZE`, se pagina con `.range()` hasta juntar todo lo pedido.
    async filter(filterObj = {}, sortStr, limitNum) {
      const PAGE_SIZE = 1000;
      const effectiveSort = sortStr || 'id';
      let rows = [];
      let from = 0;
      for (;;) {
        const pageEnd = limitNum ? Math.min(from + PAGE_SIZE, limitNum) : from + PAGE_SIZE;
        let q = supabase.from(table).select(await selectColumnsFor(entityName));
        q = applyEqFilters(q, filterObj);
        q = applySort(q, effectiveSort);
        q = q.range(from, pageEnd - 1);
        const { data, error } = await q;
        if (error) throw error;
        rows = rows.concat(data);
        if (data.length < pageEnd - from) break;
        if (limitNum && rows.length >= limitNum) break;
        from = pageEnd;
      }
      return fromDbList(entityName, rows);
    },

    async list(sortStr, limitNum) {
      return this.filter({}, sortStr, limitNum);
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select(await selectColumnsFor(entityName)).eq('id', id).single();
      if (error) throw error;
      return fromDb(entityName, data);
    },

    async create(payload) {
      if (NO_RETURNING_ENTITIES.has(entityName)) {
        const { error } = await supabase.from(table).insert(toDb(entityName, payload));
        if (error) throw error;
        return null;
      }
      const { data, error } = await supabase.from(table).insert(toDb(entityName, payload)).select().single();
      if (error) throw error;
      return fromDb(entityName, data);
    },

    async update(id, payload) {
      const { data, error } = await supabase.from(table).update(toDb(entityName, payload)).eq('id', id).select().single();
      if (error) throw error;
      return fromDb(entityName, data);
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    async bulkCreate(items) {
      const { data, error } = await supabase.from(table).insert(items.map((i) => toDb(entityName, i))).select();
      if (error) throw error;
      return fromDbList(entityName, data);
    },

    // Cada item es `{ id, ...camposAActualizar }` (no un par filtro+valores).
    async bulkUpdate(items) {
      return Promise.all(
        items.map(({ id, ...fields }) => this.update(id, fields))
      );
    },

    // Estilo Mongo, usado solo en OfficeManager.jsx: filterObj puede traer
    // `{ campo: valor }` o `{ campo: { $ne: valor } }`; updateOp siempre es
    // `{ $set: { ... } }`. `_id` es la convención Mongo para la llave
    // primaria -- se traduce a la columna real `id`.
    async updateMany(filterObj, updateOp) {
      let q = supabase.from(table).update(toDb(entityName, updateOp.$set || {}));
      for (const [rawKey, value] of Object.entries(filterObj || {})) {
        const key = rawKey === '_id' ? 'id' : rawKey;
        if (value && typeof value === 'object' && '$ne' in value) {
          q = q.neq(key, value.$ne);
        } else {
          q = q.eq(key, value);
        }
      }
      const { error } = await q;
      if (error) throw error;
      return true;
    },

    async deleteMany(filterObj) {
      let q = supabase.from(table).delete();
      for (const [rawKey, value] of Object.entries(filterObj || {})) {
        const key = rawKey === '_id' ? 'id' : rawKey;
        if (value && typeof value === 'object' && '$ne' in value) {
          q = q.neq(key, value.$ne);
        } else {
          q = q.eq(key, value);
        }
      }
      const { error } = await q;
      if (error) throw error;
      return true;
    },
  };
}

const entitiesProxy = new Proxy(
  {},
  {
    get(_target, entityName) {
      return makeEntity(entityName);
    },
  }
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
async function me() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error || new Error('No autenticado');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || '',
    role: profile?.role || 'doctor',
  };
}

function redirectToLogin(returnUrl) {
  const url = new URL('/iniciar-sesion', window.location.origin);
  if (returnUrl) url.searchParams.set('return_url', returnUrl);
  window.location.href = url.toString();
}

// scope 'local' (por defecto) solo cierra esta sesión/este dispositivo;
// 'global' cierra TODAS las sesiones del usuario en cualquier dispositivo.
// OJO: el valor por defecto de supabase-js es 'global' -- sin este parámetro,
// "Salir del panel" cerraba sesión en todos lados sin avisar. Se corrige aquí.
async function logout(returnUrl, scope = 'local') {
  await supabase.auth.signOut({ scope });
  if (returnUrl) window.location.href = returnUrl;
}

async function isAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

async function register({ email, password }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function verifyOtp({ email, otpCode }) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
  if (error) throw error;
  return data;
}

// Mismo mecanismo que verifyOtp, pero para el código de "recupera tu
// contraseña" (type: 'recovery') -- un código independiente del de
// registro, aunque comparten la misma idea: nada de enlaces de un solo uso,
// que los escáneres de seguridad de Gmail/Outlook "gastan" solos antes de
// que la persona le dé clic (ver requestPasswordReset).
async function verifyPasswordResetOtp({ email, otpCode }) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'recovery' });
  if (error) throw error;
  return data;
}

async function loginViaEmailPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// "google" | "microsoft" (Base44 solo tenía "google"; se agrega Microsoft
// como proveedor "azure", que es como lo nombra Supabase/Azure AD).
async function loginWithProvider(provider, returnUrl) {
  const providerMap = { google: 'google', microsoft: 'azure' };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: providerMap[provider] || provider,
    options: { redirectTo: returnUrl || window.location.href },
  });
  if (error) throw error;
  return data;
}

// Manda el correo de "recupera tu contraseña" con un código de 6 dígitos
// (igual que el registro) -- ver OlvideContrasena.jsx y
// verifyPasswordResetOtp para por qué es un código y no un enlace.
async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// Solo funciona justo después de verifyPasswordResetOtp, que deja una
// sesión temporal activa -- no sirve para que un usuario ya logueado
// cambie su contraseña desde otro lado del sitio.
async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// Nunca cambia el rol (profiles.role) desde aquí: hacerlo desde el navegador
// le permitía a un admin bajarse a "doctor" sin querer (le pasó a Jorge al
// registrarse como doctor con su cuenta de admin, 2026-10-02). Los roles solo
// los cambia un admin directo en la base de datos.
async function updateMe(fields) {
  // eslint-disable-next-line no-unused-vars
  const { role, ...safeFields } = fields || {};
  const { data, error } = await supabase.auth.updateUser({ data: safeFields });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Funciones de backend (antes `base44.functions.invoke(nombre, payload)`).
// Cada una se traduce a la RPC de Postgres equivalente (ver Fase 2 del plan
// de migración). Las funciones de Stripe quedan fuera de alcance.
// ---------------------------------------------------------------------------
const STRIPE_FUNCTIONS = new Set([
  'createProductCheckout',
  'createStripeConnectOnboarding',
  'downloadProductFile',
  'getProductPurchaseInfo',
  'getSaleDownloadLink',
  'stripeConnectWebhook',
]);

const FUNCTION_MAP = {
  saveRegistrationDraft: (payload) => supabase.rpc('save_registration_draft', { p_payload: payload }),
  getRegistrationDraft: ({ draft_id }) => supabase.rpc('get_registration_draft', { p_draft_id: draft_id }),
  createDoctorProfile: (payload) => supabase.rpc('create_doctor_profile', { p_payload: payload }),
  deleteDoctorProfile: ({ specialist_id }) => supabase.rpc('delete_doctor_profile', { p_specialist_id: specialist_id }),
  recalculateSpecialistScore: ({ specialist_id }) => supabase.rpc('recalculate_specialist_score', { p_specialist_id: specialist_id }),
  resubmitForReview: () => supabase.rpc('resubmit_for_review'),
  requestProfileDeletion: ({ reason } = {}) => supabase.rpc('request_profile_deletion', { p_reason: reason || null }),
  cancelProfileDeletion: () => supabase.rpc('cancel_profile_deletion_request'),
  startVacation: ({ return_date } = {}) => supabase.rpc('start_vacation', { p_return: return_date }),
  endVacation: () => supabase.rpc('end_vacation'),
  exportMyData: () => supabase.rpc('export_my_data'),
  inviteSpecialistAssistant: ({ email } = {}) => supabase.rpc('invite_specialist_assistant', { p_email: email }),
  removeSpecialistAssistant: () => supabase.rpc('remove_specialist_assistant'),
  replyToReview: ({ review_id, reply } = {}) => supabase.rpc('reply_to_review', { p_review_id: review_id, p_reply: reply }),
  answerSpecialistQuestion: ({ question_id, answer } = {}) => supabase.rpc('answer_specialist_question', { p_question_id: question_id, p_answer: answer }),
  listMyReferrals: () => supabase.rpc('list_my_referrals'),
  creditReferralReward: ({ specialist_id } = {}) => supabase.rpc('credit_referral_reward', { p_specialist_id: specialist_id }),
  unsubscribeRegistrationEmails: ({ draft_id } = {}) => supabase.rpc('unsubscribe_registration_emails', { p_draft_id: draft_id }),
  submitContactMessage: ({ name, email, message } = {}) => supabase.rpc('submit_contact_message', { p_name: name, p_email: email, p_message: message }),
  generateClaimLink: ({ specialist_id } = {}) => supabase.rpc('generate_claim_link', { p_specialist_id: specialist_id }),
  revokeClaimLink: ({ specialist_id } = {}) => supabase.rpc('revoke_claim_link', { p_specialist_id: specialist_id }),
  getClaimPreview: ({ token } = {}) => supabase.rpc('get_claim_preview', { p_token: token }),
  claimProfile: ({ token, cedula } = {}) => supabase.rpc('claim_profile', { p_token: token, p_cedula: cedula || null }),
  markNotificationsRead: ({ ids } = {}) => supabase.rpc('mark_doctor_notifications_read', { p_ids: ids && ids.length ? ids : null }),
  getPublicConsultSummary: ({ id }) => supabase.rpc('get_public_consult_summary', { p_id: id }),
  createConsultReview: ({ consult_summary_id, rating }) =>
    supabase.rpc('create_consult_review', { p_consult_summary_id: consult_summary_id, p_rating: rating }),
  // El código existente (StorefrontPublic, StorefrontProductDetail,
  // ConsultSummaryPublic -- ya escritos desde la época de Base44) llama a
  // esta función de dos formas: sin product_id espera { products: [...] },
  // con product_id espera { product: {...} } de uno solo. La RPC real solo
  // trae la lista completa (activos de ese doctor); acá se filtra el caso
  // de un producto individual en JS en vez de tener una segunda RPC, porque
  // el catálogo por doctor es chico.
  getPublicDoctorProducts: async ({ doctor_id, product_id }) => {
    const { data, error } = await supabase.rpc('get_public_doctor_products', { p_doctor_id: doctor_id });
    if (error) return { data: null, error };
    const products = data || [];
    if (product_id) {
      return { data: { product: products.find((p) => p.id === product_id) || null } };
    }
    return { data: { products } };
  },
};

async function invoke(name, payload) {
  if (STRIPE_FUNCTIONS.has(name)) {
    throw new Error(`${name}: Stripe/pagos quedó fuera de alcance de esta migración a Supabase.`);
  }
  const fn = FUNCTION_MAP[name];
  if (!fn) {
    throw new Error(`Función de backend desconocida: ${name} (no tiene RPC asignada en base44Client.js)`);
  }
  const { data, error } = await fn(payload);
  if (error) throw error;
  // Se envuelve en { data } porque algunos call sites leen `res.data`, otros
  // leen `res` directo -- ambos patrones funcionan con esta forma.
  return { data };
}

// ---------------------------------------------------------------------------
// Integraciones (subida de archivos, IA, correo)
// ---------------------------------------------------------------------------
async function uploadFile({ file, bucket, folder }) {
  const { uploadFile: doUpload } = await import('@/lib/storage');
  // Los sitios de subida que no dicen a qué bucket va (la mayoria: foto de
  // perfil, galeria, casos, posts, highlights, video) esperan el default
  // "specialist-photos"/"specialist-videos", cuya policy de RLS exige que la
  // carpeta sea el id del usuario dueno del archivo. Sin carpeta explicita,
  // el upload lo bloquea RLS para cualquiera que no sea admin. Los unicos
  // sitios que SI necesitan un bucket/carpeta distinto (documentos privados,
  // blog, imagenes del sitio) lo pasan explicito, así que este default nunca
  // los pisa.
  let effectiveFolder = folder;
  if (!effectiveFolder && (!bucket || bucket === 'specialist-photos' || bucket === 'specialist-videos')) {
    const { data: { user } } = await supabase.auth.getUser();
    let uid = user?.id || '';
    // Si quien sube el archivo es un asistente (no el dueño), la carpeta
    // debe seguir siendo la del médico dueño -- si no, la policy de RLS
    // (carpeta = dueño, ver can_write_specialist_media) la rechazaría, y el
    // archivo quedaría "huérfano" si algún día se le quita el acceso a esa
    // persona.
    const { data: asst } = await supabase.from('specialist_assistant').select('specialist_id').eq('user_id', uid).maybeSingle();
    if (asst?.specialist_id) {
      const { data: spec } = await supabase.from('specialist').select('owner_user_id').eq('id', asst.specialist_id).single();
      if (spec?.owner_user_id) uid = spec.owner_user_id;
    }
    effectiveFolder = uid;
  }
  return doUpload(file, bucket, effectiveFolder);
}

async function invokeLLM() {
  throw new Error(
    'La generación con IA todavía no está disponible: falta configurar la clave de Anthropic (pendiente, ver plan Fase 5).'
  );
}

// El HTML del correo ya se construye en el cliente (doctorNotify.js /
// emailTemplate.js, o Contact.jsx) reusando el mismo diseño de siempre —
// aquí solo se entrega. El destinatario NUNCA se manda desde el cliente: la
// función send_transactional_email lo resuelve ella misma a partir de
// specialistId (o usa el correo fijo del admin para "contacto_publico"),
// así esta ruta no se puede usar para mandar correo a una dirección
// arbitraria. La llave de Resend vive solo en el servidor (Vault de
// Supabase), nunca llega al navegador.
async function sendEmail({ type, specialistId, subject, body }) {
  const { data, error } = await supabase.rpc('send_transactional_email', {
    p_type: type,
    p_subject: subject,
    p_html: body,
    p_specialist_id: specialistId || null,
  });
  if (error) throw error;
  if (!data?.success) {
    throw new Error(data?.reason === 'rate_limited' ? 'Límite de envíos alcanzado' : (data?.reason || 'No se pudo enviar el correo'));
  }
  return data;
}

export const base44 = {
  entities: entitiesProxy,
  auth: {
    me,
    redirectToLogin,
    logout,
    isAuthenticated,
    register,
    verifyOtp,
    loginViaEmailPassword,
    loginWithProvider,
    updateMe,
    requestPasswordReset,
    verifyPasswordResetOtp,
    updatePassword,
  },
  functions: { invoke },
  integrations: {
    Core: {
      UploadFile: uploadFile,
      InvokeLLM: invokeLLM,
      SendEmail: sendEmail,
    },
  },
};
