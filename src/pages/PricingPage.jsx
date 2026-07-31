import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Check, Sparkles, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setOpenGraph } from "@/lib/seoMeta";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

const formatPrice = (value, currency) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: currency || "MXN", maximumFractionDigits: 0 }).format(value || 0);

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState("monthly"); // monthly | yearly

  useEffect(() => {
    let active = true;
    base44.entities.Plan.filter({ active: true }, "display_order").then((rows) => {
      if (active) { setPlans(rows); setLoading(false); }
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // Solo tiene sentido mostrar el switch mensual/anual si al menos un plan
  // de pago ofrece precio anual.
  const hasYearlyOption = useMemo(() => plans.some((p) => (p.price_monthly || 0) > 0 && (p.price_yearly || 0) > 0), [plans]);

  useEffect(() => {
    document.title = "Planes y precios para médicos | BuscoUnDoctor";
    setMeta("description", "Planes para médicos en BuscoUnDoctor: uno Gratis para aparecer en el directorio y uno Premium con todas las funciones. Sin contratos, cancela cuando quieras.");
  }, []);

  // El Open Graph se sobreescribe recién cuando ya hay datos (no en el mount
  // inicial): Layout aplica los valores por defecto del sitio de forma
  // síncrona al montar, así que si esto corriera antes, Layout lo pisaría de
  // vuelta. Al depender de "plans" (que llega tras el fetch async), esta
  // llamada queda garantizada después de ese efecto de Layout.
  useEffect(() => {
    if (loading || plans.length === 0) return;
    setOpenGraph({
      title: "Planes y precios para médicos | BuscoUnDoctor",
      description: "Planes para médicos en BuscoUnDoctor: uno Gratis para aparecer en el directorio y uno Premium con todas las funciones.",
    });
  }, [loading, plans]);

  useEffect(() => {
    if (loading || plans.length === 0) return;
    const ORIGIN = "https://buscoundoctor.com";
    const ld = {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Perfil de médico en BuscoUnDoctor",
      "description": "Directorio de médicos en Monterrey y San Pedro Garza García. Planes Gratis y Premium para especialistas.",
      "provider": { "@type": "Organization", "name": "BuscoUnDoctor", "url": ORIGIN },
      "url": `${ORIGIN}/planes`,
      "offers": plans.map((p) => ({
        "@type": "Offer",
        "name": p.name,
        "price": String(p.price_monthly || 0),
        "priceCurrency": p.currency || "MXN",
        "url": `${ORIGIN}/planes`,
      })),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "pricing-jsonld";
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [loading, plans]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground tracking-tight">
          Planes simples y transparentes
        </h1>
        <p className="text-base text-muted-foreground mt-3">
          Sin contratos. Cancela cuando quieras.
        </p>

        {hasYearlyOption && (
          <div className="inline-flex items-center bg-muted rounded-full p-1 mt-7">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide uppercase transition-colors ${billing === "monthly" ? "bg-brand-blue text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide uppercase transition-colors ${billing === "yearly" ? "bg-brand-blue text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Anual
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
        </div>
      ) : plans.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">Los planes estarán disponibles muy pronto.</p>
      ) : (
        <div className="flex flex-col lg:flex-row lg:items-center justify-center gap-6 lg:gap-0">
          {plans.map((plan) => {
            const isFree = (plan.price_monthly || 0) === 0;
            const showYearly = billing === "yearly" && (plan.price_yearly || 0) > 0;
            const priceValue = isFree ? 0 : showYearly ? plan.price_yearly : plan.price_monthly;
            const period = isFree ? "" : showYearly ? "/año" : "/mes";

            return (
              <div
                key={plan.id}
                className={`relative flex-1 lg:max-w-sm rounded-3xl p-8 ${
                  plan.is_featured
                    ? "bg-brand-blue text-white shadow-xl lg:scale-105 lg:z-10"
                    : "bg-card border border-border/50"
                }`}
              >
                {plan.is_featured && (
                  <span className="absolute top-6 right-6 bg-white/20 text-white text-[10px] font-bold tracking-wide uppercase px-3 py-1 rounded-full">
                    Más popular
                  </span>
                )}

                <div className="mb-1">
                  {isFree ? (
                    <span className="font-heading font-extrabold text-4xl">Gratis</span>
                  ) : (
                    <>
                      <span className="font-heading font-extrabold text-4xl">{formatPrice(priceValue, plan.currency)}</span>
                      <span className={`text-sm font-medium ml-1 ${plan.is_featured ? "text-white/70" : "text-muted-foreground"}`}>{period}</span>
                    </>
                  )}
                </div>

                <h2 className="font-heading font-bold text-xl mt-3">{plan.name}</h2>
                {plan.tagline && (
                  <p className={`text-sm mt-1.5 leading-relaxed ${plan.is_featured ? "text-white/80" : "text-muted-foreground"}`}>
                    {plan.tagline}
                  </p>
                )}

                {plan.features?.length > 0 && (
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.is_featured ? "bg-white/20" : "bg-brand-bluePale"}`}>
                          <Check className={`w-3 h-3 ${plan.is_featured ? "text-white" : "text-brand-blue"}`} />
                        </span>
                        <span className={plan.is_featured ? "text-white/90" : "text-foreground"}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  asChild
                  className={`w-full min-h-[44px] rounded-xl mt-8 font-semibold ${
                    plan.is_featured ? "bg-white text-brand-blue hover:bg-white/90" : ""
                  }`}
                  variant={plan.is_featured ? undefined : "outline"}
                >
                  <Link to={plan.cta_url || "/registro-medico"}>{plan.cta_label || "Empezar"}</Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-brand-navy rounded-3xl px-6 py-10 sm:p-12 text-center mt-16">
        <Sparkles className="w-8 h-8 text-brand-blue mx-auto mb-4" />
        <h2 className="font-heading font-bold text-2xl text-white">¿Listo para que más pacientes te encuentren?</h2>
        <p className="text-white/70 mt-2 max-w-lg mx-auto">
          Crea tu perfil gratis en minutos. Puedes actualizar a Premium cuando quieras.
        </p>
        <Button asChild className="rounded-xl mt-6 min-h-[44px] px-8 bg-white text-brand-navy hover:bg-white/90 font-semibold">
          <Link to="/registro-medico">Crear mi perfil</Link>
        </Button>
      </div>
    </div>
  );
}
