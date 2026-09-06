import React from "react";

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
export default function HandwrittenSummary({ summaryText, doctorName, doctorPhoto, font = "kalam" }) {
  const fontFamily = font === "caveat" ? "'Caveat', cursive" : "'Kalam', cursive";
  const fontSize = font === "caveat" ? "20px" : "18px";
  return (
    <div
      className="rounded-lg p-6 sm:p-8"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)",
        border: "1px solid #DCE9FF",
      }}
    >
      {/* Membrete */}
      <div
        className="flex items-center gap-3 pb-3 mb-4"
        style={{ borderBottom: "1px solid #DCE9FF" }}
      >
        {doctorPhoto && (
          <img
            src={doctorPhoto}
            alt={doctorName}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        )}
        <span
          className="text-sm font-semibold"
          style={{ color: "#0B1E4D" }}
        >
          {doctorName || "Resumen de consulta"}
        </span>
      </div>

      {/* Texto manuscrito */}
      <p
        className="whitespace-pre-line"
        style={{
          fontFamily,
          fontSize,
          color: "#0B1E4D",
          lineHeight: "1.8",
        }}
      >
        {summaryText}
      </p>
    </div>
  );
}