import React from "react";
import { FileText } from "lucide-react";

/**
 * Diseño "receta escrita a mano" para el resumen de consulta.
 *
 * - Fondo tipo papel (crema/hueso) con box-shadow que simula una hoja física.
 * - Membrete en sans-serif (nombre del doctor) para contraste intencional.
 * - Texto del resumen en Kalam (fuente manuscrita legible a tamaño de párrafo).
 * - Solo el resumen lleva este estilo; la reseña y productos se quedan normales.
 *
 * Se renderiza sobre el fondo teal de la página — la hoja crema resalta
 * como una receta física sobre un escritorio.
 */
export default function HandwrittenSummary({ summaryText, doctorName }) {
  return (
    <div
      className="rounded-lg p-6 sm:p-8"
      style={{
        background: "#FBF8F1",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)",
        border: "1px solid #E8E0D0",
      }}
    >
      {/* Membrete */}
      <div
        className="flex items-center gap-2 pb-3 mb-4"
        style={{ borderBottom: "1px solid #D4C9B0" }}
      >
        <FileText className="w-4 h-4" style={{ color: "#6B5D4A" }} />
        <span
          className="text-sm font-semibold"
          style={{ color: "#6B5D4A" }}
        >
          {doctorName || "Resumen de consulta"}
        </span>
      </div>

      {/* Texto manuscrito */}
      <p
        className="whitespace-pre-line"
        style={{
          fontFamily: "'Kalam', cursive",
          fontSize: "18px",
          color: "#3A2E1F",
          lineHeight: "1.8",
        }}
      >
        {summaryText}
      </p>
    </div>
  );
}