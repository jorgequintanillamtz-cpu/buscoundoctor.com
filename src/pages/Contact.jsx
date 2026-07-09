import { useState } from "react";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

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
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-heading font-bold text-4xl text-foreground mb-4">
        Contacto
      </h1>
      <p className="text-lg text-muted-foreground mb-10">
        ¿Tienes preguntas, sugerencias o quieres unirte a nuestro directorio? Escríbenos y te responderemos a la brevedad.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Contact info */}
        <div className="flex flex-col gap-6">
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
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm mb-0.5">WhatsApp</p>
              <a href="https://wa.me/528180000000" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                +52 81 8000 0000
              </a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm mb-0.5">Ubicación</p>
              <p className="text-sm text-muted-foreground">Monterrey, Nuevo León, México</p>
            </div>
          </div>
        </div>

        {/* Contact form */}
        {sent ? (
          <div className="bg-accent/40 border border-accent rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
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
    </main>
  );
}