// Convierte una imagen a WebP (más liviana) y la renombra antes de subirla,
// usando canvas en el navegador. Si algo falla (formato no soportado, ya es
// un PDF, etc.), se resuelve con el archivo original tal cual en vez de
// bloquear el flujo que lo llamó -- por eso es seguro usarlo también en
// inputs que a veces reciben PDFs (ej. documentos de verificación): si el
// archivo no es una imagen que el navegador pueda decodificar, simplemente
// se sube sin tocar.
//
// Se usa en cualquier lugar donde un doctor sube una foto (perfil, galería,
// casos de éxito, publicaciones, consultorios, tecnología y tratamientos,
// blog) para evitar que fotos pesadas de celular (5-15 MB es común) se
// suban tal cual: aquí se bajan a un máximo de 1600px de lado más largo y
// se recomprimen a calidad 0.85, que en la práctica deja el archivo entre
// 100-400 KB sin pérdida visible perceptible, acelerando tanto la subida
// como la carga del perfil para el paciente que lo visita después.
//
// filename es opcional: si no se da, se deriva del nombre original
// reemplazando la extensión por .webp (o un nombre genérico con timestamp
// si el original no tiene nombre usable).
export function fileToWebP(file, filename) {
  const outName = filename || (file?.name ? file.name.replace(/\.[^./\\]+$/, "") + ".webp" : `imagen-${Date.now()}.webp`);
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
        resolve(new File([blob], outName, { type: "image/webp" }));
      }, "image/webp", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
