// Convierte una imagen a WebP (más liviana) y la renombra antes de subirla,
// usando canvas en el navegador. Si algo falla (formato no soportado, etc.),
// se resuelve con el archivo original tal cual en vez de bloquear el flujo
// que lo llamó. Usado por RegistroMedico.jsx (registro real) y
// AdminVistaRegistro.jsx (vista de previsualización del admin) — vive aparte
// para que ambos compartan exactamente la misma lógica de conversión.
export function fileToWebP(file, filename) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) { resolve(file); return; }
        resolve(new File([blob], filename, { type: "image/webp" }));
      }, "image/webp", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
