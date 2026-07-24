import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Image as ImageIcon } from "lucide-react";

export default function SpecialistPosts({ specialistId }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await base44.entities.SpecialistPost.filter({ specialist_id: specialistId });
        if (!active) return;
        setPosts(list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [specialistId]);

  if (loading || posts.length === 0) return null;

  return (
    <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg text-foreground">Publicaciones</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {posts.map((p) => (
          <div key={p.id} className="border border-border/50 rounded-2xl overflow-hidden">
            <img src={p.image_url} alt={p.caption} className="w-full h-44 object-cover" />
            <div className="p-3">
              <p className="text-sm text-foreground leading-relaxed">{p.caption}</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {new Date(p.created_date).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
