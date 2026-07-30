import { MessageCircle, Phone, Mail } from "lucide-react";
import BookingFlow from "./BookingFlow";
import SaveDoctorButton from "./SaveDoctorButton";
import ShareProfileButton from "./ShareProfileButton";

// Columna derecha (30%), sticky: la pieza que convierte pacientes.
export default function BookingSidebar({ specialist, offices, services, resolvedInsurers = [], whatsappHref, displayPhone }) {
  const messageHref = specialist.email
    ? `mailto:${specialist.email}?subject=${encodeURIComponent("Pregunta desde BuscoUnDoctor")}&body=${encodeURIComponent(`Hola ${specialist.full_name}, tengo una pregunta antes de agendar mi cita.`)}`
    : specialist.whatsapp
    ? `https://wa.me/${specialist.whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hola, tengo una pregunta antes de agendar mi cita con ${specialist.full_name}.`)}`
    : null;

  return (
    <div className="sticky top-24 space-y-5 pb-2">
      {/* La tarjeta ahora tiene su propio scroll interno (max-height acotado
          al viewport) porque el formulario creció mucho con los nuevos
          pasos (tipo de paciente, padecimiento, seguro, calendario, horario
          flexible) y en pantallas más chicas ya no cabía completo: sin esto,
          los campos de abajo y el botón de Confirmar quedaban inalcanzables
          porque el sticky los "congelaba" fuera de la vista. El scroll va en
          este div hijo, no en el contenedor sticky de arriba, para no romper
          de nuevo el sticky del padre. */}
      <div className="bg-card rounded-3xl border border-border/50 shadow-lg p-7 sm:p-8 max-h-[calc(100vh-7rem)] overflow-y-auto">
        <h2 className="font-heading font-extrabold text-2xl text-foreground">Agendar cita</h2>
        <p className="text-sm text-muted-foreground mt-1.5 mb-6">
          Contacto directo y gratuito con {specialist.full_name?.split(" ")[0]}.
        </p>

        <BookingFlow specialist={specialist} offices={offices} services={services} insurers={resolvedInsurers} />

        <div className="mt-6 pt-6 border-t border-border/50 flex flex-wrap gap-2">
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

        <p className="text-xs text-muted-foreground border-t border-border/50 pt-4 mt-5">
          El contacto y la solicitud de cita son gratuitos.
        </p>
      </div>

    </div>
  );
}
