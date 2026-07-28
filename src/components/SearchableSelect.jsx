import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

/**
 * Combobox con búsqueda: escribes y la lista se filtra en vivo, a diferencia
 * de un <Select> normal que solo deja elegir de una lista cerrada.
 * Se usa en todos los buscadores del sitio (header, home, /especialistas).
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecciona...",
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados.",
  icon: Icon,
  hint,
  triggerClassName = "",
  contentClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between gap-1 w-full text-left outline-none",
            triggerClassName
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "p-0 rounded-2xl border-none shadow-2xl bg-white w-[min(90vw,420px)]",
          contentClassName
        )}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="text-sm" />
          <CommandList>
            <CommandEmpty className="py-4 text-sm text-muted-foreground">{emptyText}</CommandEmpty>
            <CommandGroup className="p-2">
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={o.name}
                  onSelect={() => {
                    onChange(o.id === value ? "" : o.id);
                    setOpen(false);
                  }}
                  className="rounded-xl px-3 py-2 text-sm cursor-pointer gap-2.5 data-[selected=true]:bg-brand-bluePale data-[selected=true]:text-brand-navy"
                >
                  {Icon && (
                    <span className="w-6 h-6 rounded-full bg-brand-bluePale flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-brand-blue" />
                    </span>
                  )}
                  <span className="flex-1 min-w-0">{o.name}</span>
                  {hint && <span className="text-xs text-muted-foreground flex-shrink-0">{hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
