import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Stethoscope, HeartPulse, Activity, Cigarette, Dna, ClipboardList, ShieldAlert, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { recommendCheckups, URGENCY_LEVELS } from "@/lib/healthCheckups";
import { slugify } from "@/lib/citySlug";
import CheckupDonut from "@/components/CheckupDonut";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

const URGENCY_STYLES = {
  alta: "bg-red-50 text-red-700 border-red-200",
  media: "bg-amber-50 text-amber-700 border-amber-200",
  baja: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const URGENCY_BORDER = {
  alta: "border-l-red-500",
  media: "border-l-amber-500",
  baja: "border-l-emerald-500",
};

const DONUT_CONFIG = {
  alta: { color: "#ef4444", label: "Prioridad alta" },
  media: { color: "#f59e0b", label: "Prioridad media" },
  baja: { color: "#10b981", label: "Prioridad baja" },
};

export default function ChequeosMedicos() {
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [activity, setActivity] = useState("");
  const [smokes, setSmokes] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");
  const [chronic, setChronic] = useState("no");
  const [city, setCity] = useState("Monterrey");
  const [zones, setZones] = useState([]);

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState({});

  useEffect(() => {
    base44.entities.Zone.filter({ active: true })
      .then((list) => setZones(list.map((z) => z.name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.title = "Calculadora de estudios médicos por edad | BuscoUnDoctor";
    setMeta("description", "Calculadora interactiva de chequeos médicos preventivos según tu edad, sexo y factores de riesgo. Descubre qué estudios hacer, con qué frecuencia y encuentra al especialista verificado en Monterrey y San Pedro.");
    setMeta("robots", "index, follow");

    const ld = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Calculadora de chequeos médicos por edad",
      "applicationCategory": "HealthApplication",
      "operatingSystem": "Web",
      "description": "Herramienta orientativa que recomienda estudios y chequeos médicos preventivos según la edad, el sexo y los factores de riesgo del usuario, y lo conecta con especialistas verificados.",
      "url": "https://buscoundoctor.com/chequeos-medicos",
      "publisher": { "@type": "Organization", "name": "BuscoUnDoctor" },
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "chequeos-jsonld";
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => { document.getElementById("chequeos-jsonld")?.remove(); };
  }, []);

  const citySlug = slugify(city);

  const results = useMemo(() => {
    if (!submitted) return [];
    const ageNum = parseInt(age, 10);
    if (!ageNum || !sex || !activity || !smokes || !familyHistory) return [];
    return recommendCheckups({
      age: ageNum,
      sex,
      activity,
      smokes: smokes === "si",
      familyHistory: familyHistory === "si",
      chronic: chronic === "si",
    });
  }, [submitted, age, sex, activity, smokes, familyHistory, chronic]);

  const counts = useMemo(() => {
    return ["alta", "media", "baja"].map((cat) => {
      const items = results.filter((r) => r.urgency === cat);
      return {
        cat,
        total: items.length,
        completed: items.filter((r) => done[r.key]).length,
      };
    });
  }, [results, done]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const ageNum = parseInt(age, 10);
    if (!ageNum || ageNum < 1 || ageNum > 120) {
      setError("Ingresa una edad válida (entre 1 y 120 años).");
      setSubmitted(false);
      return;
    }
    if (!sex || !activity || !smokes || !familyHistory) {
      setError("Completa todos los campos obligatorios para ver tus recomendaciones.");
      setSubmitted(false);
      return;
    }
    setError("");
    setDone({});
    setSubmitted(true);
  };

  const reset = () => {
    setSubmitted(false);
    setError("");
    setDone({});
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Calculadora de estudios médicos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Encabezado compacto */}
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 bg-brand-bluePale text-brand-navy text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Herramienta interactiva
        </div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl lg:text-4xl text-foreground leading-tight">
          Calculadora de Estudios Médicos por Edad
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Responde y descubre tus chequeos recomendados al instante.
        </p>
      </div>

      {/* Calculadora */}
      <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-lg shadow-brand-navy/5 border border-border/50 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-brand-navy to-brand-blue px-5 sm:px-7 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-white text-base sm:text-lg leading-tight">Tu perfil de salud</h2>
            <p className="text-white/70 text-xs">Completa los campos y obtén tu plan de chequeos</p>
          </div>
        </div>
        <div className="p-5 sm:p-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Edad <span className="text-destructive">*</span></label>
            <Input
              type="number"
              min="1"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Ej. 35"
              inputMode="numeric"
              className="h-11 rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Sexo <span className="text-destructive">*</span></label>
            <Select value={sex} onValueChange={setSex}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="femenino">Femenino</SelectItem>
                <SelectItem value="masculino">Masculino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-brand-blue" /> Actividad física <span className="text-destructive">*</span>
            </label>
            <Select value={activity} onValueChange={setActivity}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentario">Sedentario (poco o nulo ejercicio)</SelectItem>
                <SelectItem value="moderado">Moderado (3-4 veces por semana)</SelectItem>
                <SelectItem value="activo">Activo (casi todos los días)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5">
              <Cigarette className="w-3.5 h-3.5 text-brand-blue" /> ¿Fumas actualmente? <span className="text-destructive">*</span>
            </label>
            <Select value={smokes} onValueChange={setSmokes}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5">
              <Dna className="w-3.5 h-3.5 text-brand-blue" /> Antecedentes familiares directos (cardiovasculares, diabetes o cáncer) <span className="text-destructive">*</span>
            </label>
            <Select value={familyHistory} onValueChange={setFamilyHistory}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-brand-blue" /> ¿Tienes diabetes o hipertensión diagnosticada?
            </label>
            <Select value={chronic} onValueChange={setChronic}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="si">Sí</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Ciudad donde buscas especialista</label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(zones.length ? zones : ["Monterrey", "San Pedro Garza García"]).map((z) => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive mt-4">{error}</p>
        )}

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <Button type="submit" className="h-11 rounded-xl bg-brand-navy hover:bg-brand-navy/90 text-base">
            <ClipboardList className="w-4 h-4" />
            Ver mis chequeos recomendados
          </Button>
          {submitted && (
            <Button type="button" variant="outline" onClick={reset} className="h-11 rounded-xl">
              Calcular de nuevo
            </Button>
          )}
        </div>
        </div>
      </form>

      {/* Aviso importante (debajo de la calculadora) */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
          <strong>Aviso importante:</strong> esta herramienta es orientativa y educativa, no sustituye una consulta médica ni constituye un diagnóstico. Las recomendaciones son generales y deben confirmarse con un médico, quien evaluará tu historial completo y ajustará los estudios a tu caso particular.
        </p>
      </div>

      {/* Resultados */}
      {submitted && results.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="w-5 h-5 text-brand-blue" />
            <h2 className="font-heading font-bold text-lg sm:text-xl text-brand-navy">
              Estudios recomendados para tu perfil
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            {results.length} chequeo{results.length !== 1 ? "s" : ""} sugerido{results.length !== 1 ? "s" : ""} según tus respuestas. Marca los que ya te hayas hecho para llevar tu progreso.
          </p>

          {/* Resumen rápido con donas por urgencia */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 sm:p-6 mb-5">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {counts.map((c) => (
                <CheckupDonut
                  key={c.cat}
                  total={c.total}
                  completed={c.completed}
                  color={DONUT_CONFIG[c.cat].color}
                  label={DONUT_CONFIG[c.cat].label}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Marca los estudios de la lista para actualizar tu progreso
            </p>
          </div>

          <div className="space-y-3">
            {results.map((r) => {
              const isDone = !!done[r.key];
              return (
                <div key={r.key} className={`bg-card border border-border/50 border-l-4 ${URGENCY_BORDER[r.urgency]} rounded-2xl p-4 sm:p-5 hover:shadow-md transition-all ${isDone ? "opacity-60" : ""}`}>
                  <div className="flex gap-3 sm:gap-4">
                    <Checkbox
                      checked={isDone}
                      onCheckedChange={(v) => setDone((d) => ({ ...d, [r.key]: !!v }))}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <h3 className={`font-heading font-semibold text-foreground ${isDone ? "line-through" : ""}`}>{r.name}</h3>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${URGENCY_STYLES[r.urgency]}`}>
                              {URGENCY_LEVELS[r.urgency].label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-2">{r.why}</p>
                          <p className="text-xs text-foreground">
                            <span className="font-medium text-brand-navy">Frecuencia:</span> {r.frequency}
                          </p>
                        </div>
                        <Link
                          to={`/${r.specialty.profession_slug}/${citySlug}`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:text-brand-navy whitespace-nowrap sm:mt-1"
                        >
                          Ver {r.specialty.name}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA intermedio */}
      <div className="bg-brand-navy rounded-2xl p-6 sm:p-7 text-center mb-10">
        <h2 className="font-heading font-bold text-xl text-white mb-2">¿Ya sabes qué estudio necesitas?</h2>
        <p className="text-white/80 text-sm mb-4 max-w-xl mx-auto">
          Busca directamente al especialista verificado en tu ciudad y agenda tu consulta por WhatsApp.
        </p>
        <Link
          to="/especialistas"
          className="inline-flex items-center gap-2 bg-white text-brand-navy text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-brand-bluePale transition-colors"
        >
          Explorar el directorio
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Contenido estático indexable (abajo) */}
      <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground mb-8">
        <p>
          La medicina preventiva es la forma más eficaz de cuidar la salud a largo plazo. Muchas enfermedades crónicas —como hipertensión, diabetes, dislipidemias y varios tipos de cáncer— se desarrollan de forma silenciosa durante años antes de provocar síntomas. Realizar los <strong>estudios médicos de tamizaje adecuados para tu edad y sexo</strong> permite detectarlas en etapas tempranas, cuando el tratamiento es más efectivo y, en muchos casos, todavía reversible.
        </p>
        <p>
          Esta calculadora de chequeos médicos toma en cuenta tu edad, sexo, nivel de actividad física, tabaquismo, antecedentes familiares y condiciones crónicas para construir una lista orientativa de estudios preventivos. Cada recomendación indica por qué importa el estudio, con qué frecuencia conviene repetirlo y qué tan prioritario es para tu perfil, ajustando la urgencia según los factores de riesgo que reportes.
        </p>
        <h2 className="font-heading font-bold text-xl text-foreground">¿Por qué importan los chequeos médicos preventivos?</h2>
        <p>
          Los chequeos preventivos no son lo mismo que ir al médico cuando algo duele. Su objetivo es identificar factores de riesgo y signos tempranos de enfermedad en personas que se sienten sanas. La presión arterial alta, el colesterol elevado, la glucosa en ayuno alterada o un pólipo en el colon rara vez producen síntomas al principio, y precisamente ahí radica su peligro: cuando el cuerpo avisa, muchas veces la enfermedad ya está instalada.
        </p>
        <p>
          Las guías internacionales recomiendan un conjunto de estudios de tamizaje según la edad y el sexo, pero la frecuencia y el punto de partida cambian según los <strong>factores de riesgo personales</strong>. Una persona sedentaria con antecedentes familiares de diabetes debe vigilar su glucosa con más frecuencia que la línea base; un fumador con historial cardiovascular en la familia necesita controlar su presión y corazón antes y con mayor rigor. Por eso esta calculadora ajusta cada recomendación a tu perfil en lugar de entregar una lista genérica.
        </p>
        <h3 className="font-heading font-semibold text-lg text-foreground">¿Con qué frecuencia debo hacerme estudios médicos?</h3>
        <p>
          Como regla general, los adultos sanos conviene que revisen su presión arterial, glucosa y perfil de lípidos al menos una vez al año a partir de los 40 años (o antes si hay factores de riesgo). Las mujeres deben iniciar el Papanicolaou a los 21 años y la mastografía a los 40, mientras que los hombres deben considerar el PSA a partir de los 50. La colonoscopía se recomienda a partir de los 45-50 años para ambos sexos. Estas son referencias generales: el médico de cabecera es quien debe personalizar el plan según tu historial.
        </p>
      </div>

      {/* Recordatorio final */}
      <div className="flex items-start gap-3 bg-brand-bluePale rounded-2xl p-4">
        <CheckCircle2 className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-brand-navy leading-relaxed">
          Recuerda: los resultados de esta calculadora son una guía orientativa basada en recomendaciones generales de medicina preventiva. Solo un médico puede confirmar qué estudios necesitas, interpretar los resultados y definir el tratamiento adecuado.
        </p>
      </div>
    </div>
  );
}