import BookingFlow from "./BookingFlow";

// Columna derecha (30%), sticky: la pieza que convierte pacientes. El único
// botón de acción ("Consultar horarios", con logo de WhatsApp) vive dentro
// de BookingFlow, porque es el que arma el mensaje con todo el contexto que
// el paciente fue llenando (tipo de paciente, consulta, seguro, nombre).
export default function BookingSidebar({ specialist, offices, services, resolvedInsurers = [] }) {
  return (
    <div className="sticky top-24 space-y-5 pb-2">
      {/* Sin scroll interno a propósito: Jorge quiere que la caja completa
          acompañe el scroll de la página (subiendo y bajando junto con el
          contenido principal) hasta llegar al final de la columna, no que
          se quede fija con una barra de scroll propia adentro. */}
      <div className="bg-card rounded-3xl border border-border/50 shadow-lg p-7 sm:p-8">
        <h2 className="font-heading font-extrabold text-2xl text-foreground">Agendar cita</h2>
        <p className="text-sm text-muted-foreground mt-1.5 mb-6">
          Contacto directo y gratuito con {specialist.full_name?.split(" ")[0]}.
        </p>

        <BookingFlow specialist={specialist} offices={offices} services={services} insurers={resolvedInsurers} />

        <p className="text-xs text-muted-foreground border-t border-border/50 pt-4 mt-5">
          El contacto y la solicitud de cita son gratuitos.
        </p>
      </div>

    </div>
  );
}
