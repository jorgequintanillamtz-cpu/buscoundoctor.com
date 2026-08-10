import { useState, useMemo, useEffect } from "react";

// Paginación en el navegador, compartida por todos los listados del admin
// que pueden crecer sin límite (doctores, blog, historial, solicitudes,
// reseñas). No pide páginas al servidor por separado — recorta el arreglo
// que ya se cargó — pero evita renderizar cientos de tarjetas/filas de
// golpe conforme crece el directorio.
//
// `resetKey` es cualquier valor que cambie cuando cambian los filtros o la
// búsqueda (ej. `${search}|${filtro}`), para que al filtrar siempre
// regreses a la página 1 en vez de quedarte en una página que ya no existe.
export function usePaginatedList(items, { pageSize = 20, resetKey } = {}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { pageItems, page, setPage, totalPages, pageSize, total: items.length };
}
