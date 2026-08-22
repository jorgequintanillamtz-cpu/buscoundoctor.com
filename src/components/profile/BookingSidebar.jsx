import BookingFlow from "./BookingFlow";

// Columna derecha (30%), sticky: la pieza que convierte pacientes. El único
// botón de acción ("Consultar horarios", con logo de WhatsApp) vive dentro
// de BookingFlow, porque es el que arma el mensaje con todo el contexto que
// el paciente fue llenando (tipo de paciente, consulta, seguro, nombre).
export default function BookingSidebar({ specialist, offices, services, resolvedInsurers = [] }) {
  return (
    // El offset ya no es un número fijo (antes top-24): usa --header-h, la
    // altura REAL del header (que varía según si el banner "¿Eres médico?"
    // está visible), medida en vivo por Header.jsx. Con un valor fijo, cuando
    // el banner estaba visible el header quedaba más alto que el offset y
    // tapaba la esquina de esta tarjeta al hacer scroll — exactamente lo que
    // Jorge reportó. El max-height de la tarjeta usa la misma variable para
    // no pasarse del espacio real disponible debajo del header.
    <div className="sticky" style={{ top: "calc(var(--header-h, 6rem) + 1rem)" }}>
      <div
        className="bg-card rounded-3xl border border-border/50 shadow-lg flex flex-col overflow-hidden"
        style={{ maxHeight: "calc(100vh - var(--header-h, 6rem) - 2rem)" }}
      >
        {/* pt/px por separado (nunca "p-8" + "pb-0"): mezclar un shorthand
            responsivo (sm:p-8) con un override de un solo lado (pb-0) es un
            error clásico de Tailwind — en pantallas sm+ el sm:p-8 termina
            ganando y regresa el padding-bottom que se quería quitar, dejando
            un espacio de sobra enorme antes de "Selecciona un hospital".
            Escribiendo solo pt/px aquí (sin ningún pb) se evita el choque. */}
        <div className="pt-7 sm:pt-8 px-7 sm:px-8 flex-shrink-0">
          <h2 className="font-heading font-extrabold text-2xl text-foreground">Agendar cita</h2>
          <p className="text-sm text-muted-foreground mt-1.5 mb-4">
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
