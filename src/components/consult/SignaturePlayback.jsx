import React, { useRef, useEffect, useState } from "react";

/**
 * Reproduce la firma del doctor como animación (se dibuja progresivamente).
 *
 * - Recibe los trazos en JSON (mismo formato que guarda SignaturePad).
 * - Anima punto por punto con requestAnimationFrame, ~3s en total.
 * - Respeta prefers-reduced-motion: dibuja todo de inmediato.
 * - Se ejecuta una sola vez al montarse.
 */
export default function SignaturePlayback({ strokesJson, width = 180, height = 90 }) {
  const canvasRef = useRef(null);
  const [parsedStrokes, setParsedStrokes] = useState([]);

  useEffect(() => {
    if (!strokesJson) {
      setParsedStrokes([]);
      return;
    }
    try {
      const parsed = JSON.parse(strokesJson);
      if (Array.isArray(parsed)) {
        setParsedStrokes(parsed);
      } else {
        setParsedStrokes([]);
      }
    } catch {
      setParsedStrokes([]);
    }
  }, [strokesJson]);

  useEffect(() => {
    if (!parsedStrokes.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    ctx.strokeStyle = "#0B1E4D";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (prefersReducedMotion) {
      parsedStrokes.forEach((stroke) => {
        if (stroke.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x * width, stroke[0].y * height);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x * width, stroke[i].y * height);
        }
        ctx.stroke();
      });
      return;
    }

    // Calcular velocidad: ~3s de animación sin importar el tamaño
    const totalSegments = parsedStrokes.reduce(
      (sum, s) => sum + Math.max(0, s.length - 1),
      0
    );
    const segmentsPerFrame = Math.max(1, Math.ceil(totalSegments / 180));

    let strokeIdx = 0;
    let pointIdx = 1;

    // Posicionar el "lápiz" al inicio del primer trazo
    if (parsedStrokes[0] && parsedStrokes[0].length > 0) {
      ctx.beginPath();
      ctx.moveTo(parsedStrokes[0][0].x * width, parsedStrokes[0][0].y * height);
    }

    const animate = () => {
      let drawnThisFrame = 0;
      while (drawnThisFrame < segmentsPerFrame && strokeIdx < parsedStrokes.length) {
        const stroke = parsedStrokes[strokeIdx];
        if (pointIdx < stroke.length) {
          ctx.lineTo(stroke[pointIdx].x * width, stroke[pointIdx].y * height);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(stroke[pointIdx].x * width, stroke[pointIdx].y * height);
          pointIdx++;
          drawnThisFrame++;
        } else {
          strokeIdx++;
          pointIdx = 1;
          if (strokeIdx < parsedStrokes.length && parsedStrokes[strokeIdx].length > 0) {
            ctx.beginPath();
            ctx.moveTo(parsedStrokes[strokeIdx][0].x * width, parsedStrokes[strokeIdx][0].y * height);
          }
        }
      }
      if (strokeIdx < parsedStrokes.length) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [parsedStrokes, width, height]);

  if (!strokesJson) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", height: "auto", maxWidth: `${width}px` }}
    />
  );
}