import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import BlogCard from "../components/BlogCard";

export default function BlogList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const results = await base44.entities.BlogPost.filter({ published: true }, "-created_date");
      setPosts(results);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">Blog de salud</h1>
        <p className="text-muted-foreground mt-1">Artículos y guías para cuidar tu bienestar</p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No hay artículos publicados aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}