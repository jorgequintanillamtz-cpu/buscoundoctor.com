import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/components/admin/NotificationBell";

// Lista completa de notificaciones del médico (las últimas 50).
export default function DoctorNotifications({ notifications, unread, onOpenItem, onMarkAllRead }) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-heading font-bold text-xl text-foreground">Notificaciones</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unread.length > 0 ? `Tienes ${unread.length} sin leer.` : "Estás al día."}
          </p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" className="rounded-xl" onClick={onMarkAllRead}>Marcar todo como leído</Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 py-14 text-center">
          <Bell className="w-9 h-9 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">Aquí verás tus novedades: citas, reseñas y el estado de tu perfil.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/40">
          {notifications.map((n) => <NotificationItem key={n.id} n={n} onOpen={onOpenItem} />)}
        </div>
      )}
    </div>
  );
}
