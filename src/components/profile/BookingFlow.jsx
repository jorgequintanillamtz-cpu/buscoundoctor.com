import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const TIME_SLOTS = ["09:00", "10:30", "12:00", "16:00", "17:30"];

function getNext7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}
const formatDateValue = (d) => d.toISOString().split("T")[0];
const formatDayLabel = (d) => (d.toDateString() === new Date().toDateString() ? "Hoy" : d.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", ""));

// Stepper de reserva compartido entre la tarjeta sticky de escritorio y el
// bottom sheet de móvil. Se degrada con elegancia: si el doctor solo tiene un
// consultorio/servicio, esos pasos se auto-completan sin pedirle nada extra
// al paciente (menos fricción = más conversión).
export default function BookingFlow({ specialist, offices = [], services = [], onConfirmed }) {
  const [officeId, setOfficeId] = useState(offices.length === 1 ? offices[0].id : "");
  const [modality, setModality] = useState(specialist.modality === "online" ? "videoconsulta" : "presencial");
  const [serviceId, setServiceId] = useState(services.length === 1 ? services[0].id : "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const showOfficeStep = offices.length > 1;
  const showModalityStep = specialist.modality === "ambas";
  const showServiceStep = services.length > 1;

  const office = offices.length === 1 ? offices[0] : offices.find((o) => o.id === officeId);
  const service = services.length === 1 ? services[0] : services.find((s) => s.id === serviceId);

  const canConfirm =
    name.trim() && phone.trim() && date && time &&
    (offices.length === 0 || !!office) &&
    (services.length === 0 || !!service);

  const reset = () => {
    setDone(false);
    setDate("");
    setTime("");
    setName("");
    setPhone("");
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      await base44.entities.AppointmentRequest.create({
        patient_name: name,
        phone,
        reason: service ? `Cita: ${service.name}` : "Solicitud de cita agendada desde el perfil",
        preferred_date: date,
        preferred_time: time,
        specialist_id: specialist.id,
        specialist_name: specialist.full_name,
        office_id: office?.id,
        office_label: office ? (office.name || office.address_line) : undefined,
        modality,
        service_name: service?.name,
        service_price: service?.price,
      });

      const lines = [
        `Hola, me gustaría agendar una cita con ${specialist.full_name}.`,
        "",
        `Nombre: ${name}`,
        `Teléfono: ${phone}`,
        office ? `Hospital/consultorio: ${office.name || office.address_line}` : null,
        `Modalidad: ${modality === "videoconsulta" ? "Videoconsulta" : "Presencial"}`,
        service ? `Servicio: ${service.name} ($${service.price?.toLocaleString("es-MX")} MXN)` : null,
        `Fecha preferida: ${date}`,
        `Hora preferida: ${time}`,
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
        <p className="font-heading font-semibold text-foreground">¡Solicitud enviada!</p>
        <p className="text-sm text-muted-foreground mt-1">
          Se abrió WhatsApp con tu solicitud prellenada para {specialist.full_name}. Confirma tu horario directamente con el consultorio.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:underline mt-4"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Agendar otra cita
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {showServiceStep && (
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Selecciona un servicio</label>
          <div className="space-y-1.5">
            {services.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setServiceId(s.id)}
                className={`w-full flex items-center justify-between gap-2 text-left px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                  serviceId === s.id ? "border-brand-blue bg-brand-bluePale/60 font-medium text-brand-navy" : "border-border/50 hover:border-brand-blue/40"
                }`}
              >
                <span>{s.name}</span>
                <span className="flex-shrink-0 font-semibold">${s.price?.toLocaleString("es-MX")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Selecciona una fecha</label>
        <div className="grid grid-cols-7 gap-1.5">
          {getNext7Days().map((d, i) => {
            const value = formatDateValue(d);
            const selected = date === value;
            return (
              <button
                type="button"
                key={i}
                onClick={() => setDate(value)}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-center transition-colors ${
                  selected ? "bg-brand-blue border-brand-blue text-white" : "border-border/50 hover:border-brand-blue/50 hover:bg-accent/30"
                }`}
              >
                <span className={`text-[10px] font-medium ${selected ? "text-white/80" : "text-muted-foreground"}`}>{formatDayLabel(d)}</span>
                <span className="text-sm font-heading font-bold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Selecciona un horario</label>
        <div className="flex flex-wrap gap-2">
          {TIME_SLOTS.map((slot) => (
            <button
              type="button"
              key={slot}
              onClick={() => setTime(slot)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                time === slot ? "bg-brand-blue border-brand-blue text-white" : "border-border/50 text-foreground hover:border-brand-blue/50 hover:bg-accent/30"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Horarios sugeridos — confirma disponibilidad real con el consultorio por WhatsApp.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          className="h-11 px-3.5 rounded-xl border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Tu teléfono"
          className="h-11 px-3.5 rounded-xl border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
      </div>

      <button
        type="button"
        disabled={!canConfirm || submitting}
        onClick={handleConfirm}
        className="w-full bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-3.5 min-h-[44px] rounded-xl shadow-sm transition-colors"
      >
        {submitting ? "Enviando…" : "Confirmar cita"}
      </button>
    </div>
  );
}
