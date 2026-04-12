import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import moment from "moment";

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const results = await base44.entities.BlogPost.filter({ slug });
      if (results.length > 0) setPost(results[0]);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-heading font-bold text-2xl text-foreground">Artículo no encontrado</h1>
        <Link to="/blog" className="text-primary mt-4 inline-block">Ver todos los artículos</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ChevronLeft className="w-4 h-4" />
        Volver al blog
      </Link>

      {post.image && (
        <div className="aspect-video rounded-2xl overflow-hidden mb-8 bg-muted">
          <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {post.category && (
          <span className="text-xs font-medium text-primary bg-accent px-3 py-1 rounded-full">{post.category}</span>
        )}
        <span className="text-xs text-muted-foreground">{moment(post.created_date).format("DD MMMM YYYY")}</span>
        {post.author && <span className="text-xs text-muted-foreground">· {post.author}</span>}
      </div>

      <h1 className="font-heading font-bold text-2xl sm:text-4xl text-foreground leading-tight mb-6">{post.title}</h1>

      {post.excerpt && (
        <p className="text-lg text-muted-foreground leading-relaxed mb-8 border-l-4 border-primary/30 pl-4">
          {post.excerpt}
        </p>
      )}

      <article className="prose prose-slate max-w-none prose-headings:font-heading prose-headings:font-semibold prose-a:text-primary prose-p:leading-relaxed">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </article>
    </div>
  );
}