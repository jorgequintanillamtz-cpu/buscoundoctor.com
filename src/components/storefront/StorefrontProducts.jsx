import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight } from "lucide-react";
import { CREAM, INK } from "@/lib/storefrontThemes";

/**
 * Sección pública de productos digitales del doctor.
 * Cada tarjeta es clickeable y lleva a la página de detalle
 * /dr/:slug/producto/:productId. Se mantiene el pill "Disponible pronto"
 * como indicador visual (sin cobro aún — Fase 5).
 */
export default function StorefrontProducts({ items, theme, storefrontSlug }) {
  return (
    <section id="productos" className="scroll-mt-4">
      <h2 className="flex items-center gap-2 font-heading font-bold text-lg text-white mb-3">
        <BookOpen className="w-5 h-5" style={{ color: CREAM }} />
        Guías y recursos
      </h2>
      <div className="space-y-3">
        {items.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            theme={theme}
            storefrontSlug={storefrontSlug}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product, theme, storefrontSlug }) {
  const hasPrice = typeof product.price === "number" && product.price >= 0;
  const cover =
    Array.isArray(product.images) && product.images.length
      ? product.images[0]
      : product.cover_image || "";
  const detailUrl = `/dr/${storefrontSlug}/producto/${product.id}`;
  return (
    <Link
      to={detailUrl}
      className="block rounded-2xl p-4 flex gap-3 items-center active:scale-[0.99] transition-transform"
      style={{ background: theme.card, border: `1px solid ${theme.border}` }}
    >
      <div
        className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: theme.deep }}
      >
        {cover ? (
          <img src={cover} alt={product.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="w-6 h-6 text-white/70" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white text-sm leading-tight truncate">
          {product.title}
        </p>
        {product.description && (
          <p className="text-white/60 text-xs mt-0.5 line-clamp-2">
            {product.description}
          </p>
        )}
        {hasPrice && (
          <p className="text-sm font-bold mt-1" style={{ color: CREAM }}>
            ${product.price.toFixed(0)} MXN
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span
          className="text-[10px] font-semibold px-2.5 py-1 rounded-full opacity-90"
          style={{ background: CREAM, color: INK }}
        >
          Disponible pronto
        </span>
        <span className="flex items-center text-white/50 text-xs font-medium">
          Ver más
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}