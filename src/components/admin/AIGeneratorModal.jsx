import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, X, ChevronDown, ChevronRight, Zap, Clock, BarChart2, Target, CheckCircle2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateBlogSlug } from "@/pages/admin/BlogEditor";

const TIPOS = ["Guía", "Comparativa", "Top 10", "Preguntas frecuentes", "Informativo", "Tratamiento", "Síntomas"];
const OBJETIVOS = ["SEO", "Leads", "Autoridad", "Comparativa", "Top Ranking"];
const LONGITUDES = ["1000", "2000", "3000", "5000"];
const TONOS = ["Profesional", "Médico", "Cercano", "Premium"];

const OPCIONES_AVANZADAS = [
  { key: "faq", label: "Generar FAQ SEO" },
  { key: "meta_title", label: "Generar Meta Title" },
  { key: "meta_desc", label: "Generar Meta Description" },
  { key: "schema", label: "Generar Schema Markup" },
  { key: "cta", label: "Generar CTA" },
  { key: "internal_links", label: "Generar Enlaces Internos" },
  { key: "intent", label: "Analizar Intención de Búsqueda" },
  { key: "competition", label: "Analizar Competencia" },
  { key: "table", label: "Crear Tabla Comparativa" },
  { key: "summary", label: "Crear Resumen Ejecutivo" },
];

// Estimaciones por longitud
const ESTIMATES = {
  "1000": { time: "~30s", seo: 65, difficulty: "Baja", quality: 70 },
  "2000": { time: "~45s", seo: 78, difficulty: "Media", quality: 82 },
  "3000": { time: "~60s", seo: 88, difficulty: "Media-Alta", quality: 90 },
  "5000": { time: "~90s", seo: 95, difficulty: "Alta", quality: 96 },
};

function Chip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"}`}>
      {label}
    </button>
  );
}

function FLabel({ children }) {
  return <p className="text-xs font-semibold text-foreground mb-2">{children}</p>;
}

// ─── Generating Steps UI ───
const STEPS = [
  "Analizando keyword y competencia...",
  "Detectando intención de búsqueda...",
  "Identificando entidades relacionadas...",
  "Detectando preguntas frecuentes...",
  "Creando estructura SEO óptima...",
  "Generando H1, H2 y H3...",
  "Escribiendo contenido completo...",
  "Generando FAQs, CTA y Schema...",
  "Optimizando densidad de keywords...",
  "Finalizando artículo...",
];

function GeneratingOverlay({ step }) {
  return (
    <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center z-10 gap-5 px-8">
      <Stethoscope className="w-[72px] h-[72px] text-primary animate-bounce" strokeWidth={1.75} />
      <div className="text-center space-y-1">
        <p className="font-heading font-semibold text-foreground">Generando artículo...</p>
        <p className="text-sm text-muted-foreground">{STEPS[step % STEPS.length]}</p>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div className="bg-primary h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(95, ((step + 1) / STEPS.length) * 100)}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">La IA está analizando y escribiendo tu artículo médico SEO</p>
    </div>
  );
}

