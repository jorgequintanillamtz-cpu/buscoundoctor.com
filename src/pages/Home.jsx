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
      <section className="relative overflow-hidden" style={{background: 'linear-gradient(160deg, #fff5f0 0%, #ffe8e0 25%, #fff0ea 50%, #fde8d8 75%, #fff8f5 100%)'}}>        
        {/* Mesh gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{position:'absolute',top:'-10%',left:'-5%',width:'55%',height:'70%',background:'radial-gradient(ellipse at center, rgba(255,182,153,0.45) 0%, transparent 70%)',filter:'blur(48px)'}} />
          <div style={{position:'absolute',top:'20%',right:'-10%',width:'50%',height:'65%',background:'radial-gradient(ellipse at center, rgba(255,160,130,0.35) 0%, transparent 70%)',filter:'blur(56px)'}} />
          <div style={{position:'absolute',bottom:'-15%',left:'30%',width:'55%',height:'60%',background:'radial-gradient(ellipse at center, rgba(253,210,180,0.4) 0%, transparent 70%)',filter:'blur(52px)'}} />
          <div style={{position:'absolute',top:'10%',left:'40%',width:'35%',height:'50%',background:'radial-gradient(ellipse at center, rgba(255,240,230,0.6) 0%, transparent 70%)',filter:'blur(40px)'}} />
          {/* fade to white at bottom */}
          <div style={{position:'absolute',bottom:0,left:0,right:0,height:'40%',background:'linear-gradient(to bottom, transparent, #ffffff)'}} />
        </div>
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4" style={{background:'#ffffff'}}>
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