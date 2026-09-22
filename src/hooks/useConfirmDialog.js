import { useCallback, useRef, useState } from "react";

// Reemplaza el confirm()/window.confirm() gris del navegador por el mismo
// diálogo bonito que ya se usa en el resto del sitio (AlertDialog), sin
// tener que rehacer cada pantalla a mano: `const { confirm, dialogProps } =
// useConfirmDialog()`, luego `if (!(await confirm({...}))) return;` donde
// antes había un `confirm(...)`, y `<ConfirmDialog {...dialogProps} />` una
// vez en el JSX de la página.
export function useConfirmDialog() {
  const [state, setState] = useState(null); // { title, description, confirmLabel, destructive } | null
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState(typeof options === "string" ? { description: options } : options);
    });
  }, []);

  const resolve = (result) => {
    setState(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  };

  return {
    confirm,
    dialogProps: {
      state,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    },
  };
}
