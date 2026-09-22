import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Avisos del médico (nuevas citas, reseñas, documentos, estado del perfil).
// Se refrescan solos cada minuto y al volver a la pestaña.
export function useDoctorNotifications(specialistId) {
  const queryClient = useQueryClient();
  const key = ["doctor-notifications", specialistId];

  const { data: notifications = [] } = useQuery({
    queryKey: key,
    queryFn: () => base44.entities.DoctorNotification.filter({ specialist_id: specialistId }, "-created_date", 50),
    enabled: !!specialistId,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const unread = useMemo(() => notifications.filter((n) => !n.read_at), [notifications]);
  const unreadBySection = useMemo(() => {
    const counts = {};
    unread.forEach((n) => { if (n.section) counts[n.section] = (counts[n.section] || 0) + 1; });
    return counts;
  }, [unread]);

  // ids = lista de avisos; sin ids marca todos. Se actualiza la lista al instante y luego se confirma en la base.
  const markRead = useCallback(async (ids) => {
    const key = ["doctor-notifications", specialistId];
    const target = ids && ids.length ? new Set(ids) : null;
    const now = new Date().toISOString();
    queryClient.setQueryData(key, (prev = []) =>
      prev.map((n) => (!n.read_at && (!target || target.has(n.id)) ? { ...n, read_at: now } : n))
    );
    try {
      await base44.functions.invoke("markNotificationsRead", { ids });
    } catch {
      queryClient.invalidateQueries({ queryKey: key });
    }
  }, [queryClient, specialistId]);

  return { notifications, unread, unreadBySection, markRead };
}
