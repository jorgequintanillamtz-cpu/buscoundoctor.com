import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Save, Loader2 } from "lucide-react";

/**
 * Lienzo donde el doctor dibuja su firma una sola vez.
 *
 * - Captura los trazos como puntos normalizados (0-1) para que la firma
 *   se vea igual en cualquier tamaño de canvas.
 * - Los trazos se guardan como JSON en DoctorConsultPreferences.signature_strokes.
 * - En la página pública, SignaturePlayback los reproduce como animación.
 */
export default function SignaturePad({ onSave, initialStrokes }) {
  const canvasRef = useRef(null);
  const [strokes, setStrokes] = useState([]);
  const currentStrokeRef = useRef([]);
  const isDrawingRef = useRef(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const allStrokesRef = useRef([]);

  const W = 320;
  const H = 160;

  useEffect(() => {
    if (initialStrokes) {
      try {
        const parsed = JSON.parse(initialStrokes);
        if (Array.isArray(parsed)) {
          allStrokesRef.current = parsed;
          setStrokes(parsed);
          drawAll(parsed);
        }
      } catch {
        // JSON inválido, ignorar
      }
    }
  }, [initialStrokes]);

  const drawAll = (allStrokes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#0B1E4D";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    allStrokes.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x * W, stroke[0].y * H);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x * W, stroke[i].y * H);
      }
      ctx.stroke();
    });
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    isDrawingRef.current = true;
    canvasRef.current.setPointerCapture(e.pointerId);
    const pos = getPos(e);
    currentStrokeRef.current = [pos];
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(pos.x * W, pos.y * H);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const pos = getPos(e);
    currentStrokeRef.current.push(pos);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(pos.x * W, pos.y * H);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current.length > 1) {
      allStrokesRef.current = [...allStrokesRef.current, currentStrokeRef.current];
      setStrokes(allStrokesRef.current);
      setHasChanges(true);
    }
    currentStrokeRef.current = [];
  };

  const handleClear = () => {
    allStrokesRef.current = [];
    setStrokes([]);
    setHasChanges(true);
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, W, H);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(allStrokesRef.current);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full max-w-[320px] rounded-xl border-2 border-dashed border-border bg-white touch-none cursor-crosshair"
        style={{ aspectRatio: `${W} / ${H}` }}
      />
      <p className="text-[11px] text-muted-foreground mt-1.5">
        Dibuja tu firma con el mouse o el dedo. Se animará en el resumen de tus pacientes.
      </p>
      <div className="flex gap-2 mt-2">
        <Button type="button" variant="outline" size="sm" onClick={handleClear} className="rounded-lg gap-1.5">
          <Eraser className="w-3.5 h-3.5" />
          Borrar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="rounded-lg gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Guardar firma
        </Button>
      </div>
    </div>
  );
}