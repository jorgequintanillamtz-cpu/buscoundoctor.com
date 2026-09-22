import { useMemo, useState } from "react";
import { User, Mail, Plane, Share2, LifeBuoy } from "lucide-react";
import AccountSettings from "@/components/admin/settings/AccountSettings";
import EmailPreferences from "@/components/admin/settings/EmailPreferences";
import VacationSettings from "@/components/admin/settings/VacationSettings";
import ShareProfile from "@/components/admin/settings/ShareProfile";
import HelpCenter from "@/components/admin/settings/HelpCenter";

const ALL_TABS = [
  { key: "cuenta", label: "Mi cuenta", icon: User },
  { key: "correos", label: "Correos", icon: Mail },
  { key: "vacaciones", label: "Vacaciones", icon: Plane },
  { key: "compartir", label: "Compartir", icon: Share2 },
  { key: "ayuda", label: "Ayuda", icon: LifeBuoy },
];

// Ajustes del médico (admin doctores): cuenta, preferencias de correo, vacaciones, compartir y ayuda.
// Un asistente ve todo esto MENOS "Mi cuenta" (contraseña, correo, dar de
// baja el perfil y a quién se invita como asistente son decisiones del dueño).
export default function DoctorSettings({ specialist, onStatusChange, isAssistant = false, initialTab = "cuenta" }) {
  const tabs = useMemo(() => (isAssistant ? ALL_TABS.filter((t) => t.key !== "cuenta") : ALL_TABS), [isAssistant]);
  const [tab, setTab] = useState(isAssistant && initialTab === "cuenta" ? "correos" : initialTab);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-bold text-xl text-foreground">Ajustes</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isAssistant ? "Correos, vacaciones y respuestas a las dudas de este médico." : "Tu cuenta, tus correos, tus vacaciones y respuestas a tus dudas."}
        </p>
      </div>

      <div className="flex gap-1 bg-muted rounded-2xl p-1 w-full overflow-x-auto sm:w-fit" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 sm:px-4 min-h-[40px] rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cuenta" && !isAssistant && <AccountSettings specialist={specialist} onStatusChange={onStatusChange} />}
      {tab === "correos" && <EmailPreferences specialistId={specialist.id} />}
      {tab === "vacaciones" && <VacationSettings specialist={specialist} onStatusChange={onStatusChange} />}
      {tab === "compartir" && <ShareProfile specialist={specialist} />}
      {tab === "ayuda" && <HelpCenter slug={specialist.slug} />}
    </div>
  );
}
