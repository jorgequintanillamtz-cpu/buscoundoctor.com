import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import BlogCard from "../components/BlogCard";
import { Stethoscope } from "lucide-react";

export default function BlogList() {
  const [posts, setPosts] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [activeSpecialty, setActiveSpecialty] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [postResults, specialtyResults] = await Promise.all([
        base44.entities.BlogPost.filter({ published: true }, "-created_date"),
        base44.entities.Specialty.filter({ active: true }),
      ]);
      setPosts(postResults);
      setSpecialties(specialtyResults);
      setLoading(false);
    }
    load();
  }, []);

  // Solo mostramos como filtro las especialidades que de verdad tienen artículos,
  // para no ofrecer pestañas vacías.
  const specialtiesWithPosts = useMemo(() => {
    const idsWithPosts = new Set(posts.map((p) => p.specialty_id).filter(Boolean));
    return specialties
      .filter((s) => idsWithPosts.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [posts, specialties]);

  const filteredPosts = useMemo(() => {
    if (!activeSpecialty) return posts;
    return posts.filter((p) => p.specialty_id === activeSpecialty);
  }, [posts, activeSpecialty]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">Blog de salud</h1>
        <p className="text-muted-foreground mt-1">Artículos y guías para cuidar tu bienestar</p>
      </div>

      {specialtiesWithPosts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveSpecialty("")}
            className={`text-sm font-medium px-4 py-1.5 rounded-full border transition-colors ${
              activeSpecialty === ""
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Todos
          </button>
          {specialtiesWithPosts.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSpecialty(s.id)}
              className={`text-sm font-medium px-4 py-1.5 rounded-full border transition-colors ${
                activeSpecialty === s.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {filteredPosts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            {activeSpecialty ? "No hay artículos de esta especialidad todavía." : "No hay artículos publicados aún."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredPosts.map((post, i) => (
            <BlogCard key={post.id} post={post} priority={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
