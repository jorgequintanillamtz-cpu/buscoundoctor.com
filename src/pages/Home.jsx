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
  const [zones, setZones] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [specs, specialists, zoneList, blogPosts] = await Promise.all([
        base44.entities.Specialty.filter({ active: true }),
        base44.entities.Specialist.filter({ featured: true, active: true }),
        base44.entities.Zone.filter({ active: true }),
        base44.entities.BlogPost.filter({ published: true }, "-created_date", 3),
      ]);
      setSpecialties(specs);
      setFeatured(specialists);
      setZones(zoneList);
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
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-card border border-border/50 rounded-full px-4 py-1.5 mb-6">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Monterrey, Nuevo León</span>
            </div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight tracking-tight">
              Encuentra doctores y especialistas{" "}
              <span className="text-primary">cerca de ti</span>
            </h1>
            <p className="mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
              Busca por especialidad, zona y disponibilidad. Contacta fácilmente por WhatsApp.
            </p>
            <div className="mt-8 max-w-xl mx-auto">
              <SearchBar />
            </div>
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Especialidades</h2>
            <p className="text-sm text-muted-foreground mt-1">Encuentra al especialista que necesitas</p>
          </div>
          <Link to="/especialistas" className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {specialties.map((s) => (
            <SpecialtyCard key={s.id} specialty={s} />
          ))}
        </div>
      </section>

      {/* Zones */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-8">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Explora por zona</h2>
          <p className="text-sm text-muted-foreground mt-1">Busca especialistas cerca de tu ubicación</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {zones.map((z) => (
            <Link
              key={z.id}
              to={`/especialistas?zone=${encodeURIComponent(z.name)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border/50 rounded-full text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-accent transition-all"
            >
              <MapPin className="w-3.5 h-3.5" />
              {z.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Especialistas destacados</h2>
            <p className="text-sm text-muted-foreground mt-1">Profesionales con las mejores valoraciones</p>
          </div>
          <Link to="/especialistas" className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">
            Ver todos <ArrowRight className="w-4 h-4" />
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
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Blog de salud</h2>
              <p className="text-sm text-muted-foreground mt-1">Artículos y guías para cuidar tu bienestar</p>
            </div>
            <Link to="/blog" className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all">
              Ver todos <ArrowRight className="w-4 h-4" />
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 sm:p-12 text-center">
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-primary-foreground">
            ¿Eres profesional de la salud?
          </h2>
          <p className="text-primary-foreground/80 mt-3 max-w-md mx-auto">
            Únete a nuestra plataforma y conecta con nuevos pacientes en Monterrey
          </p>
          <Button size="lg" variant="secondary" className="mt-6 font-heading font-semibold">
            Registrarme como especialista
          </Button>
        </div>
      </section>
    </div>
  );
}