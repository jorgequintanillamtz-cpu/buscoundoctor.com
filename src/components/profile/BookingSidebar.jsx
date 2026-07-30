import { MessageCircle, Phone, Mail, CreditCard, Languages as LanguagesIcon, ShieldCheck } from "lucide-react";
import BookingFlow from "./BookingFlow";
import SaveDoctorButton from "./SaveDoctorButton";
import ShareProfileButton from "./ShareProfileButton";

const PAYMENT_LABELS = { tarjeta: "Tarjeta", transferencia: "Transferencia", efectivo: "Efectivo" };

// Columna derecha (30%), sticky: la pieza que convierte pacientes. Todo lo
// que muestra (aseguradoras, métodos de pago, idiomas) sale de datos reales
// del especialista — si no los tiene cargados, simplemente no se muestra esa
// tarjeta en vez de rellenarla con contenido genérico.
export default function BookingSidebar({ specialist, offices, services, resolvedInsurers = [], languageNames = [], whatsappHref, displayPhone }) {
  const messageHref = specialist.email
    ? `mailto:${specialist.email}?subject=${encodeURIComponent("Pregunta desde BuscoUnDoctor")}&body=${encodeURIComponent(`Hola ${specialist.full_name}, tengo una pregunta antes de agendar mi cita.`)}`
    : specialist.whatsapp
    ? `https://wa.me/${specialist.whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hola, tengo una pregunta antes de agendar mi cita con ${specialist.full_name}.`)}`
    : null;

  return (
    <div className="sticky top-24 space-y-4 max-h-[calc(100vh-7rem)] overflow-y-auto pb-2">
      <div className="bg-card rounded-3xl border border-border/50 shadow-sm p-6">
        <h2 className="font-heading font-bold text-lg text-foreground">Agendar cita</h2>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Contacto directo y gratuito con {specialist.full_name?.split(" ")[0]}.
        </p>

        <BookingFlow specialist={specialist} offices={offices} services={services} />

        <div className="mt-5 pt-5 border-t border-border/50 flex flex-wrap gap-2">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 basis-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 min-h-[44px] rounded-full shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          )}
          {displayPhone && (
            <a
              href={`tel:${displayPhone.replace(/[^\d+]/g, "")}`}
              className="flex-1 basis-[47%] inline-flex items-center justify-center gap-2 border border-border/60 text-foreground text-sm font-medium px-4 py-2.5 min-h-[44px] rounded-full hover:border-brand-blue/40 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Llamar
            </a>
          )}
          {messageHref && (
            <a
              href={messageHref}
              target={specialist.email ? undefined : "_blank"}
              rel={specialist.email ? undefined : "noopener noreferrer"}
              className="flex-1 basis-[47%] inline-flex items-center justify-center gap-2 border border-border/60 text-foreground text-sm font-medium px-4 py-2.5 min-h-[44px] rounded-full hover:border-brand-blue/40 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Mensaje
            </a>
          )}
          <ShareProfileButton specialist={specialist} className="flex-1 basis-[47%]" />
          <SaveDoctorButton specialistId={specialist.id} className="flex-1 basis-[47%]" />
        </div>

        <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-3 mt-4">
          El contacto y la solicitud de cita son gratuitos.
        </p>
      </div>

      {resolvedInsurers.length > 0 && (
        <div className="bg-card rounded-3xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-heading font-semibold text-foreground">Acepta seguros</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {resolvedInsurers.map((ins, i) => (
              <span key={i} className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full flex items-center gap-1.5">
                {ins.logo_url && <img src={ins.logo_url} alt={ins.name} className="w-4 h-4 object-contain" />}
                {ins.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {specialist.payment_methods?.length > 0 && (
        <div className="bg-card rounded-3xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-heading font-semibold text-foreground">Métodos de pago</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {specialist.payment_methods.map((m) => (
              <span key={m} className="text-xs font-medium bg-accent text-accent-foreground px-3 py-1.5 rounded-full">
                {PAYMENT_LABELS[m] || m}
              </span>
            ))}
          </div>
        </div>
      )}

      {languageNames.length > 0 && (
        <div className="bg-card rounded-3xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <LanguagesIcon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-heading font-semibold text-foreground">Idiomas</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {languageNames.map((name, i) => (
              <span key={i} className="text-xs font-medium bg-accent text-accent-foreground px-3 py-1.5 rounded-full">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
