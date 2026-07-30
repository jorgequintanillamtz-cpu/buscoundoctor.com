import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Star, Globe, ChevronDown, Plus, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const SCHEMA_OPTIONS = ["Article", "MedicalWebPage", "FAQPage", "Physician", "MedicalClinic"];

// ---- SEO Score ----
// Quita acentos/diacríticos para comparar keyword vs. slug (las URLs no llevan acentos,
// pero deben considerarse la misma palabra para efectos de SEO).
const stripAccents = (str) => str.normalize("NFD").replace(/[̀-ͯ]/g, "");

function calcSEO(form, specialtyOptions = []) {
  const kw = (form.primary_keyword || "").toLowerCase().trim();
  const content = (form.content || "").toLowerCase();
  const title = (form.title || "").toLowerCase();
  const metaTitle = (form.meta_title || "").toLowerCase();
  const metaDesc = (form.meta_description || "").toLowerCase();
  const slug = (form.slug || "").toLowerCase();
  const words = content.trim().split(/\s+/).filter(Boolean).length;

  const kwInTitle = kw && title.includes(kw);
  const kwInUrl = kw && stripAccents(slug).includes(stripAccents(kw).replace(/\s+/g, "-"));
  const kwInFirst100Words = kw && (() => {
    const first100 = content.trim().split(/\s+/).filter(Boolean).slice(0, 100).join(" ");
    return first100.includes(kw);
  })();
  const kwInH2 = kw && (() => {
    const h2s = content.match(/^## .+$/gm) || [];
    return h2s.some(h => h.toLowerCase().includes(kw));
  })();
  const kwInMetaDesc = kw && metaDesc.includes(kw);
  const hasAltText = !!form.image_alt;
  const over800 = words >= 800;
  const over1500 = words >= 1500;
  const kwDensity = kw ? (() => {
    const count = (content.match(new RegExp(kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "gi")) || []).length;
    const density = words > 0 ? (count / words) * 100 : 0;
    return density < 3 && density > 0;
  })() : false;
  const hasFAQ = content.includes("## preguntas frecuentes") || content.includes("## faqs") || content.includes("**¿");
  const hasMetaTitle = (form.meta_title || "").length >= 10;
  const hasInternalLink = content.match(/\[.+\]\(\/[^)]+\)/);
  const hasExternalLink = content.match(/\[.+\]\(https?:\/\/[^)]+\)/);
  const hasExcerpt = (form.excerpt || "").length > 20;

  // Enlaces internos a /especialidad/:slug deben apuntar a especialidades reales
  const specialtyLinkMatches = [...(form.content || "").matchAll(/\/especialidad\/([a-z0-9-]+)/g)];
  const knownSlugs = new Set(specialtyOptions.map(s => s.slug));
  const brokenSpecialtyLinks = specialtyLinkMatches
    .map(m => m[1])
    .filter(s => !knownSlugs.has(s));
  const internalLinksValid = specialtyLinkMatches.length === 0 || brokenSpecialtyLinks.length === 0;

  const checks = [
    { label: "Título contiene la keyword principal", ok: !!kwInTitle },
    { label: "Meta descripción contiene la keyword", ok: !!kwInMetaDesc },
    { label: "URL slug contiene keyword", ok: !!kwInUrl },
    { label: "Artículo tiene más de 800 palabras", ok: over800 },
    { label: "Artículo tiene más de 1,500 palabras (ideal)", ok: over1500 },
    { label: "Keyword aparece en las primeras 100 palabras", ok: !!kwInFirst100Words },
    { label: "Un H2 contiene la keyword", ok: !!kwInH2 },
    { label: "Imagen destacada tiene alt text", ok: hasAltText },
    { label: "Meta título configurado", ok: hasMetaTitle },
    { label: "Keyword density < 3% (no stuffing)", ok: kwDensity },
    { label: "FAQs incluidas", ok: hasFAQ },
    { label: "Schema markup configurado", ok: !!form.schema_type },
    { label: "Enlace interno incluido", ok: !!hasInternalLink },
    { label: "Enlace externo incluido", ok: !!hasExternalLink },
    { label: "Artículo tiene extracto/resumen", ok: hasExcerpt },
    {
      label: brokenSpecialtyLinks.length > 0
        ? `Enlaces a especialidades válidos (roto: /especialidad/${brokenSpecialtyLinks[0]})`
        : "Enlaces a especialidades válidos",
      ok: internalLinksValid,
    },
  ];

  const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
  return { checks, score };
}

