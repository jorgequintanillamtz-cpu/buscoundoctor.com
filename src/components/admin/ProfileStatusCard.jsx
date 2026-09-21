import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, AlertTriangle, PauseCircle, Eye, MessageCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { supportWhatsAppLink } from "@/components/DoctorSupportWhatsApp";

// Los documentos que el equipo necesita para aprobar un perfil.
const REQUIRED_DOCS = [
  { type: "cedula_profesional", label: "tu cédula profesional" },
  { type: "identificacion_oficial", label: "tu identificación oficial" },
];

const TONES = {
  green: { box: "bg-emerald-50 border-emerald-200", icon: "text-emerald-600", title: "text-emerald-900" },
  blue: { box: "bg-brand-bluePale/60 border-brand-blue/20", icon: "text-brand-blue", title: "text-brand-navy" },
  amber: { box: "bg-amber-50 border-amber-200", icon: "text-amber-600", title: "text-amber-900" },
  red: { box: "bg-red-50 border-red-200", icon: "text-red-600", title: "text-red-900" },
};

// Tarjeta de arriba del inicio: le dice al médico, en palabras simples, si su
// perfil ya aparece en el directorio y qué sigue. Se calcula con lo que ya
// existe: publication_status, active (interruptor del admin),
// license_verification_status y el estado de los documentos.
export default function ProfileStatusCard({ specialist, onNavigate }) {
  const specialistId = specialist?.id;
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["doctor-required-docs", specialistId],
    queryFn: () => base44.entities.SpecialistDocument.filter({ specialist_id: specialistId }),
    enabled: !!specialistId,
  });

  if (!specialistId || isLoading) return null;

  const publication = specialist.publication_status || "pending_review";
  const visible = publication === "published" && specialist.active === true;
  const verified = specialist.license_verification_status === "verified";
  const docFor = (type) => docs.find((d) => d.document_type === type);
  const missing = REQUIRED_DOCS.filter((d) => !docFor(d.type)).map((d) => d.label);
  const rejectedDoc = docs.find((d) => REQUIRED_DOCS.some((r) => r.type === d.document_type) && d.upload_status === "rejected");

  let card;
  if (publication === "suspended") {
    card = {
      tone: "amber", icon: PauseCircle,
      title: "Tu perfil está en pausa",
      body: "Por ahora no aparece en el directorio. Escríbenos y lo resolvemos contigo.",
      help: true,
    };
  } else if (publication === "rejected" || rejectedDoc) {
    card = {
      tone: "red", icon: AlertTriangle,
      title: "Tu perfil necesita un ajuste",
      body: rejectedDoc?.rejection_reason
        ? `Tuvimos un problema con uno de tus documentos: ${rejectedDoc.rejection_reason}. Súbelo de nuevo y lo revisamos.`
        : "Nuestro equipo encontró algo por corregir. Escríbenos y te ayudamos.",
      cta: rejectedDoc ? { label: "Revisar mis documentos", target: "documentos" } : null,
      help: true,
    };
  } else if (visible) {
    card = {
      tone: "green", icon: CheckCircle2,
      title: "Tu perfil está publicado",
      body: "Los pacientes ya pueden encontrarte en el directorio.",
      link: { label: "Ver mi perfil público", href: `/especialista/${specialist.slug}` },
    };
  } else if (publication === "published") {
    card = {
      tone: "blue", icon: Clock,
      title: "Tu perfil está aprobado",
      body: "Todavía no aparece en el directorio. Nuestro equipo lo activará y te avisaremos por correo.",
    };
  } else if (missing.length > 0) {
    card = {
      tone: "amber", icon: Clock,
      title: "Tu perfil está en revisión",
      body: `Para aprobarlo necesitamos ${missing.join(" y ")}. Súbelo${missing.length > 1 ? "s" : ""} y lo revisamos, normalmente en menos de 24 horas.`,
      cta: { label: "Subir mis documentos", target: "documentos" },
    };
  } else {
    card = {
      tone: "blue", icon: Clock,
      title: "Estamos revisando tu perfil",
      body: "Ya recibimos tus documentos. Normalmente tardamos menos de 24 horas y te avisaremos por correo cuando esté publicado.",
    };
  }

  const tone = TONES[card.tone];
  const Icon = card.icon;
  return (
    <div className={`rounded-2xl border p-5 ${tone.box}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${tone.icon}`} />
        <div className="flex-1 min-w-0">
          <p className={`font-heading font-bold text-base ${tone.title}`}>{card.title}</p>
          <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{card.body}</p>

          <div className="flex items-center gap-2 mt-3 text-xs text-foreground/70">
            <ShieldCheck className={`w-4 h-4 ${verified ? "text-emerald-600" : "text-muted-foreground"}`} />
            {verified
              ? "Cédula verificada"
              : docFor("cedula_profesional")
              ? "Cédula en revisión"
              : "Cédula pendiente de subir"}
          </div>

          {(card.cta || card.link || card.help) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {card.cta && (
                <Button className="rounded-xl gap-1.5 min-h-[44px]" onClick={() => onNavigate?.(card.cta.target)}>
                  {card.cta.label}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {card.link && (
                <Button variant="outline" className="rounded-xl gap-1.5 min-h-[44px] bg-white" asChild>
                  <a href={card.link.href} target="_blank" rel="noopener noreferrer">
                    <Eye className="w-4 h-4" />
                    {card.link.label}
                  </a>
                </Button>
              )}
              {card.help && (
                <Button variant="outline" className="rounded-xl gap-1.5 min-h-[44px] bg-white" asChild>
                  <a href={supportWhatsAppLink(`Hola, necesito ayuda con mi perfil en BuscoUnDoctor (${specialist.full_name || ""})`)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4" />
                    Escribirnos por WhatsApp
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
