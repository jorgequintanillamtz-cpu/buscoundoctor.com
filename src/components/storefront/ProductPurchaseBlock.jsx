import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Lock, Loader2, CheckCircle2, Clock, Download, AlertCircle } from "lucide-react";
import { CREAM, INK } from "@/lib/storefrontThemes";

/**
 * Bloque de compra del detalle de producto (Fase 5).
 *
 * Tres estados:
 *  1. Regreso de Stripe (?sale=ID): muestra "confirmando" → "pagado" (link de
 *     descarga) o "procesando" si el webhook aún no llegó.
 *  2. Sin Stripe conectado: mantiene el botón "Disponible pronto".
 *  3. Stripe conectado: formulario (nombre/teléfono/email) + botón "Comprar"
 *     que crea el checkout y redirige a Stripe.
 *
 * Sin login. Sin exponer file_url (la descarga pasa por downloadProductFile).
 */
export default function ProductPurchaseBlock({ product, slug, theme }) {
  const [searchParams] = useSearchParams();
  const saleId = searchParams.get("sale");

  const [stripeConnected, setStripeConnected] = useState(null); // null=cargando
  const [form, setForm] = useState({ buyer_name: "", buyer_phone: "", buyer_email: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [saleStatus, setSaleStatus] = useState(null); // null|checking|paid|pending|expired
  const [downloadUrl, setDownloadUrl] = useState("");
  const pollRef = useRef(0);

  // 1. Regreso de Stripe: confirmar el pago y obtener el link
  useEffect(() => {
    if (!saleId) return;
    setSaleStatus("checking");
    let active = true;
    const check = async () => {
      try {
        const res = await base44.functions.invoke("getSaleDownloadLink", { sale_id: saleId });
        if (!active) return;
        const data = res?.data || res;
        if (data.status === "paid" && data.download_url) {
          setSaleStatus("paid");
          setDownloadUrl(data.download_url);
        } else if (data.status === "expired") {
          setSaleStatus("expired");
        } else {
          pollRef.current += 1;
          if (pollRef.current < 10) {
            setTimeout(check, 2500);
          } else {
            setSaleStatus("pending");
          }
        }
      } catch {
        if (active) setSaleStatus("pending");
      }
    };
    check();
    return () => { active = false; };
  }, [saleId]);

  // 2. Modo compra: verificar si el doctor tiene Stripe conectado
  useEffect(() => {
    if (saleId) return;
    let active = true;
    (async () => {
      try {
        const res = await base44.functions.invoke("getProductPurchaseInfo", { product_id: product.id });
        if (!active) return;
        const data = res?.data || res;
        setStripeConnected(!!data.stripe_connected);
      } catch {
        if (active) setStripeConnected(false);
      }
    })();
    return () => { active = false; };
  }, [saleId, product.id]);

  const handleBuy = async (e) => {
    e.preventDefault();
    if (!form.buyer_name.trim() || !form.buyer_email.trim()) {
      setCreateError("Nombre y email son obligatorios");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await base44.functions.invoke("createProductCheckout", {
        product_id: product.id,
        slug,
        buyer_name: form.buyer_name.trim(),
        buyer_phone: form.buyer_phone.trim(),
        buyer_email: form.buyer_email.trim(),
      });
      const data = res?.data || res;
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCreateError(data.error || "No se pudo iniciar el pago");
    } catch (err) {
      setCreateError(err.message || "Error al procesar");
    }
    setCreating(false);
  };

  const inputStyle = {
    background: theme.bg,
    border: `1px solid ${theme.border}`,
  };

  // --- Estado: regreso de Stripe ---
  if (saleId) {
    if (saleStatus === "checking") {
      return (
        <Block theme={theme}>
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: CREAM }} />
          <p className="font-heading font-semibold text-white text-sm">Confirmando tu pago…</p>
          <p className="text-white/60 text-xs mt-1">Esto toma unos segundos.</p>
        </Block>
      );
    }
    if (saleStatus === "paid") {
      return (
        <Block theme={theme}>
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: theme.deep }}>
            <CheckCircle2 className="w-6 h-6" style={{ color: CREAM }} />
          </div>
          <p className="font-heading font-semibold text-white text-sm mb-1">¡Pago confirmado!</p>
          <p className="text-white/60 text-xs mb-4">Tu compra está lista para descargar.</p>
          <a
            href={downloadUrl}
            className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-transform active:scale-95"
            style={{ background: CREAM, color: INK }}
          >
            <Download className="w-4 h-4" />
            Descargar guía
          </a>
          <p className="text-white/50 text-[11px] mt-3 text-center">
            El link vence en 7 días. También lo enviamos a tu correo.
          </p>
        </Block>
      );
    }
    if (saleStatus === "pending") {
      return (
        <Block theme={theme}>
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: theme.deep }}>
            <Clock className="w-6 h-6" style={{ color: CREAM }} />
          </div>
          <p className="font-heading font-semibold text-white text-sm mb-1">Estamos procesando tu pago</p>
          <p className="text-white/60 text-xs">
            Si ya pagaste, te enviaremos el link de descarga a tu correo en breve. Vuelve a intentarlo en un momento.
          </p>
        </Block>
      );
    }
    if (saleStatus === "expired") {
      return (
        <Block theme={theme}>
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: theme.deep }}>
            <AlertCircle className="w-6 h-6" style={{ color: CREAM }} />
          </div>
          <p className="font-heading font-semibold text-white text-sm mb-1">El link de descarga expiró</p>
          <p className="text-white/60 text-xs">Contacta al doctor para volver a recibirlo.</p>
        </Block>
      );
    }
  }

  // --- Sin Stripe conectado: botón "Próximamente" ---
  if (stripeConnected === false) {
    return (
      <Block theme={theme}>
        <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: theme.deep }}>
          <Lock className="w-5 h-5 text-white/80" />
        </div>
        <p className="font-heading font-semibold text-white text-sm mb-1">Disponible pronto</p>
        <p className="text-white/60 text-xs">
          Próximamente podrás comprar y descargar esta guía aquí mismo.
        </p>
      </Block>
    );
  }

  // --- Cargando estado de conexión ---
  if (stripeConnected === null) {
    return (
      <Block theme={theme}>
        <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: CREAM }} />
      </Block>
    );
  }

  // --- Formulario de compra ---
  const priceLabel = typeof product.price === "number"
    ? `Comprar $${product.price.toFixed(0)} MXN`
    : "Comprar";

  return (
    <Block theme={theme}>
      <p className="font-heading font-semibold text-white text-sm mb-3 text-center">
        Compra y descarga inmediata
      </p>
      <form onSubmit={handleBuy} className="space-y-2.5">
        <input
          type="text"
          placeholder="Nombre completo"
          value={form.buyer_name}
          onChange={(e) => setForm({ ...form, buyer_name: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/40 outline-none"
          style={inputStyle}
          required
        />
        <input
          type="tel"
          placeholder="Teléfono (opcional)"
          value={form.buyer_phone}
          onChange={(e) => setForm({ ...form, buyer_phone: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/40 outline-none"
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="Correo electrónico"
          value={form.buyer_email}
          onChange={(e) => setForm({ ...form, buyer_email: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/40 outline-none"
          style={inputStyle}
          required
        />
        <button
          type="submit"
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-transform active:scale-95 disabled:opacity-60"
          style={{ background: CREAM, color: INK }}
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : priceLabel}
        </button>
      </form>
      {createError && (
        <p className="text-red-300 text-xs mt-2 text-center">{createError}</p>
      )}
      <p className="text-white/50 text-[11px] mt-3 text-center">
        Pago seguro vía Stripe. Recibirás el link de descarga aquí y en tu correo.
      </p>
    </Block>
  );
}

function Block({ theme, children }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: theme.card, border: `1px solid ${theme.border}` }}
    >
      {children}
    </div>
  );
}