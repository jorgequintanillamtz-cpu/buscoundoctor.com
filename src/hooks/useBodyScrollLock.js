import { useEffect } from "react";

// Bloquea el desplazamiento de la página de atrás mientras hay un cajón o
// ventana abierta. `document.body.style.overflow = "hidden"` NO basta en
// Safari del iPhone: ahí la página de atrás sigue moviéndose si el dedo
// arrastra sobre la franja oscura o sobre un menú que no desborda, y se sienten
// "varios scrolls" a la vez. El truco que sí funciona es fijar el body
// (`position: fixed`) en el punto donde estaba y restaurar el scroll al cerrar.
export default function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const y = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, y);
    };
  }, [active]);
}
