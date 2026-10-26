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
import {
  HeartHandshake, Search, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink, ShieldCheck, GitMerge, UserPlus, Quote,
} from "lucide-react";

// Cola de revisión de las recomendaciones de pacientes (CLAUDE.md §8r). Ninguna recomendación ni
// doctor propuesto se muestra al público hasta que el equipo la aprueba aquí. Todo lo que cambia
// pasa por funciones de la base de datos que revisan que quien las llama sea admin.
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

const TABS = [
  { key: "pending", label: "Por revisar" },
  { key: "approved", label: "Aprobados" },
  { key: "rejected", label: "Rechazados" },
  { key: "all", label: "Todos" },
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
  const [open, setOpen] = useState({});
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null); // { ok, text }
  const [notes, setNotes] = useState({});
  const [mergeTarget, setMergeTarget] = useState({});
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
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return groups
      .filter((g) => {
        if (tab === "pending") return needsReview(g);
        if (tab === "approved") return g.status === "approved" && g.pendingIds.length === 0 && g.pendingCommentIds.length === 0;
        if (tab === "rejected") return g.status === "rejected";
        return true;
      })
      .filter((g) => !term || `${g.name} ${g.specialty || ""} ${g.license || ""}`.toLowerCase().includes(term))
      .sort((a, b) => b.recs.length - a.recs.length);
  }, [groups, tab, q]);

  const totalPending = recs.filter((r) => r.status === "pending").length;
  const pendingDoctors = groups.filter(needsReview).length;
  const totalApproved = recs.filter((r) => r.status === "approved").length;
  const totalPendingComments = recs.filter((r) => r.comment_status === "pending").length;

  const run = async (key, fn, okText) => {
    setBusy(key); setNotice(null);
    try {
      const res = await fn();
      if (res && res.ok === false) {
        const reasons = {
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

  const approveGroup = (g) => run(g.key, async () => {
    const res = g.kind === "suggestion"
      ? await invoke("adminReviewSuggestion", { id: g.suggestion.id, action: "approve" })
      : await invoke("adminReviewRecommendation", { ids: g.pendingIds, status: "approved" });
    logActivity({ type: "recomendacion_aprobada", description: `Se aprobó a ${g.name} y sus recomendaciones`, specialistId: g.specialist?.id, specialistName: g.name });
    return res;
  }, `Aprobado: ${g.name}`);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2"><HeartHandshake className="w-6 h-6 text-brand-blue" /> Recomendaciones de pacientes</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Doctores que los pacientes recomiendan desde <Link to="/recomendaciones" target="_blank" className="underline">/recomendaciones</Link>. Nada se muestra al público hasta que lo aprueban aquí.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        {[["Recomendaciones por revisar", "Por revisar", totalPending, "bg-brand-blue"], ["Comentarios por revisar", "Comentarios", totalPendingComments, "bg-brand-navy"], ["Doctores por revisar", "Doctores", pendingDoctors, "bg-brand-blue"], ["Recomendaciones aprobadas", "Aprobadas", totalApproved, "bg-brand-navy"]].map(([label, short, value, tone]) => (
          <div key={label} className={`rounded-xl p-3.5 ${tone}`}>
            <p className="text-xs sm:text-sm font-semibold text-white/90 mb-1"><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{label}</span></p>
            <p className="font-heading font-extrabold text-3xl sm:text-4xl text-white leading-tight">{value}</p>
          </div>
        ))}
      </div>

      {commentsPublic !== null && (
        <div className="mt-5 rounded-xl border border-border/60 bg-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Comentarios públicos: <span className={commentsPublic ? "text-emerald-700" : "text-muted-foreground"}>{commentsPublic ? "visibles" : "ocultos"}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {commentsPublic ? "Los comentarios aprobados se ven en la página pública de cada doctor." : "Aunque apruebes comentarios, no se muestran al público hasta que los hagas visibles. Conviene esperar la revisión del abogado."}
            </p>
          </div>
          <Button size="sm" variant="outline" disabled={busy === "flag"} onClick={toggleCommentsPublic} className="rounded-xl flex-shrink-0">
            {commentsPublic ? "Ocultar comentarios" : "Hacer visibles"}
          </Button>
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? "bg-brand-navy text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar doctor o cédula" className="h-10 rounded-xl pl-9" />
        </div>
      </div>

      {notice && (
        <p role="status" className={`mt-4 text-sm rounded-xl px-4 py-2.5 ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{notice.text}</p>
      )}

      <div className="mt-5 space-y-4">
        {visible.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <p className="text-muted-foreground">{tab === "pending" ? "No hay nada por revisar." : "No hay doctores en esta lista."}</p>
          </div>
        )}

        {visible.map((g) => {
          const isOpen = !!open[g.key];
          const tagCounts = {};
          g.recs.forEach((r) => (r.tags || []).forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
          const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
          const approvedCount = g.recs.filter((r) => r.status === "approved").length;
          const s = g.suggestion;
          const hasProfile = !!(g.specialist && (s?.specialist_id || g.kind === "specialist"));
          const canAct = g.status !== "rejected";
          return (
            <section key={g.key} className="bg-card rounded-2xl border border-border/50 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-heading font-semibold text-lg text-foreground">{g.name}</h2>
                    <StatusPill status={g.status === "pending" || g.pendingIds.length > 0 ? "pending" : g.status} />
                    <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                      {g.kind === "suggestion" ? (hasProfile ? "Propuesto · perfil privado creado" : "Propuesto por pacientes") : "Doctor del directorio"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {[g.specialty, g.zone, g.hospital].filter(Boolean).join(" · ") || "—"}
                    {g.license && <> · Cédula: <span className="font-medium text-foreground">{g.license}</span></>}
                  </p>
                  <p className="text-sm mt-2">
                    <span className="font-semibold text-foreground">{g.recs.length}</span> {g.recs.length === 1 ? "recomendación" : "recomendaciones"}
                    <span className="text-muted-foreground"> · {approvedCount} aprobadas · {g.pendingIds.length} por revisar{g.pendingCommentIds.length > 0 ? ` · ${g.pendingCommentIds.length} ${g.pendingCommentIds.length === 1 ? "comentario" : "comentarios"} por revisar` : ""}</span>
                  </p>
                  {g.kind === "suggestion" && s?.slug && g.status === "approved" && (
                    <p className="text-xs mt-2 flex items-center gap-3 flex-wrap">
                      <a href={`/recomendado/${s.slug}`} target="_blank" rel="noopener noreferrer" className="text-brand-blue inline-flex items-center gap-1 hover:underline">
                        Ver página pública <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        className="text-brand-blue hover:underline"
                        onClick={() => navigator.clipboard?.writeText(`https://buscoundoctor.com/recomendado/${s.slug}`).then(() => setNotice({ ok: true, text: "Enlace copiado" })).catch(() => setNotice({ ok: false, text: "No se pudo copiar el enlace" }))}
                      >
                        Copiar enlace
                      </button>
                      <span className="text-muted-foreground">
                        {approvedCount >= 3 && s.license_checked_at ? "Aparece en Google" : "Solo con el enlace (para Google faltan 3 recomendaciones aprobadas y la cédula comprobada)"}
                      </span>
                    </p>
                  )}
                  {topTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {topTags.map(([t, n]) => <span key={t} className="text-xs bg-brand-bluePale text-brand-navy px-2.5 py-1 rounded-full">{recommendationTagLabel(t)} · {n}</span>)}
                    </div>
                  )}
                </div>

                {canAct && (
                  <div className="flex gap-2 flex-wrap">
                    {(g.status === "pending" || g.pendingIds.length > 0) && (
                      <Button size="sm" disabled={busy === g.key} onClick={() => approveGroup(g)} className="rounded-xl gap-1.5 bg-brand-augusta hover:bg-brand-augusta/90 text-white">
                        <CheckCircle2 className="w-4 h-4" /> Aprobar todo
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={busy === g.key} onClick={() => rejectGroup(g)} className="rounded-xl gap-1.5 text-red-700 border-red-200 hover:bg-red-50">
                      <XCircle className="w-4 h-4" /> Rechazar
                    </Button>
                  </div>
                )}
                {g.status === "rejected" && g.kind === "suggestion" && (
                  <Button size="sm" variant="outline" disabled={busy === g.key} onClick={() => run(g.key, () => invoke("adminReviewSuggestion", { id: s.id, action: "reopen" }), "Propuesta reabierta")} className="rounded-xl">Reabrir</Button>
                )}
              </div>

              {g.kind === "suggestion" && canAct && (
                <div className="mt-4 pt-4 border-t border-border/50 grid gap-4 grid-cols-1 md:grid-cols-2 [&>div]:min-w-0">
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Cédula</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={SEP_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue inline-flex items-center gap-1 hover:underline">
                        Consultar en la SEP <ExternalLink className="w-3 h-3" />
                      </a>
                      <Button size="sm" variant={s.license_checked_at ? "secondary" : "outline"} disabled={busy === g.key} onClick={() => toggleLicense(g)} className="rounded-xl h-8 text-xs">
                        {s.license_checked_at ? `Comprobada el ${fmtDate(s.license_checked_at)} (quitar)` : "Marcar cédula comprobada"}
                      </Button>
                    </div>
                    {!g.license && <p className="text-xs text-muted-foreground mt-1.5">Los pacientes no dieron cédula: búscalo por nombre en la SEP.</p>}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">Notas del equipo (privadas)</p>
                    <Textarea rows={2} value={notes[g.key] ?? s.admin_notes ?? ""} onChange={(e) => setNotes({ ...notes, [g.key]: e.target.value })} className="rounded-xl text-sm resize-none" maxLength={1000} />
                    <Button size="sm" variant="outline" disabled={busy === g.key} onClick={() => saveNotes(g)} className="rounded-xl h-8 text-xs mt-1.5">Guardar notas</Button>
                  </div>

                  {!hasProfile && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5"><GitMerge className="w-3.5 h-3.5" /> ¿Es el mismo doctor que otro?</p>
                      <div className="flex gap-2">
                        <select value={mergeTarget[g.key] || ""} onChange={(e) => setMergeTarget({ ...mergeTarget, [g.key]: e.target.value })} className="flex-1 min-w-0 h-9 px-2 rounded-xl border border-input bg-background text-sm">
                          <option value="">Elige el doctor con el que se junta</option>
                          {mergeOptions(g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <Button size="sm" variant="outline" disabled={!mergeTarget[g.key] || busy === g.key} onClick={() => merge(g)} className="rounded-xl h-9">Juntar</Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" /> Perfil y enlace de reclamo</p>
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
                  </div>
                </div>
              )}

              {g.kind === "specialist" && g.specialist && (
                <p className="text-xs text-muted-foreground mt-3">
                  <Link to={`/admin/doctores/editar/${g.specialist.id}`} className="underline">Abrir su perfil</Link>
                </p>
              )}

              <button type="button" onClick={() => setOpen({ ...open, [g.key]: !isOpen })} className="mt-4 text-sm font-medium text-brand-blue inline-flex items-center gap-1 hover:underline">
                {isOpen ? <>Ocultar recomendaciones <ChevronUp className="w-4 h-4" /></> : <>Ver las {g.recs.length} {g.recs.length === 1 ? "recomendación" : "recomendaciones"} <ChevronDown className="w-4 h-4" /></>}
              </button>

              {isOpen && (
                <ul className="mt-3 space-y-2">
                  {g.recs.map((r) => (
                    <li key={r.id} className="rounded-xl border border-border/60 p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusPill status={r.status} />
                          <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                          {(r.tags || []).map((t) => <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{recommendationTagLabel(t)}</span>)}
                        </div>
                        <div className="flex gap-1.5">
                          {r.status !== "approved" && <Button size="sm" variant="outline" disabled={busy === `r-${r.id}`} onClick={() => reviewOne(g, r, "approved")} className="rounded-lg h-8 text-xs">Aprobar</Button>}
                          {r.status !== "rejected" && <Button size="sm" variant="outline" disabled={busy === `r-${r.id}`} onClick={() => reviewOne(g, r, "rejected")} className="rounded-lg h-8 text-xs text-red-700">Rechazar</Button>}
                        </div>
                      </div>
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
                      {r.private_message ? (
                        <p className="text-sm text-foreground mt-2 flex gap-2"><Quote className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" /> <span className="break-words">{r.private_message}</span></p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2">Sin mensaje privado.</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
