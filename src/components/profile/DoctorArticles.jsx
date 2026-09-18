import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Newspaper, ChevronLeft, ChevronRight } from "lucide-react";
import BlogCard from "../BlogCard";

// Artículos que este mismo especialista escribió y BuscoUnDoctor ya publicó
// (ver DoctorBlogSubmit.jsx). Solo cuentan como públicos los que tienen
// `published: true` -- igual que BlogList.jsx/BlogPostPage.jsx, que nunca
// revisan `review_status` (ese campo es solo para el flujo interno de
// aprobación en AdminBlog.jsx).
export default function DoctorArticles({ specialistId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const posts = await base44.entities.BlogPost.filter({ submitted_by_specialist_id: specialistId, published: true });
        if (active) setItems(posts);
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [specialistId]);

  if (loading || items.length === 0) return null;

  const scrollBy = (dir) => scrollerRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg text-foreground">Artículos de este especialista</h2>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Ver anteriores"
            className="w-8 h-8 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Ver siguientes"
            className="w-8 h-8 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div ref={scrollerRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1">
        {items.map((post) => (
          <div key={post.id} className="w-64 flex-shrink-0 snap-start">
            <BlogCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
}
