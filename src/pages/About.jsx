import { Link } from "react-router-dom";
import { Heart, Search, Shield, Users } from "lucide-react";

export default function About() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="font-heading font-bold text-4xl text-foreground mb-6">
        Sobre BuscoUnDoctor.com
      </h1>

      <p className="text-lg text-muted-foreground leading-relaxed mb-6">
        <strong className="text-foreground">BuscoUnDoctor.com</strong> es el directorio médico de referencia en Monterrey, Nuevo León, diseñado para conectar a pacientes con los mejores especialistas de salud de la región de forma rápida, confiable y completamente gratuita.
      </p>

      <p className="text-base text-muted-foreground leading-relaxed mb-6">
        Sabemos lo difícil que puede ser encontrar al médico adecuado cuando más se necesita. Por eso construimos una plataforma donde puedes buscar doctores por especialidad, zona o nombre, leer reseñas reales de otros pacientes y contactar directamente al especialista a través de WhatsApp o correo electrónico, sin intermediarios ni largas esperas.
      </p>

      <p className="text-base text-muted-foreground leading-relaxed mb-8">
        Nuestro directorio incluye médicos generales, psicólogos, ginecólogos, pediatras, dentistas, cardiólogos y muchas especialidades más. Cada perfil es verificado y mantenido actualizado para garantizar que la información que ves sea precisa y útil al momento de tomar una decisión sobre tu salud.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <div className="bg-card border border-border/50 rounded-2xl p-6 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground mb-1">Búsqueda fácil</h2>
            <p className="text-sm text-muted-foreground">Encuentra especialistas por nombre, especialidad o zona de Monterrey en segundos.</p>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-6 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground mb-1">Perfiles verificados</h2>
            <p className="text-sm text-muted-foreground">Cada médico listado cuenta con cédula profesional y datos de contacto verificados.</p>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-6 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground mb-1">Reseñas de pacientes</h2>
            <p className="text-sm text-muted-foreground">Lee opiniones auténticas de otros pacientes para elegir con confianza.</p>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-6 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground mb-1">Gratis para pacientes</h2>
            <p className="text-sm text-muted-foreground">El uso del directorio es completamente gratuito para todos los pacientes que lo consultan.</p>
          </div>
        </div>
      </div>

      <p className="text-base text-muted-foreground leading-relaxed mb-6">
        BuscoUnDoctor.com es desarrollado y mantenido por un equipo local de Monterrey apasionado por mejorar el acceso a la salud en México. Creemos que encontrar un buen médico no debería ser complicado, y trabajamos todos los días para que esa búsqueda sea lo más sencilla posible.
      </p>

      <p className="text-base text-muted-foreground leading-relaxed">
        ¿Eres médico o especialista y quieres aparecer en nuestro directorio?{" "}
        <Link to="/contacto" className="text-primary hover:underline font-medium">Contáctanos</Link>{" "}
        y con gusto te ayudamos a crear tu perfil.
      </p>
    </main>
  );
}