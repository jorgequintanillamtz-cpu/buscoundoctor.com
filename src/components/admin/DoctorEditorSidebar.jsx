import { useState } from "react";
import { CheckCircle2, XCircle, Star, Globe, ChevronDown, Plus, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { generateSlug } from "@/pages/admin/AdminDoctorEditor";

const SEGUROS = ["GNP", "AXA", "Metlife", "BBVA Salud", "Atlas", "Allianz", "Mapfre", "Seguros Monterrey", "HDI"];

const ESPECIALIDADES = [
  "Medicina General", "Cardiología", "Pediatría", "Ginecología", "Ortopedia",
  "Dermatología", "Neurología", "Psiquiatría", "Oftalmología", "Otorrinolaringología",
  "Urología", "Gastroenterología", "Endocrinología", "Oncología", "Reumatología",
];

const ESTADO_CONFIG = {
  borrador:    { label: "Borrador",    dot: "bg-gray-400",   cls: "border-gray-200 hover:bg-gray-50" },
  en_revision: { label: "En revisión", dot: "bg-amber-400",  cls: "border-amber-200 hover:bg-amber-50/50" },
  publicado:   { label: "Publicado",   dot: "bg-green-500",  cls: "border-green-200 hover:bg-green-50/50" },
};

const SCHEMA_OPTIONS = ["Physician", "MedicalBusiness", "Person"];

// ---- SEO Score ----
function calcSEO(form) {
  const words = (form.descripcion_profesional || "").trim().split(/\s+/).filter(Boolean).length;
  const tituloOk = form.titulo_seo?.toLowerCase().includes((form.especialidad || "").toLowerCase()) && form.especialidad;
  const descCiudad = form.descripcion_seo?.toLowerCase().includes((form.ciudad || "monterrey").toLowerCase());
  const slugNombre = form.slug && form.nombre_completo && form.slug.includes(generateSlug(form.nombre_completo.split(" ")[1] || "").slice(0, 4));
  const checks = [
    { label: "Título contiene especialidad",        ok: !!tituloOk },
    { label: "Meta descripción menciona ciudad",     ok: !!descCiudad },
    { label: "Slug contiene nombre del doctor",      ok: !!slugNombre },
    { label: "Descripción tiene más de 150 palabras",ok: words >= 150 },
    { label: "Descripción tiene más de 300 palabras",ok: words >= 300 },
    { label: "Cédula profesional configurada",       ok: /^\d{7,8}$/.test(form.cedula_profesional || "") },
    { label: "Foto de perfil subida",                ok: !!form.foto_perfil },
    { label: "Meta título configurado",              ok: (form.titulo_seo || "").length >= 10 },
    { label: "Perfil tiene extracto/resumen",        ok: (form.extracto || "").length > 20 },
    { label: "Meta descripción configurada",         ok: (form.descripcion_seo || "").length >= 50 },
  ];
  const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
  return { checks, score };
}

// ---- Completitud ----
function calcCompletitud(form) {
  const campos = [
    form.nombre_completo, form.cedula_profesional, form.especialidad,
    form.descripcion_profesional, form.extracto, form.hospital_o_consultorio,
    form.direccion, form.telefono, form.whatsapp, form.correo_contacto,
    form.foto_perfil, form.galeria_fotos?.length > 0,
    form.anos_experiencia, form.titulo_seo, form.descripcion_seo,
    form.precio_consulta_aproximado, form.sub_especialidades?.length > 0,
    form.idiomas?.length > 1,
  ];
  return Math.round((campos.filter(Boolean).length / campos.length) * 100);
}

// ---- Google Snippet Preview ----
function SnippetPreview({ form }) {
  const title = form.titulo_seo ||
    (form.nombre_completo ? `${form.nombre_completo} - ${form.especialidad || "Doctor"} en ${form.ciudad || "Monterrey"}` : "Título SEO del perfil");
  const desc = form.descripcion_seo || form.extracto || "Meta descripción del perfil...";
  const url = `tudominio.mx/doctores/${form.slug || "slug-del-doctor"}`;
  return (
    <div className="border border-border/50 rounded-xl p-3 bg-white space-y-0.5 mt-2">
      <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">Vista previa en Google</p>
      <p className="text-sm text-blue-700 font-medium leading-snug line-clamp-1">{title.slice(0, 60)}{title.length > 60 ? "…" : ""}</p>
      <p className="text-xs text-green-700 truncate">{url}</p>
      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{desc.slice(0, 160)}{desc.length > 160 ? "…" : ""}</p>
    </div>
  );
}

export default function DoctorEditorSidebar({ form, update, onSaveDraft, saving }) {
  const { checks, score } = calcSEO(form);
  const completitud = calcCompletitud(form);
  const titleLen = (form.titulo_seo || "").length;
  const descLen = (form.descripcion_seo || "").length;

  const [subInput, setSubInput] = useState("");
  const [idiomaInput, setIdiomaInput] = useState("");

  const toggleSeguro = (s) => {
    const cur = form.seguros_aceptados || [];
    update("seguros_aceptados", cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
  };

  const addChip = (field, input, setInput, current) => {
    const v = input.trim();
    if (v && !current.includes(v)) update(field, [...current, v]);
    setInput("");
  };

  const seoColor = score >= 70 ? "text-green-600" : score >= 40 ? "text-amber-600" : "text-red-500";
  const seoBarColor = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="space-y-4 sticky top-4">

      {/* Bloque 1 – Publicación */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-4">
        <h3 className="font-heading font-semibold text-sm">Publicación</h3>

        {/* Estado */}
        <div className="space-y-1.5">
          {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => (
            <button key={key} type="button"
              onClick={() => update("estado_perfil", key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm text-left transition-all ${cfg.cls}
                ${form.estado_perfil === key ? "font-medium bg-accent/50 border-primary/30" : "border-border"}`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Toggles */}
        <div className="space-y-2.5 pt-1 border-t border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-amber-400" />
              Perfil destacado
            </div>
            <Switch checked={form.destacado} onCheckedChange={v => update("destacado", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-blue-500" />
              Indexable por Google
            </div>
            <Switch checked={form.indexable} onCheckedChange={v => update("indexable", v)} />
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={saving} className="w-full rounded-xl">
          Guardar borrador
        </Button>

        {/* Completitud */}
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-muted-foreground">Completitud del perfil</span>
            <span className={`font-semibold ${completitud >= 80 ? "text-green-600" : completitud >= 50 ? "text-amber-600" : "text-red-500"}`}>{completitud}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className={`h-2 rounded-full transition-all duration-500 ${completitud >= 80 ? "bg-green-500" : completitud >= 50 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${completitud}%` }} />
          </div>
          {completitud >= 80 && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Perfil completo
            </p>
          )}
        </div>
      </div>

      {/* Bloque 2 – SEO Score */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm">Puntuación SEO</h3>
          <span className={`text-lg font-bold ${seoColor}`}>{score}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div className={`h-1.5 rounded-full transition-all duration-500 ${seoBarColor}`} style={{ width: `${score}%` }} />
        </div>
        <div className="space-y-1.5">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {c.ok
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                : <XCircle className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />}
              <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bloque 3 – SEO básico */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-4">
        <h3 className="font-heading font-semibold text-sm">SEO básico</h3>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium">Meta título</label>
            <span className={`text-xs ${titleLen > 60 ? "text-amber-600" : "text-muted-foreground"}`}>{titleLen}/60</span>
          </div>
          <Input value={form.titulo_seo} onChange={e => update("titulo_seo", e.target.value)}
            className="rounded-xl text-sm" maxLength={80}
            placeholder={`${form.especialidad || "Cardiólogo"} en ${form.ciudad || "Monterrey"} - ${form.nombre_completo || "Dr. Nombre"}`} />
          {titleLen > 60 && <p className="text-xs text-amber-600 mt-1">Ideal: máximo 60 caracteres</p>}
        </div>

        <SnippetPreview form={form} />

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium">Meta descripción</label>
            <span className={`text-xs ${descLen > 160 ? "text-amber-600" : "text-muted-foreground"}`}>{descLen}/155</span>
          </div>
          <textarea value={form.descripcion_seo} onChange={e => update("descripcion_seo", e.target.value)}
            className="w-full min-h-[75px] p-3 text-sm bg-white border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Describe brevemente al doctor: experiencia, ciudad, especialidad..." maxLength={200} />
          {descLen > 160 && <p className="text-xs text-amber-600 mt-1">Ideal: máximo 160 caracteres</p>}
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Keyword principal</label>
          <Input value={form.keyword_principal} onChange={e => update("keyword_principal", e.target.value)}
            className="rounded-xl text-sm" placeholder={`${form.especialidad || "cardiólogo"} ${form.ciudad || "Monterrey"}`} />
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Keywords secundarias</label>
          <Input value={form.keywords_secundarias} onChange={e => update("keywords_secundarias", e.target.value)}
            className="rounded-xl text-sm" placeholder="cardiología, consulta cardiológica, ECG" />
          <p className="text-xs text-muted-foreground mt-1">Separadas por coma</p>
        </div>
      </div>

      {/* Bloque 4 – Especialidad y categorías */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-4">
        <h3 className="font-heading font-semibold text-sm">Especialidad y datos</h3>

        <div>
          <label className="text-xs font-medium mb-1.5 block">Sub-especialidades</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(form.sub_especialidades || []).map((s, i) => (
              <span key={i} className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                {s} <button type="button" onClick={() => update("sub_especialidades", form.sub_especialidades.filter((_, j) => j !== i))}><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={subInput} onChange={e => setSubInput(e.target.value)} className="rounded-xl text-sm h-8"
              placeholder="Ej: Hemodinámica" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addChip("sub_especialidades", subInput, setSubInput, form.sub_especialidades || []))} />
            <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 px-2" onClick={() => addChip("sub_especialidades", subInput, setSubInput, form.sub_especialidades || [])}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Años de experiencia</label>
            <Input type="number" value={form.anos_experiencia} onChange={e => update("anos_experiencia", Number(e.target.value))}
              className="rounded-xl text-sm" placeholder="10" min={0} max={60} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Precio consulta</label>
            <Input value={form.precio_consulta_aproximado} onChange={e => update("precio_consulta_aproximado", e.target.value)}
              className="rounded-xl text-sm" placeholder="$800-$1,200" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block">Idiomas</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(form.idiomas || []).map((lang, i) => (
              <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                {lang} <button type="button" onClick={() => update("idiomas", form.idiomas.filter((_, j) => j !== i))}><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={idiomaInput} onChange={e => setIdiomaInput(e.target.value)} className="rounded-xl text-sm h-8"
              placeholder="Inglés, Francés..." onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addChip("idiomas", idiomaInput, setIdiomaInput, form.idiomas || []))} />
            <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 px-2" onClick={() => addChip("idiomas", idiomaInput, setIdiomaInput, form.idiomas || [])}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bloque 5 – Seguros */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm">Seguros médicos</h3>
          <Switch checked={form.acepta_seguros} onCheckedChange={v => { update("acepta_seguros", v); if (!v) update("seguros_aceptados", []); }} />
        </div>
        {form.acepta_seguros && (
          <div className="grid grid-cols-1 gap-2 pt-1">
            {SEGUROS.map(s => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(form.seguros_aceptados || []).includes(s)} onChange={() => toggleSeguro(s)}
                  className="w-4 h-4 rounded border-input accent-primary" />
                <span className="text-sm text-muted-foreground">{s}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Bloque 6 – Schema markup */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
        <h3 className="font-heading font-semibold text-sm">Schema markup</h3>
        <div className="relative">
          <select value={form.schema_type} onChange={e => update("schema_type", e.target.value)}
            className="w-full h-9 px-3 pr-8 text-sm bg-background border border-input rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-ring">
            {SCHEMA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <p className="text-xs text-muted-foreground">Se inserta automáticamente en JSON-LD al publicar</p>
      </div>
    </div>
  );
}