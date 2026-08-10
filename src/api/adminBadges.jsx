import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { loadPendingCounts } from "@/api/pendingCounts";

// Antes, el círculo rojo del menú volvía a pedir la lista completa de
// doctores/documentos/artículos de blog en CADA click de navegación,
// incluso yendo a páginas que no tienen nada que ver (Catálogos, FAQs...).
// Este contexto la carga una sola vez al entrar al admin. Las páginas que
// aprueban o rechazan algo (AdminDoctores, AdminVerificaciones, AdminBlog)
// llaman a refresh() justo después de esa acción, así el número se
// actualiza al instante en vez de esperar a la siguiente navegación.
const AdminBadgeContext = createContext({ pendingCounts: {}, refresh: () => {} });

export function AdminBadgeProvider({ children }) {
  const [pendingCounts, setPendingCounts] = useState({});

  const refresh = useCallback(() => {
    loadPendingCounts().then(setPendingCounts).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    // Respaldo silencioso por si alguna acción futura olvida llamar a
    // refresh(): se vuelve a revisar solo cada 5 minutos, no en cada click.
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <AdminBadgeContext.Provider value={{ pendingCounts, refresh }}>
      {children}
    </AdminBadgeContext.Provider>
  );
}

export function useAdminBadges() {
  return useContext(AdminBadgeContext);
}
