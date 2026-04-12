import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchBar from "../components/SearchBar";
import SpecialtyCard from "../components/SpecialtyCard";
import SpecialistCard from "../components/SpecialistCard";
import BlogCard from "../components/BlogCard";

export default function Home() {
  const [specialties, setSpecialties] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [specs, specialists, blogPosts] = await Promise.all([
        base44.entities.Specialty.filter({ active: true }),
        base44.entities.Specialist.filter({ featured: true, active: true }),
        base44.entities.BlogPost.filter({ published: true }, "-created_date", 3),
      ]);
      setSpecialties(specs);
      setFeatured(specialists);
      setPosts(blogPosts);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-accent/50 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6 sm:pt-12 sm:pb-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-card border border-border/50 rounded-full px-4 py-1.5 mb-4">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Monterrey, Nuevo León</span>
            </div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight tracking-tight">
              <span>Encuentra los mejores doctores y especialistas de </span>
              <span className="text-primary">Nuevo León</span>
            </h1>
            <div className="mt-5 max-w-xl mx-auto">
              <SearchBar />
            </div>
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Especialidades</h2>
          <Link to="/especialistas" className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">
            <span>Ver todas</span> <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {specialties.map((s) => (
            <SpecialtyCard key={s.id} specialty={s} />
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Especialistas destacados</h2>
          <Link to="/especialistas" className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">
            <span>Ver todos</span> <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featured.map((s) => (
            <SpecialistCard key={s.id} specialist={s} />
          ))}
        </div>
      </section>

      {/* Blog */}
      {posts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Blog de salud</h2>
            <Link to="/blog" className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">
              <span>Ver todos</span> <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {posts.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10">
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 sm:p-12 text-center">
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-primary-foreground">
            <span>¿Eres profesional de la salud?</span>
          </h2>
          <p className="text-primary-foreground/80 mt-3 max-w-md mx-auto">
            <span>Únete a nuestra plataforma y conecta con nuevos pacientes en Monterrey</span>
          </p>
          <Button size="lg" variant="secondary" className="mt-6 font-heading font-semibold">
            <span>Registrarme como especialista</span>
          </Button>
        </div>
      </section>
    </div>
  );
}