function SnippetPreview({ form }) {
  const title = form.meta_title || form.title || "Título del artículo";
  const desc = form.meta_description || form.excerpt || "Meta descripción del artículo...";
  const url = `bridgeguide.mx/blog/${form.slug || "slug"}`;

  return (
    <div className="border border-border/40 rounded-xl p-3 bg-white space-y-0.5 mt-1">
      <p className="text-[11px] text-blue-700 font-medium line-clamp-1 leading-snug">{title.slice(0, 60)}{title.length > 60 ? "…" : ""}</p>
      <p className="text-[11px] text-green-700 truncate">{url}</p>
      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{desc.slice(0, 160)}{desc.length > 160 ? "…" : ""}</p>
    </div>
  );
}

const SideLabel = ({ children }) => (
  <p className="text-xs font-medium text-foreground mb-1">{children}</p>
);

const SideCard = ({ children, className = "" }) => (
  <div className={`bg-white border border-border/50 rounded-2xl shadow-sm p-4 space-y-3 ${className}`}>
    {children}
  </div>
);

const SideTitle = ({ children }) => (
  <p className="text-sm font-semibold text-foreground">{children}</p>
);

export default function BlogEditorSidebar({ form, update, onSaveDraft, onPublish, saving }) {
  const [specialtyOptions, setSpecialtyOptions] = useState([]);
  const { checks, score } = calcSEO(form, specialtyOptions);
  const titleLen = (form.meta_title || "").length;
  const descLen = (form.meta_description || "").length;
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    base44.entities.Specialty.filter({ active: true }).then((list) => {
      setSpecialtyOptions([...list].sort((a, b) => a.name.localeCompare(b.name, "es")));
    }).catch(() => {});
  }, []);

  const scoreColor = score >= 71 ? "text-green-600" : score >= 41 ? "text-amber-600" : "text-red-500";
  const scoreBar = score >= 71 ? "bg-green-500" : score >= 41 ? "bg-amber-400" : "bg-red-400";

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !(form.secondary_keywords || "").split(",").map(t => t.trim()).includes(v)) {
      const existing = (form.secondary_keywords || "").split(",").map(t => t.trim()).filter(Boolean);
      update("secondary_keywords", [...existing, v].join(", "));
    }
    setTagInput("");
  };

  const removeTag = (tag) => {
    const tags = (form.secondary_keywords || "").split(",").map(t => t.trim()).filter(t => t && t !== tag);
    update("secondary_keywords", tags.join(", "));
  };

  const secTags = (form.secondary_keywords || "").split(",").map(t => t.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Bloque Publicación */}
      <SideCard>
        <SideTitle>Publicación</SideTitle>

        <div>
          <SideLabel>Estatus</SideLabel>
          <div className="relative">
            <select
              value={form.published ? "publicado" : "borrador"}
              onChange={e => {
                if (e.target.value === "publicado") { update("published", true); update("scheduled_at", ""); }
                else if (e.target.value === "borrador") { update("published", false); }
              }}
              className="w-full h-9 pl-3 pr-8 text-sm bg-background border border-input rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="borrador">Borrador</option>
              <option value="publicado">Publicado</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {form.scheduled_at !== undefined && (
          <div>
            <SideLabel>Fecha de publicación</SideLabel>
            <input type="datetime-local" value={form.scheduled_at || ""}
              onChange={e => {
                update("scheduled_at", e.target.value);
                // Programar una fecha futura implica quedar en borrador hasta
                // que llegue esa fecha (el cron publishScheduledPosts la
                // publica sola). Si se borra la fecha, no se toca published.
                if (e.target.value) update("published", false);
              }}
              className="w-full h-9 px-3 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring" />
            {form.scheduled_at && (
              <p className="text-xs text-amber-600 mt-1">Quedará en borrador hasta esta fecha.</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between py-0.5">
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-amber-400" />
            Artículo destacado
          </div>
          <Switch checked={!!form.featured} onCheckedChange={v => update("featured", v)} />
        </div>

        <div className="flex items-center justify-between py-0.5">
          <div className="flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-blue-500" />
            Indexable por Google
          </div>
          <Switch checked={form.indexable !== false} onCheckedChange={v => update("indexable", v)} />
        </div>

        <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={saving} className="w-full rounded-xl gap-1.5">
          Guardar borrador
        </Button>
      </SideCard>

      {/* SEO Score */}
      <SideCard>
        <div className="flex items-center justify-between">
          <SideTitle>Puntuación SEO</SideTitle>
          <span className={`text-xl font-bold ${scoreColor}`}>{score}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div className={`h-1.5 rounded-full transition-all duration-500 ${scoreBar}`} style={{ width: `${score}%` }} />
        </div>
        <div className="space-y-1.5 pt-1">
          {checks.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {c.ok
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                : <XCircle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />}
              <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
            </div>
          ))}
        </div>
      </SideCard>

      {/* SEO Básico */}
      <SideCard>
        <SideTitle>SEO básico</SideTitle>

        <div>
          <div className="flex items-center justify-between mb-1">
            <SideLabel>Meta título</SideLabel>
            <span className={`text-xs ${titleLen > 60 ? "text-red-500" : "text-muted-foreground"}`}>{titleLen}/60 — ideal 50-60</span>
          </div>
          <Input value={form.meta_title || ""} onChange={e => update("meta_title", e.target.value)}
            className="rounded-xl text-sm h-9" placeholder="Meta título" />
          {titleLen > 60 && <p className="text-xs text-red-500 mt-1">Supera los 60 caracteres</p>}
        </div>

        <SnippetPreview form={form} />

        <div>
          <div className="flex items-center justify-between mb-1">
            <SideLabel>Meta descripción</SideLabel>
            <span className={`text-xs ${descLen > 160 ? "text-red-500" : "text-muted-foreground"}`}>{descLen}/155 — ideal 150-160</span>
          </div>
          <textarea value={form.meta_description || ""} onChange={e => update("meta_description", e.target.value)}
            className="w-full min-h-[72px] px-3 py-2 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Descripción para buscadores..." maxLength={200} />
          {descLen > 160 && <p className="text-xs text-red-500 mt-1">Supera los 160 caracteres</p>}
        </div>

        <div>
          <SideLabel>Keyword principal</SideLabel>
          <Input value={form.primary_keyword || ""} onChange={e => update("primary_keyword", e.target.value)}
            className="rounded-xl text-sm h-9" placeholder="fotógrafos boda monterrey" />
        </div>

        <div>
          <SideLabel>Keywords secundarias (separadas por coma)</SideLabel>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {secTags.map((tag, i) => (
              <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                {tag}
                <button type="button" onClick={() => removeTag(tag)}><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
              className="rounded-xl text-sm h-8 flex-1"
              placeholder="keyword1, keyword2, keyword3"
              onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }} />
            <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 px-2" onClick={addTag}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </SideCard>

      {/* Categoría y autor */}
      <SideCard>
        <SideTitle>Categoría y autor</SideTitle>

        <div>
          <SideLabel>Categoría del blog</SideLabel>
          <div className="relative">
            <select value={form.category || ""} onChange={e => update("category", e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-sm bg-background border border-input rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Sin categoría</option>
              {specialtyOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div>
          <SideLabel>Especialidad relacionada (SEO)</SideLabel>
          <div className="relative">
            <select value={form.specialty_id || ""} onChange={e => update("specialty_id", e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-sm bg-background border border-input rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">Ninguna (artículo general)</option>
              {specialtyOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Activa el bloque “Encuentra un especialista” y los artículos relacionados en la página del artículo.</p>
        </div>

        <div>
          <SideLabel>Autor</SideLabel>
          <Input value={form.author || ""} onChange={e => update("author", e.target.value)}
            className="rounded-xl text-sm h-9" placeholder="Sin autor" />
        </div>

        <div>
          <SideLabel>Credencial/puesto del autor</SideLabel>
          <Input value={form.author_title || ""} onChange={e => update("author_title", e.target.value)}
            className="rounded-xl text-sm h-9" placeholder="Ej: Médico General, Cédula 12345678" />
        </div>

        <div>
          <SideLabel>Foto del autor (URL)</SideLabel>
          <Input value={form.author_photo || ""} onChange={e => update("author_photo", e.target.value)}
            className="rounded-xl text-sm h-9" placeholder="https://..." />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <SideLabel>Biografía breve del autor</SideLabel>
            <span className="text-xs text-muted-foreground">{(form.author_bio || "").length}/500</span>
          </div>
          <textarea value={form.author_bio || ""} onChange={e => { if (e.target.value.length <= 500) update("author_bio", e.target.value); }}
            className="w-full min-h-[70px] px-3 py-2 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Experiencia y credenciales del autor (refuerza confianza YMYL ante Google)" />
          <p className="text-xs text-muted-foreground mt-1">Se muestra al final del artículo en una caja “Sobre el autor”.</p>
        </div>
      </SideCard>

      {/* Schema Markup */}
      <SideCard>
        <SideTitle>Schema markup</SideTitle>
        <div className="relative">
          <select value={form.schema_type || "Article"} onChange={e => update("schema_type", e.target.value)}
            className="w-full h-9 pl-3 pr-8 text-sm bg-background border border-input rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-ring">
            {SCHEMA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <p className="text-xs text-muted-foreground">Se inserta automáticamente en JSON-LD al publicar</p>
      </SideCard>
    </div>
  );
}