import { useState } from "react";
import { User, Mail, Plane, LifeBuoy } from "lucide-react";
import AccountSettings from "@/components/admin/settings/AccountSettings";
import EmailPreferences from "@/components/admin/settings/EmailPreferences";
import VacationSettings from "@/components/admin/settings/VacationSettings";
import HelpCenter from "@/components/admin/settings/HelpCenter";

const TABS = [
  { key: "cuenta", label: "Mi cuenta", icon: User },
  { key: "correos", label: "Correos", icon: Mail },
  { key: "vacaciones", label: "Vacaciones", icon: Plane },
  { key: "ayuda", label: "Ayuda", icon: LifeBuoy },
];

// Ajustes del médico (admin doctores): cuenta, preferencias de correo y ayuda.
export default function DoctorSettings({ specialist, onStatusChange, initialTab = "cuenta" }) {
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-bold text-xl text-foreground">Ajustes</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Tu cuenta, tus correos, tus vacaciones y respuestas a tus dudas.</p>
      </div>

      <div className="grid grid-cols-4 sm:flex gap-1 bg-muted rounded-2xl p-1 w-full sm:w-fit" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 sm:px-4 py-1.5 sm:py-0 min-h-[44px] sm:min-h-[40px] rounded-xl text-[11px] sm:text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cuenta" && <AccountSettings specialist={specialist} onStatusChange={onStatusChange} />}
      {tab === "correos" && <EmailPreferences specialistId={specialist.id} />}
      {tab === "vacaciones" && <VacationSettings specialist={specialist} onStatusChange={onStatusChange} />}
      {tab === "ayuda" && <HelpCenter slug={specialist.slug} />}
    </div>
  );
}