export default function AIGeneratorModal({ form, update, onClose }) {
  const [fields, setFields] = useState({
    keyword: form.primary_keyword || "",
    city: "Monterrey",
    specialty: form.category || "",
    type: "Guía",
    objetivo: "SEO",
    longitud: "2000",
    tono: "Profesional",
  });
  const [opciones, setOpciones] = useState({
    faq: true, meta_title: true, meta_desc: true, schema: true,
    cta: true, internal_links: false, intent: true,
    competition: false, table: false, summary: false,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);

  const est = ESTIMATES[fields.longitud];

  const f = (k, v) => setFields(p => ({ ...p, [k]: v }));
  const toggleOp = (k) => setOpciones(p => ({ ...p, [k]: !p[k] }));

  const buildPrompt = () => {
    const opts = Object.entries(opciones).filter(([, v]) => v).map(([k]) => k);
    return `Eres un experto en SEO médico y content marketing para el sector salud en México.

Genera un artículo médico SEO completo y profesional en español que supere a Doctoralia, Top Doctors y directorios tradicionales en Google.

PARÁMETROS:
- Keyword principal: "${fields.keyword}"
- Ciudad: ${fields.city}
- Especialidad médica: ${fields.specialty || "medicina general"}
- Tipo de artículo: ${fields.type}
- Objetivo: ${fields.objetivo}
- Longitud objetivo: ${fields.longitud} palabras
- Tono: ${fields.tono}
- Opciones activadas: ${opts.join(", ")}

PROCESO REQUERIDO (ejecutar en orden):
1. Analiza la keyword y detecta intención de búsqueda (informacional/transaccional/navegacional)
2. Identifica entidades semánticas relacionadas (condiciones, tratamientos, médicos, ciudades)
3. Detecta las 5 preguntas más frecuentes sobre el tema
4. Crea estructura SEO con H1 único, mínimo 4 H2, H3 bajo cada H2
5. Escribe el contenido completo en Markdown (~${fields.longitud} palabras)
6. Incluye FAQs en formato ** Pregunta? ** Respuesta si opciones incluye faq
7. Incluye CTA al final si opciones incluye cta
8. Si tabla: añade tabla comparativa con columnas relevantes
9. Si summary: añade un bloque "Resumen ejecutivo" al inicio

ESTRUCTURA REQUERIDA DEL CONTENIDO:
# [H1 con keyword]

[Introducción 150+ palabras, primera mención de keyword natural]

## [H2 principal con keyword variante]

[Desarrollo 300+ palabras]

### [H3 específico]

[Contenido detallado]

[...más H2/H3...]

## Preguntas frecuentes (si faq activado)

**¿[Pregunta 1]?**
[Respuesta completa]

**¿[Pregunta 2]?**
[Respuesta completa]

[Al menos 5 FAQs]

## Conclusión

[CTA si activado: botón o párrafo de llamada a acción con WhatsApp/consulta]

---

REGLAS CRÍTICAS DE SEO:
- Keyword density entre 1-2.5% (no stuffing)
- Keyword en primer párrafo, en al menos 2 H2, en meta título
- Usar variantes semánticas y sinónimos naturalmente
- Mencionar ciudad al menos 3 veces en el contenido
- Incluir datos estadísticos o estudios médicos reales
- Usar lenguaje médico preciso pero accesible
- Cédula profesional y certificaciones mencionadas si aplica
- Longitud mínima: ${fields.longitud} palabras en el campo content

Devuelve SOLO JSON válido sin comentarios.`;
  };

  const handleGenerate = async () => {
    if (!fields.keyword) { toast.error("La keyword principal es obligatoria"); return; }
    if (!fields.specialty) { toast.error("La especialidad es obligatoria"); return; }
    setGenerating(true);
    setStep(0);

    // Simulate step progression
    const stepInterval = setInterval(() => {
      setStep(s => s < STEPS.length - 2 ? s + 1 : s);
    }, 4000);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        model: "claude_sonnet_4_6",
        prompt: buildPrompt(),
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            meta_title: { type: "string" },
            meta_description: { type: "string" },
            slug: { type: "string" },
            excerpt: { type: "string" },
            content: { type: "string" },
            secondary_keywords: { type: "string" },
            schema_type: { type: "string" },
            search_intent: { type: "string" },
            related_keywords: { type: "string" },
          }
        }
      });

      clearInterval(stepInterval);
      setStep(STEPS.length - 1);

      if (result.title) update("title", result.title);
      if (result.meta_title && opciones.meta_title) update("meta_title", result.meta_title);
      if (result.meta_description && opciones.meta_desc) update("meta_description", result.meta_description);
      if (result.slug) update("slug", result.slug);
      if (result.excerpt) update("excerpt", result.excerpt);
      if (result.content) update("content", result.content);
      if (result.secondary_keywords) update("secondary_keywords", result.secondary_keywords);
      if (result.schema_type && opciones.schema) update("schema_type", result.schema_type);
      update("primary_keyword", fields.keyword);
      update("category", fields.specialty);

      toast.success("Artículo generado exitosamente");
      setTimeout(onClose, 500);
    } catch (e) {
      clearInterval(stepInterval);
      toast.error("Error al generar: " + e.message);
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {generating && <GeneratingOverlay step={step} />}

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border/50 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-foreground">Generador IA de Artículos Médicos</h2>
              <p className="text-xs text-muted-foreground">SEO superior a Doctoralia y Top Doctors</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Estimaciones */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: <Clock className="w-4 h-4 text-blue-500" />, label: "Tiempo", value: est.time },
              { icon: <BarChart2 className="w-4 h-4 text-green-500" />, label: "SEO est.", value: `${est.seo}/100` },
              { icon: <Target className="w-4 h-4 text-amber-500" />, label: "Dificultad", value: est.difficulty },
              { icon: <Zap className="w-4 h-4 text-purple-500" />, label: "Calidad", value: `${est.quality}%` },
            ].map((item, i) => (
              <div key={i} className="bg-muted/40 rounded-xl p-3 text-center space-y-1">
                <div className="flex justify-center">{item.icon}</div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                <p className="text-sm font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Campos obligatorios */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FLabel>Keyword principal *</FLabel>
                <input value={fields.keyword} onChange={e => f("keyword", e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="mejores cardiólogos monterrey" />
              </div>
              <div>
                <FLabel>Ciudad *</FLabel>
                <input value={fields.city} onChange={e => f("city", e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Monterrey" />
              </div>
            </div>

            <div>
              <FLabel>Especialidad médica *</FLabel>
              <input value={fields.specialty} onChange={e => f("specialty", e.target.value)}
                className="w-full h-9 px-3 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Cardiología, Pediatría, Dermatología..." />
            </div>

            <div>
              <FLabel>Tipo de artículo</FLabel>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map(t => <Chip key={t} label={t} active={fields.type === t} onClick={() => f("type", t)} />)}
              </div>
            </div>

            <div>
              <FLabel>Objetivo del artículo</FLabel>
              <div className="flex flex-wrap gap-2">
                {OBJETIVOS.map(o => <Chip key={o} label={o} active={fields.objetivo === o} onClick={() => f("objetivo", o)} />)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FLabel>Longitud (palabras)</FLabel>
                <div className="flex gap-2">
                  {LONGITUDES.map(l => <Chip key={l} label={l} active={fields.longitud === l} onClick={() => f("longitud", l)} />)}
                </div>
              </div>
              <div>
                <FLabel>Tono</FLabel>
                <div className="flex flex-wrap gap-2">
                  {TONOS.map(t => <Chip key={t} label={t} active={fields.tono === t} onClick={() => f("tono", t)} />)}
                </div>
              </div>
            </div>
          </div>

          {/* Opciones avanzadas */}
          <div className="border border-border/50 rounded-xl overflow-hidden">
            <button type="button"
              onClick={() => setShowAdvanced(p => !p)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium">
              <span>Opciones avanzadas</span>
              {showAdvanced ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showAdvanced && (
              <div className="px-4 py-4 grid grid-cols-2 gap-2.5">
                {OPCIONES_AVANZADAS.map(op => (
                  <label key={op.key} className="flex items-center gap-2.5 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                      ${opciones[op.key] ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`}
                      onClick={() => toggleOp(op.key)}>
                      {opciones[op.key] && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors"
                      onClick={() => toggleOp(op.key)}>
                      {op.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Vista previa de estructura */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estructura que se generará</p>
            <div className="space-y-1.5 text-xs text-foreground font-mono">
              <p className="font-bold"># H1 → {fields.keyword || "keyword principal"} en {fields.city}</p>
              <p className="text-muted-foreground pl-2">Introducción con keyword en primer párrafo</p>
              <p className="font-semibold">## H2 → ¿Qué es / Por qué elegir / Tipos de...</p>
              <p className="text-muted-foreground pl-2">### H3 específico × 2-3</p>
              <p className="font-semibold">## H2 → {fields.specialty || "especialidad"} en {fields.city}</p>
              <p className="text-muted-foreground pl-2">### H3 específico × 2</p>
              <p className="font-semibold">## H2 → Cómo elegir / Cuándo consultar</p>
              {opciones.table && <p className="text-blue-600 pl-2">📊 Tabla comparativa</p>}
              {opciones.faq && <p className="font-semibold">## Preguntas frecuentes (5 FAQs)</p>}
              <p className="font-semibold">## Conclusión</p>
              {opciones.cta && <p className="text-green-600 pl-2">📢 CTA: Agenda tu consulta</p>}
            </div>
            <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground border-t border-border/30 mt-2">
              <span>~{fields.longitud} palabras</span>
              <span>·</span>
              <span>{Math.ceil(parseInt(fields.longitud) / 200)} min lectura</span>
              <span>·</span>
              <span>SEO estimado: <strong className="text-green-600">{est.seo}/100</strong></span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-border/50 px-6 py-4 flex gap-3 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} className="rounded-xl flex-1">
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={generating} className="rounded-xl flex-[2] gap-2">
            <Sparkles className="w-4 h-4" />
            Generar artículo con IA
          </Button>
        </div>
      </div>
    </div>
  );
}