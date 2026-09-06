import React, { useState, useEffect, useRef } from "react";
import SignaturePlayback from "./SignaturePlayback";

/**
 * Diseño "receta escrita a mano" para el resumen de consulta.
 *
 * - Fondo tipo papel (crema/hueso) con box-shadow que simula una hoja física.
 * - Membrete en sans-serif (nombre del doctor + "Tu resumen") para contraste.
 * - Texto del resumen en fuente manuscrita (Kalam o Caveat según pref).
 * - Efecto máquina de escribir: el texto se revela progresivamente al cargar,
 *   con un cursor tipo punta de pluma. Respeta prefers-reduced-motion.
 * - La firma del doctor se anima al final del resumen (esquina inferior derecha).
 * - La sección de calificación aparece solo después de que termina la firma.
 * - Llama onAnimationComplete cuando toda la animación termina (texto + firma).
 */
export default function HandwrittenSummary({
  summaryText,
  doctorName,
  doctorPhoto,
  font = "kalam",
  signatureStrokes,
  onAnimationComplete,
  children,
}) {
  const fontFamily = font === "caveat" ? "'Caveat', cursive" : "'Kalam', cursive";
  const fontSize = font === "caveat" ? "22px" : "18px";

  // --- Efecto máquina de escribir ---
  // isTyping empieza en true para evitar que onAnimationComplete dispare
  // antes de que comience la animación.
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [signatureDone, setSignatureDone] = useState(!signatureStrokes);

  const onAnimationCompleteRef = useRef(onAnimationComplete);
  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayedText(summaryText);
      setIsTyping(false);
      return;
    }

    setDisplayedText("");
    setIsTyping(true);
    let index = 0;
    const speed = 35;
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

  // Dispara onAnimationComplete cuando texto Y firma terminaron
  useEffect(() => {
    if (!isTyping && signatureDone) {
      onAnimationCompleteRef.current?.();
    }
  }, [isTyping, signatureDone]);

  const handleSignatureComplete = () => {
    setSignatureDone(true);
  };

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

      {/* Firma del doctor (esquina inferior derecha, después de escribir) */}
      {signatureStrokes && !isTyping && (
        <div className="flex justify-end mt-4">
          <SignaturePlayback
            strokesJson={signatureStrokes}
            width={180}
            height={90}
            onComplete={handleSignatureComplete}
          />
        </div>
      )}

      {/* Reseña — solo aparece después de que termina la firma */}
      {children && !isTyping && signatureDone && (
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid #DCE9FF" }}>
          {children}
        </div>
      )}
    </div>
  );
}