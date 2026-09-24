import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { getStorefrontTheme, CREAM, INK } from "@/lib/storefrontThemes";
import ProductPurchaseBlock from "@/components/storefront/ProductPurchaseBlock";

/**
 * Página de detalle pública de un producto digital del storefront.
 * Ruta: /dr/:slug/producto/:productId
 *
 * Estructura:
 *  1. Galería de imágenes (carrusel simple con thumbnails).
 *  2. Título, descripción completa y precio.
 *  3. Bloque de pago placeholder ("Disponible pronto") — maquetado para que la
 *     Fase 5 solo inserte el componente de checkout aquí.
 *  4. Botón para volver al storefront del doctor.
 *
 * Sin login. Sin exponer file_url (los datos vienen de getPublicDoctorProducts).
 */
export default function StorefrontProductDetail() {
  const { slug, productId } = useParams();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [storefront, setStorefront] = useState(null);
  const [product, setProduct] = useState(null);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        // 1. Resolver el storefront por slug (lectura pública vía RLS status=active)
        const sfs = await base44.entities.DoctorStorefront.filter({
          slug,
          status: "active",
        });
        const sf = sfs && sfs[0];
        if (!sf) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (cancelled) return;
        setStorefront(sf);

        // 2. Traer el detalle del producto (valida doctor_id + status=active)
        const res = await base44.functions.invoke("getPublicDoctorProducts", {
          doctor_id: sf.doctor_id,
          product_id: productId,
        });
        if (cancelled) return;
        const productData = res?.data?.product || res?.product;
        if (productData) {
          setProduct(productData);
        } else {
          setNotFound(true);
        }
      } catch (e) {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, productId]);

  useEffect(() => {
    if (product) {
      const imgs = product.images && product.images.length ? product.images : [];
      document.title = `${product.title} | ${slug}`;
      setActiveImg(0);
      void imgs;
    }
  }, [product?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f2e29" }}>
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: "#0f2e29" }}
      >
        <p className="text-white font-heading font-bold text-lg">Producto no encontrado</p>
        <Link
          to={`/dr/${slug}`}
          className="text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: CREAM, color: INK }}
        >
          Volver al perfil
        </Link>
      </div>
    );
  }

  const theme = getStorefrontTheme(storefront?.color_theme);
  const images = product.images && product.images.length
    ? product.images
    : product.cover_image
    ? [product.cover_image]
    : [];
  const hasPrice = typeof product.price === "number" && product.price >= 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: CREAM }}
      >
        <Link
          to={`/dr/${slug}`}
          className="flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: INK }}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
        <span
          className="inline-block text-xs px-3 py-1.5 rounded-full text-white/70"
          style={{ background: theme.pill }}
        >
          buscoundoctor.com/dr/{slug}
        </span>
      </header>

      <main className="max-w-md w-full mx-auto px-5 py-6 space-y-6 flex-1">
        {/* 1. Galería de imágenes */}
        {images.length > 0 ? (
          <div className="space-y-3">
            <div
              className="rounded-2xl overflow-hidden aspect-square flex items-center justify-center"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <img
                src={images[activeImg]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-opacity"
                    style={{
                      border: i === activeImg ? `2px solid ${CREAM}` : `1px solid ${theme.border}`,
                      opacity: i === activeImg ? 1 : 0.6,
                    }}
                  >
                    <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="rounded-2xl aspect-square flex items-center justify-center"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <BookOpen className="w-16 h-16 text-white/40" />
          </div>
        )}

        {/* 2. Título, descripción y precio */}
        <div className="space-y-2">
          <h1 className="font-heading font-bold text-xl text-white leading-tight">
            {product.title}
          </h1>
          {hasPrice && (
            <p className="font-heading font-bold text-2xl flex items-center gap-2" style={{ color: CREAM }}>
              ${product.price.toFixed(0)} MXN
              {typeof product.compare_at_price === "number" && product.compare_at_price > 0 && (
                <span className="text-base font-medium line-through text-white/50">
                  ${product.compare_at_price.toFixed(0)}
                </span>
              )}
            </p>
          )}
          {product.description && (
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}
        </div>

        {/* 3. Checkout (Fase 5) */}
        <ProductPurchaseBlock product={product} slug={slug} theme={theme} />

        {/* 4. Botón volver al storefront */}
        <Link
          to={`/dr/${slug}`}
          className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-2xl transition-colors"
          style={{ background: CREAM, color: INK }}
        >
          <ArrowLeft className="w-4 h-4" />
          Ver perfil del doctor
        </Link>
      </main>
    </div>
  );
}