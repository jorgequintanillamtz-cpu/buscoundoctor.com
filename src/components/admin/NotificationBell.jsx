import { useState } from "react";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notificationStyle } from "@/lib/doctorNotifications";

export function NotificationItem({ n, onOpen }) {
  const { icon: Icon, tone } = notificationStyle(n.type);
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${n.read_at ? "" : "bg-brand-bluePale/40"}`}
    >
      <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tone}`}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-foreground leading-snug">{n.title}</span>
        {n.body && <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</span>}
        <span className="block text-[11px] text-muted-foreground/80 mt-1">
          {formatDistanceToNow(new Date(n.created_date), { addSuffix: true, locale: es })}
        </span>
      </span>
      {!n.read_at && <span className="w-2 h-2 rounded-full bg-brand-blue flex-shrink-0 mt-2" aria-label="Sin leer" />}
    </button>
  );
}

// Campana del panel del médico: cuántas novedades hay sin leer y la lista de
// las más recientes. Cada aviso lleva a la pantalla donde se atiende.
export default function NotificationBell({ notifications, unread, onOpenItem, onMarkAllRead, onViewAll, tone = "light" }) {
  const [open, setOpen] = useState(false);
  const recent = notifications.slice(0, 8);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread.length > 0 ? `Notificaciones: ${unread.length} sin leer` : "Notificaciones"}
          className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            tone === "dark" ? "text-white/80 hover:text-white hover:bg-white/10" : "text-foreground/70 hover:text-foreground hover:bg-muted"
          }`}
        >
          <Bell className="w-5 h-5" />
          {unread.length > 0 && (
            <span className="absolute top-1 right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <p className="font-heading font-semibold text-sm text-foreground">Notificaciones</p>
          {unread.length > 0 && (
            <button type="button" onClick={onMarkAllRead} className="text-xs font-medium text-brand-blue hover:underline">
              Marcar todo como leído
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aquí verás tus novedades: citas, reseñas y el estado de tu perfil.</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/40">
            {recent.map((n) => (
              <NotificationItem key={n.id} n={n} onOpen={(item) => { setOpen(false); onOpenItem(item); }} />
            ))}
          </div>
        )}
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={() => { setOpen(false); onViewAll(); }}
            className="w-full py-3 text-sm font-medium text-brand-blue hover:bg-muted/50 border-t border-border/60"
          >
            Ver todas
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
