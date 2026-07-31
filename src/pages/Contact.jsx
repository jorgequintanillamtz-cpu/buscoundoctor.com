import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Clock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { setOpenGraph, SITE_OG } from "@/lib/seoMeta";

// Número real de WhatsApp del negocio. Formato wa.me: 52 (México) + 10
// dígitos (81 = Monterrey), sin espacios ni signos.
const WHATSAPP_NUMBER = "528117902740";
const WHATSAPP_DISPLAY = "+52 81 1790 2740";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hola, tengo una pregunta sobre BuscoUnDoctor"
)}`;

// Ícono de WhatsApp (glifo real, no la burbuja genérica de lucide) — mismo
// SVG que se usa en BookingFlow para que el ícono se vea igual en todo el sitio.
function WhatsAppIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.48 1.32 5L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23zm-4.75 4.7c-.16 0-.42.06-.64.31-.22.25-.85.83-.85 2.02s.87 2.35.99 2.51c.12.16 1.71 2.71 4.24 3.7 2.11.83 2.54.66 3 .62.46-.04 1.48-.6 1.69-1.19.21-.58.21-1.08.15-1.19-.06-.11-.22-.17-.46-.29-.24-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.57.12-.17.24-.65.81-.8.98-.15.17-.29.19-.53.06-.24-.12-1.03-.38-1.96-1.21-.72-.64-1.21-1.44-1.35-1.68-.14-.24-.02-.37.11-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.57-1.4-.78-1.91-.2-.49-.41-.42-.57-.43z" />
    </svg>
  );
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  // Título/descripción/OG propios de la página. El canonical ya lo pone
  // Layout automáticamente en cada cambio de ruta (/contacto).
  useEffect(() => {
    const title = "Contacto | BuscoUnDoctor — Directorio Médico en Monterrey";
    const description = "¿Dudas, sugerencias o quieres unirte a nuestro directorio? Escríbenos por WhatsApp o correo. Atendemos Monterrey y San Pedro Garza García.";
    document.title = title;
    setMeta("description", description);
    setOpenGraph({ title, description, image: SITE_OG.image });
  }, []);

  // JSON-LD ContactPage: le da a Google el teléfono, correo y ciudad como
  // datos estructurados, no solo como texto suelto en la página.
  useEffect(() => {
    const ld = {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "name": "Contacto | BuscoUnDoctor",
      "url": "https://buscoundoctor.com/contacto",
      "about": {
        "@type": "Organization",
        "name": "BuscoUnDoctor",
        "url": "https://buscoundoctor.com",
        "email": "contacto@buscoundoctor.com",
        "contactPoint": [{
          "@type": "ContactPoint",
          "telephone": "+52-81-1790-2740",
          "contactType": "customer service",
          "areaServed": "MX",
          "availableLanguage": ["es"],
        }],
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
    script.id = "contact-page-jsonld";
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: "contacto@buscoundoctor.com",
      subject: `Mensaje de contacto de ${form.name}`,
      body: `Nombre: ${form.name}\nEmail: ${form.email}\n\nMensaje:\n${form.message}`,
    });
    setSent(true);
    setSending(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Contacto</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="bg-white rounded-3xl border border-border/50 shadow-sm p-6 sm:p-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 bg-brand-bluePale text-brand-navy text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3 h-3" />
            Contacto
          </span>
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground leading-tight">
            ¿Hablamos? <span className="text-brand-blue">Estamos para ayudarte</span>
          </h1>
          <p className="text-muted-foreground mt-3">
            ¿Tienes preguntas, sugerencias o quieres unirte a nuestro directorio de especialistas en Monterrey y San Pedro Garza García? Escríbenos y te respondemos a la brevedad.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* WhatsApp como canal principal, más otros datos de contacto */}
          <div className="flex flex-col gap-4">
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-[#25D366] hover:bg-[#1fb855] transition-colors rounded-2xl p-6 text-white"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <WhatsAppIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-heading font-semibold text-base">Escríbenos por WhatsApp</p>
                <p className="text-sm text-white/85 mt-0.5">{WHATSAPP_DISPLAY} · Respuesta rápida</p>
              </div>
              <ArrowRight className="w-5 h-5 flex-shrink-0 opacity-80 group-hover:translate-x-1 transition-transform" />
            </a>

            <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm mb-0.5">Correo electrónico</p>
                  <a href="mailto:contacto@buscoundoctor.com" className="text-primary hover:underline text-sm">
                    contacto@buscoundoctor.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm mb-0.5">Zona de cobertura</p>
                  <p className="text-sm text-muted-foreground">Monterrey y San Pedro Garza García, Nuevo León</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm mb-0.5">Tiempo de respuesta</p>
                  <p className="text-sm text-muted-foreground">Normalmente respondemos el mismo día hábil</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          {sent ? (
            <div className="bg-accent/40 border border-accent rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[280px]">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary-foreground" />
              </div>
              <p className="font-heading font-semibold text-foreground">¡Mensaje enviado!</p>
              <p className="text-sm text-muted-foreground">Te responderemos a la brevedad en {form.email}.</p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Tu nombre completo"
                className="w-full text-sm border border-input rounded-xl px-3 py-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Correo electrónico</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="tu@correo.com"
                className="w-full text-sm border border-input rounded-xl px-3 py-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Mensaje</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="¿En qué podemos ayudarte?"
                className="w-full text-sm border border-input rounded-xl px-3 py-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
            <Button type="submit" disabled={sending} className="min-h-[44px] rounded-xl">
              {sending ? "Enviando..." : "Enviar mensaje"}
            </Button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}