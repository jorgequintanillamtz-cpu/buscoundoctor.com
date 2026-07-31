import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Stethoscope } from "lucide-react";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage,
} from "@/components/ui/breadcrumb";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

export default function ConditionsPage() {
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Condition.filter({ active: true }).then((list) => {
      setConditions(list.sort((a, b) => a.name.localeCompare(b.name, "es")));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    document.title = "Enfermedades: encuentra al especialista indicado | BuscoUnDoctor";
    setMeta("description", "Consulta las enfermedades y condiciones más buscadas y encuentra directamente al especialista que las atiende en Monterrey y San Pedro Garza García.");
  }, []);

  const popular = useMemo(() => conditions.filter((c) => c.popular), [conditions]);

  const byLetter = useMemo(() => {
    const map = {};
    for (const c of conditions) {
      const letter = (c.name[0] || "").toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(c);
    }
    return map;
  }, [conditions]);

  const availableLetters = ALPHABET.filter((l) => byLetter[l]?.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Stethoscope className="w-8 h-8 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Enfermedades</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">Enfermedades</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
          Busca la enfermedad o condición que te preocupa y te llevamos directo con los especialistas verificados que la atienden en Monterrey y San Pedro Garza García.
        </p>
      </div>

      {/* Más buscadas */}
      {popular.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-brand-blue" />
            <h2 className="font-heading font-bold text-base sm:text-lg text-brand-navy">Enfermedades más buscadas</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {popular.map((c) => (
              <Link
                key={c.id}
                to={`/enfermedades/${c.slug}`}
                className="inline-flex items-center gap-1.5 bg-brand-bluePale hover:bg-brand-blue hover:text-white text-brand-navy text-sm font-medium px-4 py-2 rounded-full transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Índice A-Z */}
      <section className="mb-8 sticky top-16 z-10 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 sm:mx-0 sm:px-0 border-y border-border/50 sm:border-none">
        <div className="flex flex-wrap gap-1.5">
          {ALPHABET.map((letter) => {
            const has = availableLetters.includes(letter);
            return has ? (
              <a
                key={letter}
                href={`#letra-${letter}`}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold bg-card border border-border/50 text-brand-navy hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-colors"
              >
                {letter}
              </a>
            ) : (
              <span
                key={letter}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold text-muted-foreground/30"
              >
                {letter}
              </span>
            );
          })}
        </div>
      </section>

      {/* Listado completo, agrupado A-Z */}
      <section className="space-y-8">
        {availableLetters.map((letter) => (
          <div key={letter} id={`letra-${letter}`} className="scroll-mt-32">
            <h2 className="font-heading font-bold text-lg text-brand-blue border-b border-border/50 pb-2 mb-3">{letter}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
              {byLetter[letter].map((c) => (
                <Link
                  key={c.id}
                  to={`/enfermedades/${c.slug}`}
                  className="group flex items-center gap-1.5 text-sm text-foreground hover:text-brand-blue transition-colors py-0.5"
                >
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA: ver por especialidad */}
      <div className="mt-12 bg-card border border-border/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="w-11 h-11 rounded-full bg-brand-bluePale flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-5 h-5 text-brand-blue" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading font-semibold text-sm text-foreground">¿No encuentras lo que buscas?</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Explora todas las especialidades disponibles en el directorio.</p>
        </div>
        <Link
          to="/especialistas"
          className="inline-flex items-center gap-2 bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors flex-shrink-0"
        >
          Ver especialidades
        </Link>
      </div>
    </div>
  );
}
