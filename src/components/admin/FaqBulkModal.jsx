import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, X, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ESPECIALIDADES = [
  "Cardiología", "Dermatología", "Pediatría", "Ginecología", "Oftalmología",
  "Ortopedia", "Urología", "Neurología", "Psiquiatría", "Gastroenterología",
  "Endocrinología", "Oncología", "Reumatología", "Otorrinolaringología", "Medicina General",
];

const CIUDADES = [
  "Monterrey", "San Pedro Garza García", "San Nicolás de los Garza",
  "Guadalupe", "Apodaca", "Escobedo", "Santa Catarina",
];

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default function FaqBulkModal({ onClose, onSuccess }) {
  const [selectedEsp, setSelectedEsp] = useState(new Set(ESPECIALIDADES));
  const [selectedCities, setSelectedCities] = useState(new Set(["Monterrey", "San Pedro Garza García"]));
  const [cantidad, setCantidad] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [results, setResults] = useState(null);

  const toggleEsp = (e) => setSelectedEsp(prev => { const s = new Set(prev); s.has(e) ? s.delete(e) : s.add(e); return s; });
  const toggleCity = (c) => setSelectedCities(prev => { const s = new Set(prev); s.has(c) ? s.delete(c) : s.add(c); return s; });
  const allEsp = selectedEsp.size === ESPECIALIDADES.length;
  const allCities = selectedCities.size === CIUDADES.length;

  const totalPages = selectedEsp.size * selectedCities.size;

  const handleBulkGenerate = async () => {
    if (!selectedEsp.size) { toast.error("Selecciona al menos una especialidad"); return; }
    if (!selectedCities.size) { toast.error("Selecciona al menos una ciudad"); return; }

    const combinations = [];
    for (const esp of selectedEsp) {
      for (const city of selectedCities) {
        combinations.push({ specialty: esp, city });
      }
    }

    setGenerating(true);
    setProgress({ done: 0, total: combinations.length, current: "" });
    let created = 0;
    let failed = 0;

    for (const combo of combinations) {
      setProgress(p => ({ ...p, current: `${combo.specialty} en ${combo.city}...` }));

      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Genera ${cantidad} FAQs SEO en español sobre ${combo.specialty} en ${combo.city}, México.
Incluye preguntas sobre costos, tratamientos, síntomas y ubicación.
Respuestas de 60-100 palabras, naturales y útiles.
Devuelve JSON con array "faqs": [{question, answer, category, primary_keyword, slug}]`,
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
                    slug: { type: "string" },
                  }
                }
              }
            }
          }
        });

        const faqs = result?.faqs || [];
        if (faqs.length) {
          const pageSlug = `${slugify(combo.specialty)}-${slugify(combo.city)}`;
          const schemaJson = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(f => ({
              "@type": "Question",
              "name": f.question,
              "acceptedAnswer": { "@type": "Answer", "text": f.answer }
            }))
          });

          const page = await base44.entities.FaqPage.create({
            specialty: combo.specialty,
            city: combo.city,
            title: `Preguntas frecuentes sobre ${combo.specialty} en ${combo.city}`,
            slug: pageSlug,
            meta_title: `${cantidad} FAQs: ${combo.specialty} en ${combo.city}`,
            meta_description: `Resuelve tus dudas sobre ${combo.specialty} en ${combo.city}. Preguntas frecuentes sobre costos, tratamientos y más.`,
            schema_json: schemaJson,
            status: "borrador",
            faq_count: faqs.length,
          });

          await Promise.all(faqs.map((f, idx) =>
            base44.entities.FaqItem.create({
              faq_page_id: page.id,
              specialty: combo.specialty,
              city: combo.city,
              question: f.question,
              answer: f.answer,
              category: f.category || "General",
              primary_keyword: f.primary_keyword || "",
              slug: f.slug || slugify(f.question).slice(0, 80),
              meta_title: `${f.question} | ${combo.specialty} ${combo.city}`,
              meta_description: f.answer.slice(0, 155),
              position: idx,
              status: "borrador",
            })
          ));
          created++;
        }
      } catch {
        failed++;
      }

      setProgress(p => ({ ...p, done: p.done + 1 }));
    }

    setResults({ created, failed, totalFaqs: created * cantidad });
    setGenerating(false);
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 className="font-heading font-bold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Generación Masiva de FAQs
          </h2>
          {!generating && !results && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {results ? (
          <div className="px-6 py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="font-heading font-bold text-xl text-foreground">¡Generación completada!</p>
              <p className="text-muted-foreground mt-1">Se crearon <strong>{results.created}</strong> páginas con <strong>~{results.totalFaqs}</strong> FAQs en total</p>
              {results.failed > 0 && <p className="text-sm text-amber-600 mt-1">{results.failed} combinaciones fallaron</p>}
            </div>
            <Button onClick={onSuccess} className="rounded-xl mt-2">Ver FAQs generadas</Button>
          </div>
        ) : generating ? (
          <div className="px-6 py-10 space-y-5">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
              <p className="font-heading font-semibold text-foreground">{progress.current || "Iniciando..."}</p>
              <p className="text-sm text-muted-foreground mt-1">{progress.done} / {progress.total} páginas</p>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">{pct}% completado · Esto puede tardar varios minutos</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
            {/* Especialidades */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Especialidades</label>
                <button onClick={() => setSelectedEsp(allEsp ? new Set() : new Set(ESPECIALIDADES))}
                  className="text-xs text-primary hover:underline">
                  {allEsp ? "Deseleccionar todas" : "Seleccionar todas"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ESPECIALIDADES.map(e => (
                  <button key={e} onClick={() => toggleEsp(e)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${selectedEsp.has(e) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/40"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Ciudades */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ciudades</label>
                <button onClick={() => setSelectedCities(allCities ? new Set() : new Set(CIUDADES))}
                  className="text-xs text-primary hover:underline">
                  {allCities ? "Deseleccionar todas" : "Seleccionar todas"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {CIUDADES.map(c => (
                  <button key={c} onClick={() => toggleCity(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${selectedCities.has(c) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/40"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Cantidad */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">FAQs por página</label>
              <div className="flex gap-2">
                {[10, 20, 30].map(n => (
                  <button key={n} onClick={() => setCantidad(n)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${cantidad === n ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
              <p className="font-semibold text-amber-800 mb-1">Resumen de generación</p>
              <p className="text-amber-700">
                {selectedEsp.size} especialidades × {selectedCities.size} ciudades = <strong>{totalPages} páginas</strong>
              </p>
              <p className="text-amber-700">~{totalPages * cantidad} FAQs totales</p>
              <p className="text-amber-600 text-xs mt-1.5">⚠️ Este proceso puede tardar {Math.ceil(totalPages * 0.5)} minutos aprox.</p>
            </div>
          </div>
        )}

        {!generating && !results && (
          <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleBulkGenerate} className="rounded-xl gap-2 bg-amber-500 hover:bg-amber-600 text-white border-amber-500">
              <Zap className="w-4 h-4" />
              Generar {totalPages} páginas
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}