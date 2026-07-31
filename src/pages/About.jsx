import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Search, Shield, Users, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { setOpenGraph, SITE_OG } from "@/lib/seoMeta";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

export default function About() {
  // Título/descripción/OG propios de la página. El canonical ya lo pone
  // Layout automáticamente en cada cambio de ruta (/nosotros).
  useEffect(() => {
    const title = "Nosotros | BuscoUnDoctor — Directorio Médico en Monterrey";
    const description = "Conoce BuscoUnDoctor: el directorio que conecta pacientes con especialistas verificados en Monterrey y San Pedro Garza García, de forma gratuita y sin intermediarios.";
    document.title = title;
    setMeta("description", description);
    setOpenGraph({ title, description, image: SITE_OG.image });
  }, []);

  // JSON-LD AboutPage + Organization: refuerza quién es BuscoUnDoctor y qué
  // ciudades atiende como dato estructurado, no solo como texto en la página.
  useEffect(() => {
    const ld = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "Nosotros | BuscoUnDoctor",
      "url": "https://buscoundoctor.com/nosotros",
      "mainEntity": {
        "@type": "Organization",
        "name": "BuscoUnDoctor",
        "url": "https://buscoundoctor.com",
        "description": "Directorio médico que conecta pacientes con especialistas verificados en Monterrey y San Pedro Garza García.",
        "areaServed": [
          { "@type": "City", "name": "Monterrey" },
          { "@type": "City", "name": "San Pedro Garza García" },
        ],
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Monterrey",
          "addressRegion": "Nuevo León",
          "addressCountry": "MX",
        },
      },
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "about-page-jsonld";
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Nosotros</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="bg-white rounded-3xl border border-border/50 shadow-sm p-6 sm:p-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 bg-brand-bluePale text-brand-navy text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3 h-3" />
            Nosotros
          </span>
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground leading-tight">
            El directorio médico de confianza en <span className="text-brand-blue">Monterrey</span>
          </h1>
        </div>

        <div className="max-w-3xl mx-auto">
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            <strong className="text-foreground">BuscoUnDoctor.com</strong> es el directorio médico de referencia en Monterrey y San Pedro Garza García, Nuevo León, diseñado para conectar a pacientes con los mejores especialistas de salud de la región de forma rápida, confiable y completamente gratuita.
          </p>

          <p className="text-base text-muted-foreground leading-relaxed mb-6">
            Sabemos lo difícil que puede ser encontrar al médico adecuado cuando más se necesita. Por eso construimos una plataforma donde puedes buscar doctores por especialidad, zona o nombre, leer reseñas reales de otros pacientes y contactar directamente al especialista a través de WhatsApp o correo electrónico, sin intermediarios ni largas esperas.
          </p>

          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            Nuestro directorio incluye médicos generales, psicólogos, ginecólogos, pediatras, dentistas, cardiólogos y muchas especialidades más. Cada perfil es verificado y mantenido actualizado para garantizar que la información que ves sea precisa y útil al momento de tomar una decisión sobre tu salud.
          </p>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10 max-w-3xl mx-auto">
        <div className="bg-card border border-border/50 rounded-2xl p-6 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground mb-1">Búsqueda fácil</h2>
            <p className="text-sm text-muted-foreground">Encuentra especialistas por nombre, especialidad o zona de Monterrey en segundos.</p>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-6 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground mb-1">Perfiles verificados</h2>
            <p className="text-sm text-muted-foreground">Cada médico listado cuenta con cédula profesional y datos de contacto verificados.</p>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-6 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground mb-1">Reseñas de pacientes</h2>
            <p className="text-sm text-muted-foreground">Lee opiniones auténticas de otros pacientes para elegir con confianza.</p>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-6 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground mb-1">Gratis para pacientes</h2>
            <p className="text-sm text-muted-foreground">El uso del directorio es completamente gratuito para todos los pacientes que lo consultan.</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <p className="text-base text-muted-foreground leading-relaxed mb-6">
          BuscoUnDoctor.com es desarrollado y mantenido por un equipo local de Monterrey apasionado por mejorar el acceso a la salud en México. Creemos que encontrar un buen médico no debería ser complicado, y trabajamos todos los días para que esa búsqueda sea lo más sencilla posible.
        </p>

        <p className="text-base text-muted-foreground leading-relaxed">
          ¿Eres médico o especialista y quieres aparecer en nuestro directorio?{" "}
          <Link to="/contacto" className="text-primary hover:underline font-medium">Contáctanos</Link>{" "}
          y con gusto te ayudamos a crear tu perfil.
        </p>
      </div>
      </div>

      {/* CTA final */}
      <section className="relative bg-brand-navy rounded-3xl overflow-hidden p-6 sm:p-8 mt-8">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-blue/20 rounded-full pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-center gap-5 justify-between text-center sm:text-left">
          <div>
            <h2 className="font-heading font-bold text-lg sm:text-xl text-white">
              ¿Listo para encontrar a tu especialista?
            </h2>
            <p className="text-white/70 text-sm mt-1.5 max-w-md">
              Compara perfiles verificados en Monterrey y San Pedro Garza García, y contacta directo por WhatsApp.
            </p>
          </div>
          <Button size="lg" variant="secondary" className="bg-white text-brand-navy hover:bg-white/90 font-heading font-semibold flex-shrink-0 gap-2" asChild>
            <Link to="/especialistas">
              Ver especialistas <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}