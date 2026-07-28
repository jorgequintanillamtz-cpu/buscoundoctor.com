import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Campo de texto con autocompletado: escribes directo en el recuadro y la
 * lista se filtra en vivo, desplegándose debajo (igual que el buscador de
 * Doctoralia). Se usa en todos los buscadores del sitio.
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecciona...",
  emptyText = "Sin resultados.",
  icon: Icon,
  hint,
  triggerClassName = "",
  contentClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find((o) => o.id === value);

  // Mientras el usuario no esté escribiendo, el campo muestra el nombre elegido.
  useEffect(() => {
    if (!open) setQuery(selected ? selected.name : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const selectOption = (o) => {
    onChange(o.id === value ? "" : o.id);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className={cn("flex items-center gap-1", triggerClassName)}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={(e) => { setOpen(true); e.target.select(); }}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground truncate"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setOpen((o) => !o); inputRef.current?.focus(); }}
          className="flex-shrink-0"
        >
          <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 top-full mt-2 z-50 max-h-80 overflow-y-auto rounded-2xl border-none shadow-xl bg-white p-2",
            contentClassName
          )}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">{emptyText}</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => selectOption(o)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-left transition-colors hover:bg-brand-bluePale hover:text-brand-navy",
                  o.id === value && "bg-brand-bluePale text-brand-navy"
                )}
              >
                {Icon && (
                  <span className="w-8 h-8 rounded-full bg-brand-bluePale flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-brand-blue" />
                  </span>
                )}
                <span className="flex-1 min-w-0 truncate">{o.name}</span>
                {hint && <span className="text-xs text-muted-foreground flex-shrink-0">{hint}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
