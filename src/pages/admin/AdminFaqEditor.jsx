import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Save, Globe, Clock, Trash2, Code2, Plus, GripVertical, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "borrador", label: "Borrador" },
  { value: "publicado", label: "Publicado" },
  { value: "programado", label: "Programado" },
];

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

function FaqItemRow({ item, onUpdate, onDelete, idx }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
        <span className="text-xs font-mono text-muted-foreground w-5 flex-shrink-0">{idx + 1}</span>
        <p className="flex-1 text-sm font-medium text-foreground line-clamp-1">{item.question || "Sin pregunta"}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${item.status === "publicado" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
          {item.status === "publicado" ? "Publicado" : "Borrador"}
        </span>
        <span className="text-xs text-muted-foreground flex-shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30 pt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Pregunta</label>
            <Input
              value={item.question}
              onChange={e => onUpdate(item.id, { question: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Respuesta</label>
            <textarea
              value={item.answer}
              onChange={e => onUpdate(item.id, { answer: e.target.value })}
              className="w-full min-h-[120px] p-3 text-sm bg-white border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Keyword principal</label>
              <Input
                value={item.primary_keyword || ""}
                onChange={e => onUpdate(item.id, { primary_keyword: e.target.value })}
                className="rounded-xl text-sm"
                placeholder="cardiólogo monterrey precio"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
              <Input
                value={item.category || ""}
                onChange={e => onUpdate(item.id, { category: e.target.value })}
                className="rounded-xl text-sm"
                placeholder="Costos"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Keywords secundarias</label>
            <Input
              value={item.secondary_keywords || ""}
              onChange={e => onUpdate(item.id, { secondary_keywords: e.target.value })}
              className="rounded-xl text-sm"
              placeholder="precio consulta cardiológica, costo cardiólogo, cardiólogo barato monterrey"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Slug</label>
              <Input
                value={item.slug || ""}
                onChange={e => onUpdate(item.id, { slug: e.target.value })}
                className="rounded-xl text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
              <select
                value={item.status || "borrador"}
                onChange={e => onUpdate(item.id, { status: e.target.value })}
                className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="borrador">Borrador</option>
                <option value="publicado">Publicado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Meta title</label>
            <Input
              value={item.meta_title || ""}
              onChange={e => onUpdate(item.id, { meta_title: e.target.value })}
              className="rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Meta description</label>
            <textarea
              value={item.meta_description || ""}
              onChange={e => onUpdate(item.id, { meta_description: e.target.value })}
              className="w-full min-h-[70px] p-3 text-sm bg-white border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              maxLength={160}
            />
            <p className="text-xs text-right text-muted-foreground mt-0.5">{(item.meta_description || "").length}/160</p>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}
              className="text-destructive hover:text-destructive rounded-lg gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar pregunta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminFaqEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [page, setPage] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [pendingUpdates, setPendingUpdates] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.FaqPage.list().then(pages => pages.find(p => p.id === id)),
      base44.entities.FaqItem.filter({ faq_page_id: id }, "position", 200),
    ]).then(([p, its]) => {
      setPage(p || null);
      setItems(its || []);
      setLoading(false);
    });
  }, [id]);

  const updatePageField = (field, value) => setPage(p => ({ ...p, [field]: value }));

  const handleItemUpdate = (itemId, changes) => {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, ...changes } : it));
    setPendingUpdates(prev => ({ ...prev, [itemId]: { ...(prev[itemId] || {}), ...changes } }));
  };

  const handleItemDelete = async (itemId) => {
    if (!confirm("¿Eliminar esta pregunta?")) return;
    await base44.entities.FaqItem.delete(itemId);
    setItems(prev => prev.filter(it => it.id !== itemId));
    setPage(p => ({ ...p, faq_count: Math.max(0, (p.faq_count || 1) - 1) }));
    toast.success("Pregunta eliminada");
  };

  const handleAddQuestion = async () => {
    const newItem = await base44.entities.FaqItem.create({
      faq_page_id: id,
      specialty: page.specialty,
      city: page.city,
      question: "",
      answer: "",
      position: items.length,
      status: "borrador",
    });
    setItems(prev => [...prev, newItem]);
    setPage(p => ({ ...p, faq_count: (p.faq_count || 0) + 1 }));
  };

  const buildSchema = () => JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map(it => ({
      "@type": "Question",
      "name": it.question,
      "acceptedAnswer": { "@type": "Answer", "text": it.answer }
    }))
  });

  const savePendingItems = async () => {
    await Promise.all(
      Object.entries(pendingUpdates).map(([itemId, changes]) =>
        base44.entities.FaqItem.update(itemId, changes)
      )
    );
    setPendingUpdates({});
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // Publish all items
      const unpublished = items.filter(it => it.status !== "publicado");
      await Promise.all(unpublished.map(it => base44.entities.FaqItem.update(it.id, { status: "publicado" })));
      setItems(prev => prev.map(it => ({ ...it, status: "publicado" })));

      await base44.entities.FaqPage.update(id, {
        ...page,
        status: "publicado",
        schema_json: buildSchema(),
        faq_count: items.length,
        slug: page.slug || slugify(`${page.specialty}-${page.city}`),
      });
      setPage(p => ({ ...p, status: "publicado" }));
      setPendingUpdates({});
      toast.success("¡Página y preguntas publicadas!");
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setPublishing(false);
  };

  const handleSchedule = async () => {
    if (!scheduledAt) { toast.error("Selecciona una fecha y hora"); return; }
    setPublishing(true);
    try {
      await base44.entities.FaqPage.update(id, {
        ...page,
        status: "programado",
        schema_json: buildSchema(),
        faq_count: items.length,
        slug: page.slug || slugify(`${page.specialty}-${page.city}`),
      });
      setPage(p => ({ ...p, status: "programado" }));
      await savePendingItems();
      setShowSchedule(false);
      toast.success(`Programado para ${new Date(scheduledAt).toLocaleString("es-MX")}`);
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setPublishing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.FaqPage.update(id, {
        ...page,
        schema_json: buildSchema(),
        faq_count: items.length,
        slug: page.slug || slugify(`${page.specialty}-${page.city}`),
      });
      await savePendingItems();
      toast.success("FAQs guardadas");
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Stethoscope className="w-8 h-8 text-primary animate-bounce" strokeWidth={1.75} />
    </div>
  );

  if (!page) return (
    <div className="text-center py-20 text-muted-foreground">Página no encontrada</div>
  );

  const seoScore = (() => {
    let s = 0;
    if (page.meta_title) s += 20;
    if (page.meta_description) s += 20;
    if (page.slug) s += 10;
    if (items.length >= 10) s += 20;
    if (items.filter(it => it.primary_keyword).length > items.length / 2) s += 20;
    if (page.schema_json) s += 10;
    return s;
  })();

  return (
    <div className="max-w-7xl">
      <button onClick={() => navigate("/admin/faqs")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
        <ChevronLeft className="w-4 h-4" /> Volver a FAQs
      </button>

      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-xl text-foreground">{page.specialty} en {page.city}</h1>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">/faq/{page.slug}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowSchema(s => !s)} className="rounded-xl gap-1.5">
            <Code2 className="w-4 h-4" />
            Schema
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSchedule(s => !s)} className="rounded-xl gap-1.5">
            <Clock className="w-4 h-4" />
            Programar
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="rounded-xl gap-1.5">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar borrador
          </Button>
          <Button onClick={handlePublish} disabled={publishing || saving} className="rounded-xl gap-1.5">
            {publishing ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Globe className="w-4 h-4" />}
            {page.status === "publicado" ? "Actualizar" : "Publicar todo"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Main */}
        <div className="space-y-4">
          {/* Page meta */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
            <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Metadatos de la página</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Título de la página</label>
              <Input value={page.title || ""} onChange={e => updatePageField("title", e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Meta title SEO</label>
              <Input value={page.meta_title || ""} onChange={e => updatePageField("meta_title", e.target.value)} className="rounded-xl" maxLength={70} />
              <p className="text-xs text-right text-muted-foreground mt-0.5">{(page.meta_title || "").length}/70</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Meta description SEO</label>
              <textarea
                value={page.meta_description || ""}
                onChange={e => updatePageField("meta_description", e.target.value)}
                className="w-full min-h-[80px] p-3 text-sm bg-white border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                maxLength={160}
              />
              <p className="text-xs text-right text-muted-foreground mt-0.5">{(page.meta_description || "").length}/160</p>
            </div>
            {/* Google preview */}
            {page.meta_title && (
              <div className="bg-white border border-border/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Vista previa Google</p>
                <p className="text-sm text-blue-700 font-medium leading-tight line-clamp-1">{page.meta_title}</p>
                <p className="text-xs text-green-700 mt-0.5">tudominio.com/faq/{page.slug}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{page.meta_description}</p>
              </div>
            )}
          </div>

          {/* Schedule panel */}
          {showSchedule && (
            <div className="bg-card border border-amber-200 rounded-2xl p-5 space-y-3">
              <h2 className="font-heading font-semibold text-sm text-amber-700 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Programar publicación
              </h2>
              <p className="text-xs text-muted-foreground">Selecciona cuándo se publicará automáticamente esta página de FAQs.</p>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full text-sm border border-input rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowSchedule(false)} className="rounded-xl flex-1">Cancelar</Button>
                <Button size="sm" onClick={handleSchedule} disabled={publishing} className="rounded-xl flex-1 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-amber-500">
                  {publishing ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                  Confirmar
                </Button>
              </div>
            </div>
          )}

          {/* Schema JSON */}
          {showSchema && (
            <div className="bg-card border border-border/50 rounded-2xl p-5">
              <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Schema FAQPage JSON-LD</h2>
              <pre className="text-xs bg-muted/50 rounded-xl p-4 overflow-x-auto max-h-64 text-muted-foreground">
                {page.schema_json ? JSON.stringify(JSON.parse(page.schema_json), null, 2) : "Guarda primero para regenerar el schema"}
              </pre>
            </div>
          )}

          {/* FAQ items */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Preguntas frecuentes ({items.length})
              </h2>
              <Button variant="outline" size="sm" onClick={handleAddQuestion} className="rounded-xl gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay preguntas aún</p>
            ) : (
              items.map((item, idx) => (
                <FaqItemRow
                  key={item.id}
                  item={item}
                  idx={idx}
                  onUpdate={handleItemUpdate}
                  onDelete={handleItemDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
            <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Publicación</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Estado</label>
              <select
                value={page.status || "borrador"}
                onChange={e => updatePageField("status", e.target.value)}
                className="w-full text-sm border border-input rounded-xl px-3 py-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Slug URL</label>
              <Input
                value={page.slug || ""}
                onChange={e => updatePageField("slug", e.target.value.replace(/[^a-z0-9-]/g, ""))}
                className="rounded-xl font-mono text-sm"
              />
            </div>
          </div>

          {/* SEO Score */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">SEO Score</h2>
              <span className={`text-lg font-bold ${seoScore >= 80 ? "text-green-600" : seoScore >= 50 ? "text-amber-600" : "text-red-500"}`}>
                {seoScore}/100
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${seoScore >= 80 ? "bg-green-500" : seoScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${seoScore}%` }}
              />
            </div>
            <ul className="space-y-1.5 text-xs">
              {[
                { ok: !!page.meta_title, label: "Meta title configurado" },
                { ok: !!page.meta_description, label: "Meta description configurado" },
                { ok: !!page.slug, label: "Slug URL definido" },
                { ok: items.length >= 10, label: `Mínimo 10 FAQs (${items.length} actuales)` },
                { ok: items.filter(it => it.primary_keyword).length > items.length / 2, label: "Keywords en >50% preguntas" },
                { ok: !!page.schema_json, label: "Schema FAQPage generado" },
              ].map((check, i) => (
                <li key={i} className={`flex items-center gap-1.5 ${check.ok ? "text-green-700" : "text-muted-foreground"}`}>
                  <span>{check.ok ? "✓" : "○"}</span>
                  {check.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-2 text-sm">
            <h2 className="font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-3">Información</h2>
            <div className="flex justify-between"><span className="text-muted-foreground">Especialidad</span><span className="font-medium">{page.specialty}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ciudad</span><span className="font-medium">{page.city}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total FAQs</span><span className="font-medium">{items.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Publicadas</span><span className="font-medium text-green-600">{items.filter(it => it.status === "publicado").length}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}