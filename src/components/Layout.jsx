import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { applyDefaultOG } from "@/lib/seoMeta";

export default function Layout() {
  const location = useLocation();

  // Apply generic site OG/Twitter defaults on every route change so per-page
  // overrides don't leak across views. Pages set specific values after their
  // async data loads, which run after this synchronous effect.
  useEffect(() => {
    applyDefaultOG();
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}