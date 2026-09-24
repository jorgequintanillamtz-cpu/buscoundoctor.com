import React from "react";
import { RotateCcw, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FONT_OPTIONS, STYLE_PRESETS } from "@/lib/storefrontThemes";

const DEFAULT_BG = "#2D7D72"; // teal, mismo default que el tema clásico
const DEFAULT_ACCENT = "#F8F7F0"; // CREAM

function ColorField({ label, value, onChange, fallback }) {
  const current = value || fallback;
  return (
    <div>
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-2 mt-1.5">
        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-input cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
          className="flex-1 h-10 text-sm border border-input rounded-lg px-3 bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
        />
      </div>
    </div>
  );
}

/**
 * Panel de estilo de la página pública: color de fondo, color de contraste
 * (botones/acentos), color de letra y tipografía. Todo opcional -- si se
 * deja vacío, la página usa el tema clásico de siempre (ver
 * resolveStorefrontStyle en storefrontThemes.js). Cambios pasan por el
 * mismo onChange (updateStorefront) que ya usa el resto del editor, con el
 * mismo autoguardado. Vive inline debajo de la vista previa (colapsable con
 * el botón "Editar estilo" que lo monta/desmonta), no como modal.
 */
export default function StorefrontStyleEditor({ storefront, onChange }) {
  const reset = () => {
    onChange({ bg_color: null, accent_color: null, font_family: null, text_color: null });
  };

  const applyPreset = (preset) => {
    onChange({ bg_color: preset.bg_color, accent_color: preset.accent_color, text_color: preset.text_color });
  };

  const textMode = storefront.text_color === "dark" ? "dark" : "light";

  return (
    <div className="bg-card rounded-2xl border border-border/50 mt-3">
        <div className="p-4 border-b border-border/50">
          <h2 className="font-heading font-bold text-sm text-foreground">Editar estilo</h2>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Combinaciones rápidas</Label>
            <div className="grid grid-cols-4 gap-2">
              {STYLE_PRESETS.map((preset) => {
                const isSelected =
                  (storefront.bg_color || DEFAULT_BG) === preset.bg_color &&
                  (storefront.accent_color || DEFAULT_ACCENT) === preset.accent_color;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`rounded-xl border p-1.5 transition-colors ${
                      isSelected ? "border-primary" : "border-border/60 hover:border-border"
                    }`}
                    title={preset.label}
                  >
                    <div
                      className="w-full aspect-square rounded-lg flex items-center justify-center relative"
                      style={{ background: preset.bg_color }}
                    >
                      <span className="w-3.5 h-3.5 rounded-full" style={{ background: preset.accent_color }} />
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">{preset.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <ColorField
            label="Color de fondo"
            value={storefront.bg_color}
            fallback={DEFAULT_BG}
            onChange={(v) => onChange({ bg_color: v })}
          />
          <ColorField
            label="Color de contraste (botones y acentos)"
            value={storefront.accent_color}
            fallback={DEFAULT_ACCENT}
            onChange={(v) => onChange({ accent_color: v })}
          />

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Color de letra</Label>
            <p className="text-[11px] text-muted-foreground mb-1.5">Usa negra si pusiste un fondo claro.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ text_color: "light" })}
                className={`rounded-xl border p-2.5 flex items-center gap-2 transition-colors ${
                  textMode === "light" ? "border-primary bg-accent/40" : "border-border/60 hover:bg-accent/20"
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-slate-800 border border-border flex items-center justify-center text-white text-xs font-bold">A</span>
                <span className="text-sm text-foreground">Blanca</span>
              </button>
              <button
                type="button"
                onClick={() => onChange({ text_color: "dark" })}
                className={`rounded-xl border p-2.5 flex items-center gap-2 transition-colors ${
                  textMode === "dark" ? "border-primary bg-accent/40" : "border-border/60 hover:bg-accent/20"
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center text-[#1D1D1B] text-xs font-bold">A</span>
                <span className="text-sm text-foreground">Negra</span>
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Tipografía</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(FONT_OPTIONS).map(([key, font]) => {
                const isSelected = (storefront.font_family || "plus-jakarta") === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange({ font_family: key })}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      isSelected ? "border-primary bg-accent/40" : "border-border/60 hover:bg-accent/20"
                    }`}
                  >
                    <p className="text-lg leading-none" style={{ fontFamily: font.value }}>Aa</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{font.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={reset} className="rounded-xl gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer al tema clásico
          </Button>
        </div>
    </div>
  );
}
