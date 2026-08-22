import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, RotateCcw, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { notifyNewAppointmentRequest } from "@/api/doctorNotify";

// Ícono de WhatsApp (glifo real, no la burbuja genérica de lucide) para que
// el botón se reconozca de inmediato como WhatsApp.
function WhatsAppIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.48 1.32 5L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23zm-4.75 4.7c-.16 0-.42.06-.64.31-.22.25-.85.83-.85 2.02s.87 2.35.99 2.51c.12.16 1.71 2.71 4.24 3.7 2.11.83 2.54.66 3 .62.46-.04 1.48-.6 1.69-1.19.21-.58.21-1.08.15-1.19-.06-.11-.22-.17-.46-.29-.24-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.57.12-.17.24-.65.81-.8.98-.15.17-.29.19-.53.06-.24-.12-1.03-.38-1.96-1.21-.72-.64-1.21-1.44-1.35-1.68-.14-.24-.02-.37.11-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.57-1.4-.78-1.91-.2-.49-.41-.42-.57-.43z" />
    </svg>
  );
}

// Stepper de reserva compartido entre la tarjeta sticky de escritorio y el
// bottom sheet de móvil. Ya no maneja fecha/hora: eso se consulta directo
// por WhatsApp con el doctor. Aquí solo se junta el contexto (tipo de
// consulta, seguro, nombre) y el botón final abre WhatsApp con todo
// prellenado. Se degrada con elegancia: si el doctor solo tiene un
// consultorio, ese paso se auto-completa sin pedirle nada extra al paciente.
export default function BookingFlow({ specialist, offices = [], services = [], insurers = [], onConfirmed }) {
  const [officeId, setOfficeId] = useState(offices.length === 1 ? offices[0].id : "");
  const [modality, setModality] = useState(specialist.modality === "online" ? "videoconsulta" : "presencial");
  const [serviceId, setServiceId] = useState(services.length === 1 ? services[0].id : "");
  const [isOtro, setIsOtro] = useState(services.length === 0);
  const [consultaOpen, setConsultaOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [insurerName, setInsurerName] = useState("");
  const [dateMode, setDateMode] = useState("asap"); // asap | specific
  const [specificDate, setSpecificDate] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Honeypot anti-bot: ver nota en AppointmentForm.jsx.
  const [website, setWebsite] = useState("");

  const showOfficeStep = offices.length > 1;
  const showModalityStep = specialist.modality === "ambas";

  const office = offices.length === 1 ? offices[0] : offices.find((o) => o.id === officeId);
  const service = services.length === 1 && !isOtro ? services[0] : services.find((s) => s.id === serviceId && !isOtro);

  const consultaLabel = isOtro
    ? "Otro"
    : service
    ? `${service.name} — $${service.price?.toLocaleString("es-MX")}`
    : "Selecciona una consulta";

  const canConfirm =
    name.trim() &&
    phone.replace(/\D/g, "").length >= 10 &&
    (offices.length === 0 || !!office) &&
    (services.length === 0 || !!service || isOtro) &&
    (dateMode === "asap" || !!specificDate);

  const reset = () => {
    setDone(false);
    setReason("");
    setInsurerName("");
    setServiceId(services.length === 1 ? services[0].id : "");
    setIsOtro(services.length === 0);
    setConsultaOpen(false);
    setDateMode("asap");
    setSpecificDate("");
    setName("");
    setPhone("");
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;
    if (website) return;
    setSubmitting(true);
    try {
      const reasonText = service ? `Cita: ${service.name}` : (reason.trim() || "Solicitud de cita agendada desde el perfil");
      const insuranceLabel = insurerName || "Sin seguro";
      const preferredDateLabel = dateMode === "asap"
        ? "Lo antes posible"
        : new Date(`${specificDate}T00:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

      await base44.entities.AppointmentRequest.create({
        patient_name: name,
        phone,
        reason: reasonText,
        specialist_id: specialist.id,
        specialist_name: specialist.full_name,
        office_id: office?.id,
        office_label: office ? (office.name || office.address_line) : undefined,
        modality,
        service_name: service?.name,
        service_price: service?.price,
        insurer_name: insuranceLabel,
        preferred_date: dateMode === "asap" ? "Lo antes posible" : specificDate,
      });
      notifyNewAppointmentRequest(specialist, { patient_name: name, phone, reason: reasonText });

      const lines = [
        `Hola, me gustaría consultar horarios disponibles para agendar una cita con ${specialist.full_name}.`,
        "",
        `Nombre: ${name}`,
        `Teléfono: ${phone}`,
        office ? `Hospital/consultorio: ${office.name || office.address_line}` : null,
        `Modalidad: ${modality === "videoconsulta" ? "Videoconsulta" : "Presencial"}`,
        service ? `Servicio: ${service.name} ($${service.price?.toLocaleString("es-MX")} MXN)` : null,
        `Fecha preferida: ${preferredDateLabel}`,
        isOtro && reason.trim() ? `Motivo de consulta: ${reason.trim()}` : null,
        `Seguro médico: ${insuranceLabel}`,
      ].filter(Boolean);

      if (specialist.whatsapp) {
        window.open(`https://wa.me/${specialist.whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
      }

      setDone(true);
      onConfirmed?.();
    } catch (e) {
      toast.error("No se pudo enviar la solicitud: " + e.message);
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="text-center py-6 px-2">
        <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
        <p className="font-heading font-semibold text-foreground">¡Listo!</p>
        <p className="text-sm text-muted-foreground mt-1">
          Se abrió WhatsApp con tu consulta prellenada para {specialist.full_name}. Ahí puedes revisar horarios disponibles y confirmar tu cita directamente.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:underline mt-4"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Consultar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
      />
      {showOfficeStep && (
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Selecciona un hospital</label>
          <div className="space-y-1.5">
            {offices.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => setOfficeId(o.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                  officeId === o.id ? "border-brand-blue bg-brand-bluePale/60 font-medium text-brand-navy" : "border-border/50 hover:border-brand-blue/40"
                }`}
              >
                {o.name || o.address_line}
              </button>
            ))}
          </div>
        </div>
      )}

      {showModalityStep && (
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Selecciona la modalidad</label>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: "presencial", label: "Presencial" }, { v: "videoconsulta", label: "Videoconsulta" }].map((m) => (
              <button
                type="button"
                key={m.v}
                onClick={() => setModality(m.v)}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  modality === m.v ? "border-brand-blue bg-brand-bluePale/60 text-brand-navy" : "border-border/50 hover:border-brand-blue/40"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Tipo de consulta</label>

        {services.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setConsultaOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-border/50 text-sm text-left hover:border-brand-blue/40 transition-colors"
            >
              <span className={service || isOtro ? "text-foreground font-medium" : "text-muted-foreground"}>{consultaLabel}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${consultaOpen ? "rotate-180" : ""}`} />
            </button>

            {consultaOpen && (
              <div className="mt-1.5 space-y-1.5">
                {services.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => { setServiceId(s.id); setIsOtro(false); setConsultaOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 text-left px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                      !isOtro && serviceId === s.id ? "border-brand-blue bg-brand-bluePale/60 font-medium text-brand-navy" : "border-border/50 hover:border-brand-blue/40"
                    }`}
                  >
                    <span>{s.name}</span>
                    <span className="flex-shrink-0 font-semibold">${s.price?.toLocaleString("es-MX")}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setIsOtro(true); setServiceId(""); setConsultaOpen(false); }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                    isOtro ? "border-brand-blue bg-brand-bluePale/60 font-medium text-brand-navy" : "border-border/50 hover:border-brand-blue/40"
                  }`}
                >
                  Otro
                </button>
              </div>
            )}
          </>
        ) : null}

        {isOtro && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Cuéntale brevemente al doctor qué padecimiento o consulta necesitas"
            className={`w-full px-3.5 py-2.5 rounded-xl border border-border/50 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand-blue ${services.length > 0 ? "mt-2" : ""}`}
          />
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">¿Cuándo te gustaría la cita?</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDateMode("asap")}
            className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              dateMode === "asap" ? "border-brand-blue bg-brand-bluePale/60 text-brand-navy" : "border-border/50 hover:border-brand-blue/40"
            }`}
          >
            Lo antes posible
          </button>
          <button
            type="button"
            onClick={() => setDateMode("specific")}
            className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              dateMode === "specific" ? "border-brand-blue bg-brand-bluePale/60 text-brand-navy" : "border-border/50 hover:border-brand-blue/40"
            }`}
          >
            Elegir una fecha
          </button>
        </div>
        {dateMode === "specific" && (
          <input
            type="date"
            value={specificDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setSpecificDate(e.target.value)}
            className="w-full h-11 px-3.5 mt-2 rounded-xl border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Seguro médico</label>
        <select
          value={insurerName}
          onChange={(e) => setInsurerName(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl border border-border/50 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
        >
          <option value="">Sin seguro</option>
          {insurers.map((ins) => (
            <option key={ins.id || ins.name} value={ins.name}>{ins.name}</option>
          ))}
        </select>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre"
        className="w-full h-11 px-3.5 rounded-xl border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Tu número de teléfono"
        type="tel"
        className="w-full h-11 px-3.5 rounded-xl border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />

      <button
        type="button"
        disabled={!canConfirm || submitting}
        onClick={handleConfirm}
        className="w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-3.5 min-h-[44px] rounded-xl shadow-sm transition-colors"
      >
        <WhatsAppIcon className="w-4 h-4" />
        {submitting ? "Enviando…" : "Consultar horarios"}
      </button>
    </div>
  );
}
