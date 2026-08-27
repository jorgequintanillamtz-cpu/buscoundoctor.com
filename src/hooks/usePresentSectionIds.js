import { useEffect, useState } from "react";

// Varias secciones del perfil público (estudios, tecnología y tratamientos,
// hospitales, servicios, faq...) se auto-ocultan (return null) cuando el
// doctor no cargó nada para esa sección. Este hook detecta, vía el id del
// contenedor de cada sección, cuáles SÍ llegaron a montarse en el DOM --
// para que las barras de navegación del perfil (ScrollSpyNav en escritorio,
// el nav de anclas en móvil) solo muestren títulos que en verdad llevan a
// algo. Varias secciones cargan su contenido de forma asíncrona, así que no
// basta un solo escaneo al montar: se usa un MutationObserver para ir
// sumando ids conforme van apareciendo.
export function usePresentSectionIds(sectionIds) {
  const [presentIds, setPresentIds] = useState(() => new Set());

  useEffect(() => {
    const found = new Set();

    const scan = () => {
      let changed = false;
      sectionIds.forEach((id) => {
        if (found.has(id)) return;
        if (document.getElementById(id)) {
          found.add(id);
          changed = true;
        }
      });
      if (changed) setPresentIds(new Set(found));
    };

    scan();
    const mutationObserver = new MutationObserver(scan);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => mutationObserver.disconnect();
  }, [sectionIds]);

  return presentIds;
}
