import BookingFlow from "./BookingFlow";

// Columna derecha (30%), sticky: la pieza que convierte pacientes. El único
// botón de acción ("Consultar horarios", con logo de WhatsApp) vive dentro
// de BookingFlow, porque es el que arma el mensaje con todo el contexto que
// el paciente fue llenando (tipo de paciente, consulta, seguro, nombre).
export default function BookingSidebar({ specialist, offices, services, resolvedInsurers = [] }) {
  // Primer nombre sin el título ("Dra. Ana Pérez" → "Ana"): antes salía "con Dra.."
  const firstName = (specialist.full_name || "").replace(/^\s*(dr\.?|dra\.?|doctora?)\s+/i, "").split(" ")[0] || "el doctor";
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
        {/* Franja verde Augusta (como la franja morada de Doctoralia): hace que esta tarjeta,
            la que convierte pacientes, destaque del resto de la página. */}
        <div className="bg-brand-augusta text-white px-7 sm:px-8 py-5 sm:py-6 flex-shrink-0">
          <h2 className="font-heading font-extrabold text-2xl">Agendar cita</h2>
          <p className="text-sm text-white/80 mt-1">
            Contacto directo y gratuito con {firstName}.
          </p>
        </div>

        <div className="px-7 sm:px-8 pt-6 pb-7 sm:pb-8 overflow-y-auto">
          <BookingFlow specialist={specialist} offices={offices} services={services} insurers={resolvedInsurers} />

          <p className="text-xs text-muted-foreground border-t border-border/50 pt-4 mt-5">
            El contacto y la solicitud de cita son gratuitos.
          </p>
        </div>
      </div>
    </div>
  );
}
