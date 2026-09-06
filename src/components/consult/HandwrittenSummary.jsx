import React, { useState, useEffect } from "react";

/**
 * Diseño "receta escrita a mano" para el resumen de consulta.
 *
 * - Fondo tipo papel (crema/hueso) con box-shadow que simula una hoja física.
 * - Membrete en sans-serif (nombre del doctor + "Tu resumen") para contraste.
 * - Texto del resumen en fuente manuscrita (Kalam o Caveat según pref).
 * - Efecto máquina de escribir: el texto se revela progresivamente al cargar,
 *   con un cursor tipo punta de pluma. Respeta prefers-reduced-motion.
 * - Solo el resumen lleva este estilo; la reseña y productos se quedan normales.
 */
export default function HandwrittenSummary({ summaryText, doctorName, doctorPhoto, font = "kalam", children }) {
  const fontFamily = font === "caveat" ? "'Caveat', cursive" : "'Kalam', cursive";
  const fontSize = font === "caveat" ? "22px" : "18px";

  // --- Efecto máquina de escribir ---
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Respeta prefers-reduced-motion: muestra todo de inmediato
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayedText(summaryText);
      setIsTyping(false);
      return;
    }

    setDisplayedText("");
    setIsTyping(true);
    let index = 0;
    const speed = 35; // ms por carácter
    const interval = setInterval(() => {
      if (index < summaryText.length) {
        setDisplayedText(summaryText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [summaryText]);

  return (
    <div
      className="rounded-lg p-6 sm:p-8"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)",
        border: "1px solid #DCE9FF",
      }}
    >
      {/* Membrete: foto + nombre + "Tu resumen" */}
      <div
        className="flex items-start gap-3 pb-3 mb-4"
        style={{ borderBottom: "1px solid #DCE9FF" }}
      >
        {doctorPhoto && (
          <img
            src={doctorPhoto}
            alt={doctorName}
            className="rounded-full object-cover flex-shrink-0"
            style={{ width: "58px", height: "58px" }}
          />
        )}
        <div className="min-w-0 pt-0.5">
          <span
            className="font-semibold block"
            style={{ fontSize: "17px", color: "#0B1E4D" }}
          >
            {doctorName || "Resumen de consulta"}
          </span>
          <p
            className="font-heading font-bold mt-0.5"
            style={{ fontSize: "15px", color: "#0B1E4D" }}
          >
            Tu resumen
          </p>
        </div>
      </div>

      {/* Texto manuscrito con efecto máquina de escribir */}
      <p
        className="whitespace-pre-line"
        style={{
          fontFamily,
          fontSize,
          color: "#0B1E4D",
          lineHeight: "1.8",
        }}
      >
        {displayedText}
        {isTyping && (
          <span
            className="inline-block ml-0.5 align-middle animate-pulse"
            style={{ width: "2px", height: "0.9em", background: "#0B1E4D" }}
          />
        )}
      </p>

      {/* Reseña */}
      {children && (
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid #DCE9FF" }}>
          {children}
        </div>
      )}
    </div>
  );
}