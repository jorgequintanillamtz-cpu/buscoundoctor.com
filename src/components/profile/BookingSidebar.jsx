import BookingFlow from "./BookingFlow";

// Columna derecha (30%), sticky: la pieza que convierte pacientes. El único
// botón de acción ("Consultar horarios", con logo de WhatsApp) vive dentro
// de BookingFlow, porque es el que arma el mensaje con todo el contexto que
// el paciente fue llenando (tipo de paciente, consulta, seguro, nombre).
export default function BookingSidebar({ specialist, offices, services, resolvedInsurers = [] }) {
  return (
    <div className="sticky top-24">
      {/* La primera versión de este fix ponía el scroll interno en TODA la
          tarjeta (título incluido), así que al hacer scroll para alcanzar el
          botón de WhatsApp, el título "Agendar cita" se iba también hacia
          arriba y se veía cortado/raro — justo lo que Jorge reportó. Ahora
          el título y el texto de abajo quedan fijos (flex-shrink-0, fuera
          del área con scroll) y SOLO el formulario de en medio (BookingFlow
          + la nota de "gratuito") se vuelve scrollable, y nada más cuando de
          verdad no cabe en pantallas bajas. En pantallas altas no cambia
          nada: no aparece barra de scroll. */}
      <div className="bg-card rounded-3xl border border-border/50 shadow-lg max-h-[calc(100vh-7rem)] flex flex-col overflow-hidden">
        <div className="p-7 sm:p-8 pb-0 flex-shrink-0">
          <h2 className="font-heading font-extrabold text-2xl text-foreground">Agendar cita</h2>
          <p className="text-sm text-muted-foreground mt-1.5 mb-6">
            Contacto directo y gratuito con {specialist.full_name?.split(" ")[0]}.
          </p>
        </div>

        <div className="px-7 sm:px-8 pb-7 sm:pb-8 overflow-y-auto">
          <BookingFlow specialist={specialist} offices={offices} services={services} insurers={resolvedInsurers} />

          <p className="text-xs text-muted-foreground border-t border-border/50 pt-4 mt-5">
            El contacto y la solicitud de cita son gratuitos.
          </p>
        </div>
      </div>
    </div>
  );
}
