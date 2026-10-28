import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { logActivity } from "@/api/activityLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import LoadingLogo from "@/components/LoadingLogo";
import LoadError from "@/components/LoadError";
import { recommendationTagLabel } from "@/lib/recommendationTags";
import { REPORT_REASONS } from "@/components/ReportRecommendationDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  HeartHandshake, Search, CheckCircle2, XCircle, ChevronRight, ExternalLink, ShieldCheck, GitMerge, UserPlus, Quote,
} from "lucide-react";

// Cola de revisión de las recomendaciones de pacientes (CLAUDE.md §8r). Ninguna recomendación ni
// doctor propuesto se muestra al público hasta que el equipo la aprueba aquí. Todo lo que cambia
// pasa por funciones de la base de datos que revisan que quien las llama sea admin.
// Diseño (2026-10-27, pedido de Jorge: "me pierdo, viene mucha información"): la lista solo muestra una fila corta por doctor
// (nombre, especialidad, cuántas recomendaciones y si falta algo) y todo lo demás vive en una ventana de detalle con 3 pestañas:
// Recomendaciones · Datos (con la cédula) · Perfil (con las visitas).
const SEP_URL = "https://www.gob.mx/cedulaprofesional";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const STATUS_STYLE = {
  pending: { label: "Por revisar", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "Aprobada", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rechazada", cls: "bg-red-50 text-red-700" },
};
function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

// Bloque con título dentro de la ventana de detalle (definido aquí y no dentro del componente, para que no se
// recree en cada tecla y el campo de notas no pierda el cursor).
function Section({ title, icon, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wide">{icon}{title}</p>
      {children}
    </div>
  );
}

const TABS = [
  { key: "pending", label: "Por revisar" },
  { key: "approved", label: "Aprobados" },
  { key: "rejected", label: "Rechazados" },
  { key: "all", label: "Todos" },
  { key: "reports", label: "Reportes" },
];

export default function AdminRecomendaciones() {
  const navigate = useNavigate();
  const { confirm, dialogProps } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [recs, setRecs] = useState([]);
  const [specialists, setSpecialists] = useState([]);
  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null); // key del doctor cuya ventana de detalle está abierta
  const [detailTab, setDetailTab] = useState("recs");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null); // { ok, text }
  const [notes, setNotes] = useState({});
  const [mergeTarget, setMergeTarget] = useState({});
  const [reports, setReports] = useState([]); // reportes de visitantes sobre comentarios o páginas
  const [viewStats, setViewStats] = useState({}); // vistas e impresiones por propuesta
  const [catalog, setCatalog] = useState({ specialties: [], subspecialties: [] }); // para el menú de subespecialidad de cada doctor
  const [interest, setInterest] = useState({}); // pacientes que pidieron aviso por propuesta: { id: { count, contacts[] } }
  const [commentsPublic, setCommentsPublic] = useState(null); // interruptor: ¿se muestran los comentarios al público?

  const load = async () => {
    setLoadError(false);
    try {
      const [s, r, sp] = await Promise.all([
        base44.entities.DoctorSuggestion.list("-created_at", 1000),
        base44.entities.DoctorRecommendation.list("-created_at", 3000),
        base44.entities.Specialist.list(),
      ]);
      setSuggestions(s); setRecs(r); setSpecialists(sp.filter((x) => !x.deleted_at));
      try { setReports(await base44.entities.RecommendationReport.list("-created_at", 500)); } catch { setReports([]); }
      try { const { data } = await base44.functions.invoke("adminRecommendedViewStats"); setViewStats(data && typeof data === "object" ? data : {}); } catch { setViewStats({}); }
      try { const { data } = await base44.functions.invoke("adminRecommendedInterest"); setInterest(data && typeof data === "object" ? data : {}); } catch { setInterest({}); }
      try { const [sp, ss] = await Promise.all([base44.entities.Specialty.filter({ active: true }), base44.entities.Subspecialty.filter({ active: true })]); setCatalog({ specialties: sp, subspecialties: ss }); } catch { setCatalog({ specialties: [], subspecialties: [] }); }
      try { const { data } = await base44.functions.invoke("adminGetRecommendationSettings"); setCommentsPublic(!!data?.comments_public); } catch { setCommentsPublic(null); }
    } catch (e) {
      console.error("No se pudieron cargar las recomendaciones", e);
      setLoadError(true);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Un "grupo" = un doctor con todas sus recomendaciones: una propuesta de paciente, o un doctor del
  // directorio (o su perfil privado ya creado) que recibió recomendaciones.
  const groups = useMemo(() => {
    const specById = new Map(specialists.map((s) => [s.id, s]));
    const out = [];
    const linked = new Set();
    suggestions.filter((s) => s.status !== "merged").forEach((s) => {
      if (s.specialist_id) linked.add(s.specialist_id);
      out.push({
        key: `s-${s.id}`, kind: "suggestion", suggestion: s, specialist: s.specialist_id ? specById.get(s.specialist_id) : null,
        name: s.full_name, specialty: s.specialty, zone: s.zone, hospital: s.hospital_text, license: s.license_number,
        status: s.status, recs: recs.filter((r) => r.suggestion_id === s.id || (s.specialist_id && r.specialist_id === s.specialist_id)),
      });
    });
    const bySpec = new Map();
    recs.filter((r) => r.specialist_id && !linked.has(r.specialist_id)).forEach((r) => {
      if (!bySpec.has(r.specialist_id)) bySpec.set(r.specialist_id, []);
      bySpec.get(r.specialist_id).push(r);
    });
    bySpec.forEach((list, id) => {
      const sp = specById.get(id);
      out.push({
        key: `p-${id}`, kind: "specialist", suggestion: null, specialist: sp, name: sp?.full_name || "Doctor", specialty: sp?.specialty,
        zone: sp?.zone || sp?.location, hospital: null, license: sp?.professional_license_number,
        status: list.every((r) => r.status === "rejected") ? "rejected" : "approved", recs: list,
      });
    });
    return out.map((g) => ({ ...g, pendingIds: g.recs.filter((r) => r.status === "pending").map((r) => r.id), pendingCommentIds: g.recs.filter((r) => r.comment_status === "pending").map((r) => r.id) }));
  }, [suggestions, recs, specialists]);

  const needsReview = (g) => g.status !== "rejected" && (g.status === "pending" || g.pendingIds.length > 0 || g.pendingCommentIds.length > 0);
  const matchTab = (key, g) => {
    if (key === "reports") return false;
    if (key === "pending") return needsReview(g);
    if (key === "approved") return g.status === "approved" && g.pendingIds.length === 0 && g.pendingCommentIds.length === 0;
    if (key === "rejected") return g.status === "rejected";
    return true;
  };
  const tabCounts = useMemo(() => Object.fromEntries(["pending", "approved", "rejected", "all"].map((k) => [k, groups.filter((g) => matchTab(k, g)).length])), [groups]);
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return groups
      .filter((g) => matchTab(tab, g))
      .filter((g) => !term || `${g.name} ${g.specialty || ""} ${g.license || ""}`.toLowerCase().includes(term))
      .sort((a, b) => b.recs.length - a.recs.length);
  }, [groups, tab, q]);

  const openReports = reports.filter((r) => r.status === "open");
  const doneReports = reports.filter((r) => r.status !== "open");
  const reasonLabel = (v) => REPORT_REASONS.find((x) => x.v === v)?.label || v;
  const reviewReport = (rep, action, okText) => run(`rep-${rep.id}`, () => invoke("adminReviewReport", { id: rep.id, action }), okText);

  const run = async (key, fn, okText) => {
    setBusy(key); setNotice(null);
    try {
      const res = await fn();
      if (res && res.ok === false) {
        const reasons = {
          subespecialidad_invalida: "Esa subespecialidad no corresponde a la especialidad del doctor.",
          ya_tiene_perfil: "Este doctor ya tiene un perfil privado creado.",
          ya_juntada: "Esta propuesta ya fue juntada con otra.",
          cedula_duplicada: "Ya existe un doctor con esa cédula. Júntala con ese doctor en vez de crear otro perfil.",
          no_disponible: "Esta propuesta ya no está disponible.",
        };
        setNotice({ ok: false, text: reasons[res.reason] || "No se pudo completar la acción." });
      } else {
        setNotice({ ok: true, text: okText });
      }
      await load();
      return res;
    } catch (e) {
      console.error(e);
      setNotice({ ok: false, text: e?.message || "No se pudo completar la acción." });
    } finally {
      setBusy("");
    }
    return null;
  };

  const invoke = async (name, payload) => (await base44.functions.invoke(name, payload)).data;

  // "Aprobar todo": el doctor, sus recomendaciones pendientes y, desde 2026-10-26 (pedido de Jorge),
  // también sus comentarios pendientes. Si hay comentarios, se pide confirmación porque se vuelven públicos
  // (cuando el interruptor de comentarios está encendido).
  const approveGroup = async (g) => {
    const commentIds = g.recs.filter((r) => r.comment_status === "pending" && r.status !== "rejected").map((r) => r.id);
    const nComments = commentIds.length;
    if (nComments > 0) {
      const ok = await confirm({
        title: `¿Aprobar todo de ${g.name}?`,
        description: `Se aprueban el doctor, sus recomendaciones pendientes y ${nComments === 1 ? "1 comentario" : `${nComments} comentarios`} (los comentarios se verán en su página pública si el interruptor de comentarios está encendido).`,
        confirmLabel: "Aprobar todo",
      });
      if (!ok) return;
    }
    run(g.key, async () => {
      let res = { ok: true };
      if (g.kind === "suggestion") res = await invoke("adminReviewSuggestion", { id: g.suggestion.id, action: "approve" });
      else if (g.pendingIds.length > 0) res = await invoke("adminReviewRecommendation", { ids: g.pendingIds, status: "approved" });
      if (res && res.ok === false) return res;
      for (const id of commentIds) {
        await invoke("adminReviewRecommendationComment", { id, status: "approved" });
      }
      logActivity({ type: "recomendacion_aprobada", description: `Se aprobó a ${g.name}, sus recomendaciones${nComments ? " y comentarios" : ""}`, specialistId: g.specialist?.id, specialistName: g.name });
      return res;
    }, `Aprobado: ${g.name}`);
  };

  const rejectGroup = async (g) => {
    const ok = await confirm({
      title: `¿Rechazar a ${g.name}?`,
      description: g.kind === "suggestion"
        ? "Se rechazan el doctor propuesto y sus recomendaciones pendientes. Si alguien lo vuelve a proponer, no se guardará."
        : "Se rechazan sus recomendaciones pendientes.",
      confirmLabel: "Rechazar",
    });
    if (!ok) return;
    run(g.key, async () => {
      const res = g.kind === "suggestion"
        ? await invoke("adminReviewSuggestion", { id: g.suggestion.id, action: "reject" })
        : await invoke("adminReviewRecommendation", { ids: g.pendingIds, status: "rejected" });
      logActivity({ type: "recomendacion_rechazada", description: `Se rechazó a ${g.name}`, specialistId: g.specialist?.id, specialistName: g.name });
      return res;
    }, `Rechazado: ${g.name}`);
  };

  // Subespecialidades que se pueden elegir para una especialidad (por nombre).
  const subOptionsFor = (specialtyName) => {
    const id = catalog.specialties.find((x) => x.name === specialtyName)?.id;
    return id ? catalog.subspecialties.filter((x) => x.parent_specialty_id === id).sort((a, b) => a.name.localeCompare(b.name, "es")) : [];
  };
  const setSubspecialty = (g, value) => run(`sub-${g.suggestion.id}`, async () => {
    const res = await invoke("adminSetSuggestionSubspecialty", { id: g.suggestion.id, subspecialty: value || null });
    if (res?.ok) logActivity({ type: "recomendacion_subespecialidad", description: `Se puso la subespecialidad de ${g.name}: ${value || "ninguna"}`, specialistId: g.specialist?.id, specialistName: g.name });
    return res;
  }, "Subespecialidad guardada");

  const reviewOne = (g, r, status) => run(`r-${r.id}`, () => invoke("adminReviewRecommendation", { ids: [r.id], status }), status === "approved" ? "Recomendación aprobada" : "Recomendación rechazada");

  const reviewComment = (r, status) => run(`c-${r.id}`, () => invoke("adminReviewRecommendationComment", { id: r.id, status }), status === "approved" ? "Comentario aprobado" : "Comentario rechazado");

  const toggleCommentsPublic = async () => {
    const turnOn = !commentsPublic;
    const ok = await confirm({
      title: turnOn ? "¿Mostrar los comentarios al público?" : "¿Ocultar los comentarios?",
      description: turnOn
        ? "Los comentarios que ya aprobaste empezarán a verse en la página pública de cada doctor. Hazlo solo cuando el abogado haya revisado los términos y la política de contenido."
        : "Los comentarios dejarán de verse en las páginas públicas. Las recomendaciones y las etiquetas no cambian.",
      confirmLabel: turnOn ? "Mostrar" : "Ocultar",
    });
    if (!ok) return;
    run("flag", async () => { const res = await invoke("adminSetCommentsPublic", { value: turnOn }); setCommentsPublic(turnOn); return res; }, turnOn ? "Comentarios visibles al público" : "Comentarios ocultos");
  };

  const toggleLicense = (g) => run(g.key, () => invoke("adminReviewSuggestion", { id: g.suggestion.id, action: g.suggestion.license_checked_at ? "license_unchecked" : "license_checked" }),
    g.suggestion.license_checked_at ? "Se quitó la marca de cédula comprobada" : "Cédula marcada como comprobada");

  const saveNotes = (g) => run(g.key, () => invoke("adminReviewSuggestion", { id: g.suggestion.id, action: "notes", notes: notes[g.key] ?? g.suggestion.admin_notes ?? "" }), "Notas guardadas");

  const merge = async (g) => {
    const target = mergeTarget[g.key];
    if (!target) return;
    const [kind, id] = target.split(":");
    const targetName = kind === "s" ? suggestions.find((s) => s.id === id)?.full_name : specialists.find((s) => s.id === id)?.full_name;
    const ok = await confirm({
      title: `¿Juntar con ${targetName}?`,
      description: `Las recomendaciones de "${g.name}" pasan a "${targetName}" y esta propuesta desaparece de la lista. Quien ya había recomendado al otro doctor no cuenta dos veces.`,
      confirmLabel: "Juntar",
    });
    if (!ok) return;
    run(g.key, async () => {
      const res = await invoke("adminMergeSuggestion", { source: g.suggestion.id, target_suggestion: kind === "s" ? id : null, target_specialist: kind === "p" ? id : null });
      logActivity({ type: "recomendacion_juntada", description: `Se juntó "${g.name}" con "${targetName}"`, specialistName: targetName });
      return res;
    }, `Juntado con ${targetName}`);
  };

  const createProfile = async (g) => {
    const ok = await confirm({
      title: `¿Crear el perfil privado de ${g.name}?`,
      description: "Se crea un perfil en borrador (no se publica ni se ve en el sitio) para poder generarle un enlace con el que el doctor lo reclame. Sus recomendaciones pasan a ese perfil.",
      confirmLabel: "Crear perfil",
    });
    if (!ok) return;
    const res = await run(g.key, async () => {
      const r = await invoke("adminCreateSpecialistFromSuggestion", { suggestion: g.suggestion.id });
      if (r?.ok) logActivity({ type: "perfil_creado_desde_recomendacion", description: `Se creó el perfil privado de ${g.name} a partir de recomendaciones`, specialistId: r.specialist_id, specialistName: g.name });
      return r;
    }, `Perfil privado creado: ${g.name}`);
    if (res?.ok && res.specialist_id) navigate(`/admin/doctores/editar/${res.specialist_id}`);
  };

  const mergeOptions = (g) => [
    ...suggestions.filter((s) => s.id !== g.suggestion?.id && !["merged", "rejected"].includes(s.status)).map((s) => ({ value: `s:${s.id}`, label: `${s.full_name} (propuesta)` })),
    ...specialists.filter((s) => s.publication_status === "published").map((s) => ({ value: `p:${s.id}`, label: `${s.full_name} (en el directorio)` })),
  ];

  if (loading) return <div className="flex justify-center py-24"><LoadingLogo /></div>;
  if (loadError) return <LoadError onRetry={() => { setLoading(true); load(); }} />;

  const approvedOf = (g) => g.recs.filter((r) => r.status === "approved").length;
  // ¿Dónde se ve este doctor? A la lista pública entra con 1+ recomendación aprobada (la cédula ya no se exige, 2026-10-27);
  // para salir en Google siguen haciendo falta 3 recomendaciones aprobadas y la cédula marcada como comprobada.
  const visibilityOf = (g) => {
    if (g.kind !== "suggestion" || g.status !== "approved" || !g.suggestion?.slug) return null;
    const n = approvedOf(g);
    const checked = !!g.suggestion.license_checked_at;
    if (n < 1) return { tone: "bg-muted text-muted-foreground", short: "Solo con el enlace", long: "Solo con el enlace: falta al menos 1 recomendación aprobada para salir en la lista." };
    if (n >= 3 && checked) return { tone: "bg-emerald-50 text-emerald-700", short: "Sale en la lista y en Google", long: "Aparece en la lista /recomendados y en Google." };
    const falta = [n < 3 ? `${3 - n} ${3 - n === 1 ? "recomendación aprobada más" : "recomendaciones aprobadas más"}` : null, !checked ? "marcar la cédula como comprobada" : null].filter(Boolean).join(" y ");
    return { tone: "bg-emerald-50 text-emerald-700", short: "Sale en la lista", long: `Aparece en la lista /recomendados. Para salir también en Google falta: ${falta}.` };
  };
  const phoneFmt = (t) => t.replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2 $3");
  const copy = (text, okText, failText) => navigator.clipboard?.writeText(text).then(() => setNotice({ ok: true, text: okText })).catch(() => setNotice({ ok: false, text: failText }));
  const selected = detail ? groups.find((g) => g.key === detail) : null;
  const openDetail = (g, startTab = "recs") => { setNotice(null); setDetailTab(startTab); setDetail(g.key); };
  const noticeBox = notice && (
    <p role="status" className={`text-sm rounded-xl px-4 py-2.5 ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{notice.text}</p>
  );

  // ---- Contenido de la ventana de detalle ----
  const renderDetail = (g) => {
    const s = g.suggestion;
    const hasProfile = !!(g.specialist && (s?.specialist_id || g.kind === "specialist"));
    const canAct = g.status !== "rejected";
    const vis = visibilityOf(g);
    const st = s ? viewStats[s.id] || {} : {};
    const tagCounts = {};
    g.recs.forEach((r) => (r.tags || []).forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const tabs = g.kind === "suggestion" && canAct
      ? [["recs", `Recomendaciones (${g.recs.length})`], ["data", "Datos"], ["profile", "Perfil"]]
      : [["recs", `Recomendaciones (${g.recs.length})`]];
    const tab2 = tabs.some(([k]) => k === detailTab) ? detailTab : "recs";
    const sorted = [...g.recs].sort((a, b) => (a.status === "pending" ? -1 : 0) - (b.status === "pending" ? -1 : 0) || new Date(b.created_at) - new Date(a.created_at));
    return (
      <>
        <div className="px-5 pt-5 pr-12 pb-3 border-b border-border/60">
          <DialogHeader className="space-y-0">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="font-heading font-semibold text-lg text-foreground">{g.name}</DialogTitle>
              <StatusPill status={g.status === "pending" || g.pendingIds.length > 0 ? "pending" : g.status} />
            </div>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">{[g.specialty, s?.subspecialty, g.zone].filter(Boolean).join(" · ") || "—"}</p>
          {g.recs.length > 1 && topTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {topTags.map(([t, n]) => <span key={t} className="text-xs bg-brand-bluePale text-brand-navy px-2.5 py-1 rounded-full">{recommendationTagLabel(t)} · {n}</span>)}
            </div>
          )}
          <div className="flex gap-2 flex-wrap mt-3">
            {canAct && (g.status === "pending" || g.pendingIds.length > 0 || g.pendingCommentIds.length > 0) && (
              <Button size="sm" disabled={busy === g.key} onClick={() => approveGroup(g)} className="rounded-xl gap-1.5 bg-brand-augusta hover:bg-brand-augusta/90 text-white">
                <CheckCircle2 className="w-4 h-4" /> Aprobar todo
              </Button>
            )}
            {canAct && (
              <Button size="sm" variant="outline" disabled={busy === g.key} onClick={() => rejectGroup(g)} className="rounded-xl gap-1.5 text-red-700 border-red-200 hover:bg-red-50">
                <XCircle className="w-4 h-4" /> Rechazar
              </Button>
            )}
            {g.status === "rejected" && g.kind === "suggestion" && (
              <Button size="sm" variant="outline" disabled={busy === g.key} onClick={() => run(g.key, () => invoke("adminReviewSuggestion", { id: s.id, action: "reopen" }), "Propuesta reabierta")} className="rounded-xl">Reabrir</Button>
            )}
            {g.kind === "specialist" && g.specialist && (
              <Button asChild size="sm" variant="outline" className="rounded-xl"><Link to={`/admin/doctores/editar/${g.specialist.id}`}>Abrir su perfil</Link></Button>
            )}
          </div>
          {tabs.length > 1 && (
            <div className="flex gap-1 mt-4 -mb-3 overflow-x-auto" role="tablist">
              {tabs.map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={tab2 === k} onClick={() => setDetailTab(k)}
                  className={`px-2 sm:px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab2 === k ? "border-brand-navy text-brand-navy" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 space-y-5">
          {noticeBox}

          {tab2 === "recs" && (
            <ul className="space-y-2.5">
              {sorted.map((r) => (
                <li key={r.id} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusPill status={r.status} />
                      <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {r.status !== "approved" && <Button size="sm" variant="outline" disabled={busy === `r-${r.id}`} onClick={() => reviewOne(g, r, "approved")} className="rounded-lg h-8 text-xs">Aprobar</Button>}
                      {r.status !== "rejected" && <Button size="sm" variant="outline" disabled={busy === `r-${r.id}`} onClick={() => reviewOne(g, r, "rejected")} className="rounded-lg h-8 text-xs text-red-700">Rechazar</Button>}
                    </div>
                  </div>
                  {(r.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">{r.tags.map((t) => <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{recommendationTagLabel(t)}</span>)}</div>
                  )}
                  {r.display_name && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                      Mostrará el nombre: <span className="font-medium text-foreground">{r.display_name}</span>
                      <button type="button" disabled={busy === `n-${r.id}`} onClick={() => run(`n-${r.id}`, () => invoke("adminClearRecommendationName", { id: r.id }), "Nombre quitado")} className="text-red-700 hover:underline">Quitar nombre</button>
                    </p>
                  )}
                  {r.public_comment && (
                    <div className="mt-2 rounded-lg bg-brand-bluePale/60 p-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-brand-navy flex items-center gap-1.5">
                          Comentario público
                          <span className={`font-medium px-2 py-0.5 rounded-full ${r.comment_status === "approved" ? "bg-emerald-100 text-emerald-700" : r.comment_status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {r.comment_status === "approved" ? "aprobado" : r.comment_status === "rejected" ? "rechazado" : "por revisar"}
                          </span>
                        </p>
                        <div className="flex gap-1.5">
                          {r.comment_status !== "approved" && <Button size="sm" variant="outline" disabled={busy === `c-${r.id}`} onClick={() => reviewComment(r, "approved")} className="rounded-lg h-7 text-xs">Aprobar comentario</Button>}
                          {r.comment_status !== "rejected" && <Button size="sm" variant="outline" disabled={busy === `c-${r.id}`} onClick={() => reviewComment(r, "rejected")} className="rounded-lg h-7 text-xs text-red-700">Rechazar</Button>}
                        </div>
                      </div>
                      <p className="text-sm text-foreground mt-1.5 break-words">“{r.public_comment}”</p>
                      {r.status !== "approved" && <p className="text-[11px] text-muted-foreground mt-1">Solo se publica si la recomendación también está aprobada.</p>}
                    </div>
                  )}
                  {r.private_message && (
                    <p className="text-sm text-foreground mt-2 flex gap-2"><Quote className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" /> <span className="break-words"><span className="text-xs text-muted-foreground">Mensaje privado: </span>{r.private_message}</span></p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {tab2 === "data" && s && (
            <>
              <Section title="Datos">
                <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  <dt className="text-muted-foreground">Especialidad</dt><dd className="text-foreground">{g.specialty || "—"}</dd>
                  {subOptionsFor(s.specialty).length > 0 && (
                    <>
                      <dt className="text-muted-foreground self-center">Subespecialidad</dt>
                      <dd>
                        <select id={`sub-${s.id}`} aria-label="Subespecialidad" value={s.subspecialty || ""} onChange={(e) => setSubspecialty(g, e.target.value)} disabled={busy === `sub-${s.id}`}
                          className="h-9 px-2 rounded-lg border border-input bg-background text-sm max-w-full">
                          <option value="">Ninguna / no sé</option>
                          {subOptionsFor(s.specialty).map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}
                        </select>
                      </dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Zona</dt><dd className="text-foreground">{g.zone || "—"}</dd>
                  <dt className="text-muted-foreground">Hospital</dt><dd className="text-foreground">{g.hospital || "—"}</dd>
                  <dt className="text-muted-foreground">Cédula</dt><dd className="text-foreground">{g.license || "No la dieron los pacientes"}</dd>
                </dl>
              </Section>

              <Section title="Cédula" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={SEP_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue inline-flex items-center gap-1 hover:underline">
                    Consultar en la SEP <ExternalLink className="w-3 h-3" />
                  </a>
                  <Button size="sm" variant={s.license_checked_at ? "secondary" : "outline"} disabled={busy === g.key} onClick={() => toggleLicense(g)} className="rounded-xl h-8 text-xs">
                    {s.license_checked_at ? `Comprobada el ${fmtDate(s.license_checked_at)} (quitar)` : "Marcar cédula comprobada"}
                  </Button>
                </div>
                {!g.license && <p className="text-xs text-muted-foreground mt-1.5">Los pacientes no dieron cédula: búscalo por nombre en la SEP.</p>}
              </Section>

              <Section title="Notas del equipo (privadas)">
                <Textarea rows={3} value={notes[g.key] ?? s.admin_notes ?? ""} onChange={(e) => setNotes({ ...notes, [g.key]: e.target.value })} className="rounded-xl text-sm resize-none" maxLength={1000} />
                <Button size="sm" variant="outline" disabled={busy === g.key} onClick={() => saveNotes(g)} className="rounded-xl h-8 text-xs mt-1.5">Guardar notas</Button>
              </Section>
            </>
          )}

          {tab2 === "profile" && s && (
            <>
              <Section title="Página pública">
                {s.slug && g.status === "approved" ? (
                  <>
                    <div className="flex items-center gap-3 flex-wrap text-sm">
                      <a href={`/recomendado/${s.slug}`} target="_blank" rel="noopener noreferrer" className="text-brand-blue inline-flex items-center gap-1 hover:underline">Ver página pública <ExternalLink className="w-3 h-3" /></a>
                      <button type="button" className="text-brand-blue hover:underline" onClick={() => copy(`https://buscoundoctor.com/recomendado/${s.slug}`, "Enlace copiado", "No se pudo copiar el enlace")}>Copiar enlace</button>
                    </div>
                    {vis && <p className={`text-xs mt-2 rounded-lg px-3 py-2 ${vis.tone}`}>{vis.long}</p>}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Todavía no tiene página pública: aparece cuando apruebes al doctor.</p>
                )}
              </Section>

              <Section title="Visitas">
                <div className="grid grid-cols-2 gap-2 text-center">
                  {[["Vistas de su página", st.views_30, st.views_total], ["Apariciones en listas", st.imp_30, st.imp_total]].map(([label, d30, total]) => (
                    <div key={label} className="rounded-xl bg-muted/50 px-2 py-2.5">
                      <p className="font-heading font-bold text-xl text-foreground">{d30 || 0}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{label}<br />en 30 días · {total || 0} en total</p>
                    </div>
                  ))}
                </div>
              </Section>

              {(s.contact_phone || interest[s.id]?.count > 0) && (
                <Section title="Contacto">
                  {s.contact_phone && (
                    <p className="text-sm flex items-center gap-x-3 gap-y-1 flex-wrap">
                      <span className="text-muted-foreground">Teléfono para citas (lo dio un paciente; no se muestra al público):</span>
                      <span className="font-medium text-foreground">{phoneFmt(s.contact_phone)}</span>
                      <button type="button" className="text-brand-blue hover:underline text-xs" onClick={() => copy(s.contact_phone, "Teléfono copiado", "No se pudo copiar el teléfono")}>Copiar</button>
                      <a href={`https://wa.me/52${s.contact_phone}`} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline text-xs inline-flex items-center gap-1">WhatsApp <ExternalLink className="w-3 h-3" /></a>
                    </p>
                  )}
                  {interest[s.id]?.count > 0 && (
                    <details className="text-sm mt-2">
                      <summary className="cursor-pointer text-brand-blue hover:underline">
                        {interest[s.id].count} {interest[s.id].count === 1 ? "paciente pidió" : "pacientes pidieron"} que les avisen cuando pueda agendar
                      </summary>
                      <ul className="mt-1.5 space-y-0.5 text-muted-foreground text-xs">
                        {interest[s.id].contacts.map((c, i) => (
                          <li key={i}>
                            <span className="font-medium text-foreground">{c.kind === "whatsapp" ? phoneFmt(c.contact) : c.contact}</span>
                            {" · "}{c.kind === "whatsapp" ? "WhatsApp" : "correo"}{" · "}{new Date(c.at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </Section>
              )}

              <Section title="Perfil privado y enlace de reclamo" icon={<UserPlus className="w-3.5 h-3.5" />}>
                {hasProfile ? (
                  <Button asChild size="sm" className="rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white">
                    <Link to={`/admin/doctores/editar/${g.specialist.id}`}>Abrir su perfil y generar el enlace</Link>
                  </Button>
                ) : (
                  <>
                    <Button size="sm" disabled={busy === g.key} onClick={() => createProfile(g)} className="rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white">Crear perfil privado y enlace</Button>
                    <p className="text-xs text-muted-foreground mt-1.5">Crea un borrador que no se ve en el sitio; ahí generas el enlace para mandárselo al doctor.</p>
                  </>
                )}
              </Section>

              {!hasProfile && (
                <details>
                  <summary className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-1.5 w-fit"><GitMerge className="w-3.5 h-3.5" /> ¿Es el mismo doctor que otro?</summary>
                  <div className="flex gap-2 mt-2">
                    <select value={mergeTarget[g.key] || ""} onChange={(e) => setMergeTarget({ ...mergeTarget, [g.key]: e.target.value })} className="flex-1 min-w-0 h-9 px-2 rounded-xl border border-input bg-background text-sm">
                      <option value="">Elige el doctor con el que se junta</option>
                      {mergeOptions(g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <Button size="sm" variant="outline" disabled={!mergeTarget[g.key] || busy === g.key} onClick={() => merge(g)} className="rounded-xl h-9">Juntar</Button>
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </>
    );
  };

  const TABS_WITH_COUNT = TABS.map((t) => ({ ...t, count: t.key === "reports" ? openReports.length : tabCounts[t.key] }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2"><HeartHandshake className="w-6 h-6 text-brand-blue" /> Recomendaciones de pacientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lo que los pacientes recomiendan desde <Link to="/recomendaciones" target="_blank" className="underline">/recomendaciones</Link>. Nada se ve en el sitio hasta que lo apruebas.
          </p>
        </div>
        {commentsPublic !== null && (
          <div className="flex items-center gap-2 text-sm rounded-xl border border-border/60 bg-card px-3 py-2"
            title={commentsPublic ? "Los comentarios aprobados se ven en la página pública de cada doctor." : "Aunque apruebes comentarios, no se muestran al público hasta que los hagas visibles. Conviene esperar la revisión del abogado."}>
            <span className="text-muted-foreground">Comentarios públicos:</span>
            <span className={`font-semibold ${commentsPublic ? "text-emerald-700" : "text-foreground"}`}>{commentsPublic ? "visibles" : "ocultos"}</span>
            <Button size="sm" variant="outline" disabled={busy === "flag"} onClick={toggleCommentsPublic} className="rounded-lg h-8 text-xs">
              {commentsPublic ? "Ocultar" : "Hacer visibles"}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto" role="tablist">
          {TABS_WITH_COUNT.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? "bg-brand-navy text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1.5 text-xs font-semibold rounded-full px-1.5 py-0.5 ${tab === t.key ? "bg-white/20 text-white" : (t.key === "pending" || t.key === "reports") ? "bg-amber-100 text-amber-800" : "bg-background text-muted-foreground"}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar doctor o cédula" className="h-10 rounded-xl pl-9" />
        </div>
      </div>

      {!selected && notice && <div className="mt-4">{noticeBox}</div>}

      <div className="mt-5 space-y-4">
        {tab === "reports" && (
          <>
            {reports.length === 0 && (
              <div className="text-center py-16 bg-card rounded-2xl border border-border/50"><p className="text-muted-foreground">No hay reportes.</p></div>
            )}
            {[["Por revisar", openReports], ["Ya revisados", doneReports]].map(([title, list]) => list.length > 0 && (
              <div key={title}>
                <h2 className="text-sm font-heading font-semibold text-foreground mb-2">{title} ({list.length})</h2>
                <div className="space-y-3">
                  {list.map((rep) => {
                    const sug = suggestions.find((x) => x.id === rep.suggestion_id);
                    const repSpec = rep.specialist_id ? specialists.find((x) => x.id === rep.specialist_id) : null; // reporte hecho en el perfil de un doctor registrado
                    const rc = rep.recommendation_id ? recs.find((x) => x.id === rep.recommendation_id) : null;
                    const busyRep = busy === `rep-${rep.id}`;
                    return (
                      <div key={rep.id} className="bg-card rounded-2xl border border-border/50 p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-heading font-semibold text-foreground">{sug?.full_name || repSpec?.full_name || "Doctor"}</p>
                          <span className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground">{rep.kind === "comment" ? "Reporte de un comentario" : rep.kind === "recommendation" ? "Reporte de una recomendación" : "Reporte de la página"}</span>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${rep.reason === "soy_el_doctor" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{reasonLabel(rep.reason)}</span>
                          {rep.status !== "open" && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{rep.status === "dismissed" ? "Descartado" : rep.status === "actioned" ? "Contenido retirado" : "Atendido"}</span>}
                          <span className="text-xs text-muted-foreground ml-auto">{fmtDate(rep.created_at)}</span>
                        </div>
                        {rc && (rc.tags || []).length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{rc.tags.map((t) => <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{recommendationTagLabel(t)}</span>)}</div>}
                        {rc?.public_comment && <p className="text-sm text-foreground mt-2 flex gap-2"><Quote className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" /> <span className="break-words">{rc.public_comment}</span></p>}
                        {rep.details && <p className="text-sm text-muted-foreground mt-2 break-words"><span className="font-medium text-foreground">Detalles:</span> {rep.details}</p>}
                        {rep.reporter_email && <p className="text-sm text-muted-foreground mt-1">Quien reporta: <a href={`mailto:${rep.reporter_email}`} className="text-brand-blue hover:underline">{rep.reporter_email}</a></p>}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {(sug?.slug || repSpec?.slug) && <Button asChild size="sm" variant="outline" className="rounded-lg h-8 text-xs"><a href={sug?.slug ? `/recomendado/${sug.slug}` : `/especialista/${repSpec.slug}`} target="_blank" rel="noopener noreferrer">Ver página <ExternalLink className="w-3 h-3 ml-1" /></a></Button>}
                          {rep.status === "open" ? (
                            <>
                              {rc?.public_comment && rep.recommendation_id && <Button size="sm" variant="outline" disabled={busyRep} onClick={() => reviewReport(rep, "hide_comment", "Comentario retirado")} className="rounded-lg h-8 text-xs text-red-700">Retirar comentario</Button>}
                              {rep.recommendation_id && <Button size="sm" variant="outline" disabled={busyRep} onClick={() => reviewReport(rep, "reject_recommendation", "Recomendación retirada")} className="rounded-lg h-8 text-xs text-red-700">Retirar la recomendación</Button>}
                              <Button size="sm" variant="outline" disabled={busyRep} onClick={() => reviewReport(rep, "resolved", "Reporte atendido")} className="rounded-lg h-8 text-xs">Marcar atendido</Button>
                              <Button size="sm" variant="outline" disabled={busyRep} onClick={() => reviewReport(rep, "dismiss", "Reporte descartado")} className="rounded-lg h-8 text-xs">Descartar</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" disabled={busyRep} onClick={() => reviewReport(rep, "reopen", "Reporte reabierto")} className="rounded-lg h-8 text-xs">Reabrir</Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {tab !== "reports" && visible.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <p className="text-muted-foreground">{tab === "pending" ? "No hay nada por revisar." : "No hay doctores en esta lista."}</p>
          </div>
        )}

        {tab !== "reports" && visible.length > 0 && (
          <ul className="space-y-2.5">
            {visible.map((g) => {
              const vis = visibilityOf(g);
              const pendingRecs = g.pendingIds.length;
              const pendingComments = g.pendingCommentIds.length;
              const needs = g.status !== "rejected" && (g.status === "pending" || pendingRecs > 0 || pendingComments > 0);
              return (
                <li key={g.key} className="bg-card rounded-2xl border border-border/50 px-4 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <button type="button" onClick={() => openDetail(g)} className="min-w-0 flex-1 text-left group" aria-label={`Abrir ${g.name}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-semibold text-foreground group-hover:text-brand-blue transition-colors">{g.name}</span>
                      {g.status === "rejected" && <StatusPill status="rejected" />}
                      {g.kind === "specialist" && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">En el directorio</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {[g.specialty, g.zone].filter(Boolean).join(" · ") || "—"} · <span className="text-foreground font-medium">{g.recs.length}</span> {g.recs.length === 1 ? "recomendación" : "recomendaciones"}
                    </p>
                    {(needs || vis) && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        {(g.status === "pending" && pendingRecs === 0) && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">Doctor por aprobar</span>}
                        {pendingRecs > 0 && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">{pendingRecs} por revisar</span>}
                        {pendingComments > 0 && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">{pendingComments} {pendingComments === 1 ? "comentario" : "comentarios"} por revisar</span>}
                        {!needs && vis && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${vis.tone}`}>{vis.short}</span>}
                      </div>
                    )}
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {needs && g.status !== "rejected" && (
                      <Button size="sm" disabled={busy === g.key} onClick={() => approveGroup(g)} className="rounded-xl gap-1.5 bg-brand-augusta hover:bg-brand-augusta/90 text-white">
                        <CheckCircle2 className="w-4 h-4" /> Aprobar todo
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openDetail(g)} className="rounded-xl gap-1">
                      {needs ? "Revisar" : "Ver"} <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 grid-cols-[minmax(0,1fr)] w-[calc(100%-1.5rem)] sm:w-full top-[5vh] translate-y-0">
          {selected && renderDetail(selected)}
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
