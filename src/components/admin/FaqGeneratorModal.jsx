import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CIUDADES = [
  "Monterrey", "San Pedro Garza García", "San Nicolás de los Garza",
  "Guadalupe", "Apodaca", "Escobedo", "Santa Catarina",
];

const TIPOS = [
  { key: "costos", label: "Costos" },
  { key: "tratamientos", label: "Tratamientos" },
  { key: "sintomas", label: "Síntomas" },
  { key: "procedimientos", label: "Procedimientos" },
  { key: "seguros", label: "Seguros médicos" },
  { key: "estudios", label: "Estudios médicos" },
  { key: "prevencion", label: "Prevención" },
  { key: "comparativas", label: "Comparativas" },
  { key: "ubicacion", label: "Ubicación" },
  { key: "urgencias", label: "Urgencias" },
];

const CANTIDADES = [10, 20, 30, 50];

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

const STEPS = [
  "Configurando parámetros SEO...",
  "Generando preguntas con IA...",
  "Optimizando respuestas...",
  "Creando keywords y slugs...",
  "Generando Schema FAQPage...",
  "Guardando en base de datos...",
];

export default function FaqGeneratorModal({ onClose, onSuccess }) {
  const [especialidades, setEspecialidades] = useState([]);
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState(CIUDADES[0]);
  const [cantidad, setCantidad] = useState(20);
  const [tipos, setTipos] = useState({ costos: true, tratamientos: true, sintomas: true, procedimientos: true, seguros: false, estudios: false, prevencion: true, comparativas: false, ubicacion: true, urgencias: false });
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    base44.entities.Specialty.filter({ active: true }).then((list) => {
      const names = list.map((s) => s.name).sort((a, b) => a.localeCompare(b, "es"));
      setEspecialidades(names);
      if (names.length) setSpecialty((prev) => prev || names[0]);
    }).catch(() => {});
  }, []);

  const toggleTipo = (key) => setTipos(p => ({ ...p, [key]: !p[key] }));
  const selectedTypes = TIPOS.filter(t => tipos[t.key]).map(t => t.label);

  const handleGenerate = async () => {
    if (!selectedTypes.length) { toast.error("Selecciona al menos un tipo de pregunta"); return; }
    setGenerating(true);
    setStep(0);

    // Simulate step progress
    const stepInterval = setInterval(() => {
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    }, 1800);

    try {
      const specialtySlug = slugify(specialty);
      const citySlug = slugify(city);
      const pageSlug = `${specialtySlug}-${citySlug}`;

      const result = await base44.integrations.Core.InvokeLLM({
        model: "claude_sonnet_4_6",
        prompt: `Eres un experto en SEO médico para México. Genera exactamente ${cantidad} FAQs únicas y detalladas en español para:
- Especialidad: ${specialty}
- Ciudad: ${city}
- Tipos de preguntas a incluir: ${selectedTypes.join(", ")}

Requisitos SEO:
- Cada pregunta debe ser una búsqueda real que alguien haría en Google México
- Las respuestas deben ser informativas, de 80-150 palabras, naturales y útiles
- Incluir la ciudad "${city}" y la especialidad naturalmente en algunas preguntas
- Keywords locales (${city}, Monterrey, México cuando aplique)
- Variedad en los tipos: costos, tratamientos, síntomas, procedimientos, seguros, etc.

Devuelve JSON con array "faqs" donde cada item tiene:
- question: la pregunta completa
- answer: respuesta detallada de 80-150 palabras
- category: tipo de pregunta (de: ${selectedTypes.join(", ")})
- primary_keyword: keyword principal de búsqueda (3-5 palabras)
- secondary_keywords: 3 keywords secundarias separadas por comas
- slug: slug URL amigable para la pregunta específica`,
        response_json_schema: {
          type: "object",
          properties: {
            faqs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" },
                  category: { type: "string" },
                  primary_keyword: { type: "string" },
                  secondary_keywords: { type: "string" },
                  slug: { type: "string" },
                }
              }
            }
          }
        }
      });

      clearInterval(stepInterval);
      setStep(5);

      const faqs = result?.faqs || [];
      if (!faqs.length) throw new Error("No se generaron FAQs");

      // Build Schema FAQPage JSON-LD
      const schemaJson = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.question,
          "acceptedAnswer": { "@type": "Answer", "text": f.answer }
        }))
      });

      // Create or update FaqPage
      const specialistSlug = slugify(specialty.replace("ología", "ólogo").replace("ría", "ro").replace("iatría", "iatra"));
      const title = `Preguntas frecuentes sobre ${specialty} en ${city}`;
      const metaTitle = `${cantidad} Preguntas frecuentes: ${specialty} en ${city} | FAQs`;
      const metaDescription = `Resuelve tus dudas sobre ${specialty} en ${city}. ${cantidad} preguntas frecuentes sobre costos, tratamientos, síntomas y más.`;

      const page = await base44.entities.FaqPage.create({
        specialty,
        city,
        title,
        slug: pageSlug,
        meta_title: metaTitle,
        meta_description: metaDescription,
        schema_json: schemaJson,
        status: "borrador",
        faq_count: faqs.length,
      });

      // Create all FaqItems
      await Promise.all(faqs.map((f, idx) =>
        base44.entities.FaqItem.create({
          faq_page_id: page.id,
          specialty,
          city,
          question: f.question,
          answer: f.answer,
          category: f.category || selectedTypes[0],
          primary_keyword: f.primary_keyword || "",
          secondary_keywords: f.secondary_keywords || "",
          slug: f.slug || slugify(f.question).slice(0, 80),
          meta_title: `${f.question} | ${specialty} ${city}`,
          meta_description: f.answer.slice(0, 155),
          position: idx,
          status: "borrador",
        })
      ));

      toast.success(`¡${faqs.length} FAQs generadas exitosamente!`);
      onSuccess();
    } catch (e) {
      clearInterval(stepInterval);
      toast.error("Error al generar: " + e.message);
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 className="font-heading font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Crear FAQs SEO con IA
          </h2>
          {!generating && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {generating ? (
          <div className="px-6 py-10 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground text-lg">Generando FAQs...</p>
              <p className="text-sm text-muted-foreground mt-1">{specialty} · {city} · {cantidad} preguntas</p>
            </div>
            <div className="space-y-2 text-left max-w-xs mx-auto">
              {STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm transition-all ${i <= step ? "text-foreground" : "text-muted-foreground/40"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${i < step ? "bg-green-500" : i === step ? "bg-primary animate-pulse" : "bg-muted"}`}>
                    {i < step ? (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <span className="text-[10px] text-white font-bold">{i + 1}</span>
                    )}
                  </div>
                  {s}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Especialidad + Ciudad */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Especialidad</label>
                <select value={specialty} onChange={e => setSpecialty(e.target.value)}
                  className="w-full text-sm border border-input rounded-xl px-3 py-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                  {especialidades.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Ciudad</label>
                <select value={city} onChange={e => setCity(e.target.value)}
                  className="w-full text-sm border border-input rounded-xl px-3 py-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                  {CIUDADES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Cantidad */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Cantidad de preguntas</label>
              <div className="flex gap-2">
                {CANTIDADES.map(n => (
                  <button key={n} type="button" onClick={() => setCantidad(n)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${cantidad === n ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipos */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Tipos de preguntas</label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(t => (
                  <label key={t.key} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${tipos[t.key] ? "bg-primary/5 border-primary/30 text-foreground" : "bg-background border-border text-muted-foreground hover:border-primary/20"}`}>
                    <input type="checkbox" checked={tipos[t.key]} onChange={() => toggleTipo(t.key)} className="accent-primary" />
                    <span className="text-sm">{t.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{selectedTypes.length} tipo(s) seleccionado(s)</p>
            </div>

            {/* Preview */}
            <div className="bg-muted/30 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">Vista previa de URL:</p>
              <p className="font-mono">/faq/{slugify(specialty)}-{slugify(city)}</p>
              <p className="font-mono text-muted-foreground/60">/faq/{slugify(specialty)}-{slugify(city)}/[slug-pregunta]</p>
            </div>
          </div>
        )}

        {!generating && (
          <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleGenerate} className="rounded-xl gap-2">
              <Sparkles className="w-4 h-4" />
              Generar {cantidad} FAQs con IA
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}