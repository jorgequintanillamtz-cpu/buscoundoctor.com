import React from "react";
import { BookOpen } from "lucide-react";
import { CREAM, INK } from "@/lib/storefrontThemes";

/**
 * Sección pública de productos digitales del doctor.
 * Muestra TODOS los productos activos (sin tope) con tarjeta (cover/ícono,
 * título, precio) y un botón "Disponible pronto" que NO cobra ni redirige
 * (aún no existe checkout — Fase 4).
 *
 * El botón está aislado vía `onProductAction` para que, cuando exista el
 * checkout, solo se cambie esa acción sin rediseñar la sección.
 */
export default function StorefrontProducts({ items, theme, onProductAction }) {
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
            onProductAction={onProductAction}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product, theme, onProductAction }) {
  const hasPrice = typeof product.price === "number" && product.price >= 0;
  return (
    <div
      className="rounded-2xl p-4 flex gap-3 items-center"
      style={{ background: theme.card, border: `1px solid ${theme.border}` }}
    >
      <div
        className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: theme.deep }}
      >
        {product.cover_image ? (
          <img
            src={product.cover_image}
            alt={product.title}
            className="w-full h-full object-cover"
          />
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
      <button
        type="button"
        disabled
        onClick={() => onProductAction && onProductAction(product)}
        className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-xl opacity-90 cursor-not-allowed"
        style={{ background: CREAM, color: INK }}
      >
        Disponible pronto
      </button>
    </div>
  );
}