import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Heart, MapPin, FileText, Calendar } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({ specialists: 0, specialties: 0, zones: 0, posts: 0, requests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [specialists, specialties, zones, posts, requests] = await Promise.all([
        base44.entities.Specialist.list(),
        base44.entities.Specialty.list(),
        base44.entities.Zone.list(),
        base44.entities.BlogPost.list(),
        base44.entities.AppointmentRequest.list(),
      ]);
      setStats({
        specialists: specialists.length,
        specialties: specialties.length,
        zones: zones.length,
        posts: posts.length,
        requests: requests.length,
      });
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { label: "Especialistas", value: stats.specialists, icon: Users, color: "text-primary" },
    { label: "Especialidades", value: stats.specialties, icon: Heart, color: "text-pink-500" },
    { label: "Zonas", value: stats.zones, icon: MapPin, color: "text-orange-500" },
    { label: "Artículos", value: stats.posts, icon: FileText, color: "text-blue-500" },
    { label: "Solicitudes", value: stats.requests, icon: Calendar, color: "text-purple-500" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-card rounded-2xl border border-border/50 p-5">
            <card.icon className={`w-6 h-6 ${card.color} mb-3`} />
            <p className="font-heading font-bold text-2xl text-foreground">{card.value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}