import React from "react";
import { FileText, Download } from "lucide-react";

/**
 * Preview de cómo se vería la tarjeta del producto al público.
 * Sin botón de compra (la fase de checkout viene después).
 */
export default function ProductCardPreview({ product }) {
  const price =
    product?.price != null && product.price !== ""
      ? `$${Number(product.price).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MXN`
      : "—";

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm w-full max-w-xs">
      <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
        {(() => {
          const imgs = Array.isArray(product?.images) ? product.images : [];
          const cover = imgs.length ? imgs[0] : product?.cover_image;
          return cover ? (
            <img src={cover} alt={product?.title || "Producto"} className="w-full h-full object-cover" />
          ) : (
            <FileText className="w-10 h-10 text-muted-foreground/50" />
          );
        })()}
      </div>
      <div className="p-3.5">
        <p className="font-heading font-semibold text-sm text-foreground line-clamp-2 min-h-[2.5rem]">
          {product?.title || "Título del producto"}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2rem]">
          {product?.description || "Descripción del producto digital."}
        </p>
        <div className="flex items-center justify-between mt-3">
          <span className="font-heading font-bold text-base text-foreground">{price}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Download className="w-3.5 h-3.5" />
            PDF
          </span>
        </div>
      </div>
    </div>
  );
}