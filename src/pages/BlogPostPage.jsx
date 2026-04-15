import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Tag } from "lucide-react";
import moment from "moment";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import SpecialistCard from "../components/SpecialistCard";

// Detecta si el contenido es HTML legado o Markdown puro
function isHtmlContent(content) {
  return /<[a-z][\s\S]*>/i.test(content);
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [specialists, setSpecialists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const results = await base44.entities.BlogPost.filter({ slug });
      if (results.length > 0) {
        const p = results[0];
        setPost(p);
        
        // Update document title and meta tags for SEO
        document.title = `${p.title} | BuscounDoctor`;
        document.querySelector('meta[name="description"]')?.setAttribute('content', p.meta_description || p.excerpt || '');
        
        if (p.featured_specialists?.length > 0) {
          const all = await base44.entities.Specialist.filter({ active: true });
          setSpecialists(all.filter(s => p.featured_specialists.includes(s.slug)));
        }
      }
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

      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 pt-4 border-t border-border/30">
          {post.tags.map((tag, i) => (
            <span key={i} className="text-xs flex items-center gap-1 bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      <h1 className="font-heading font-bold text-2xl sm:text-4xl text-foreground leading-tight mb-6">{post.title}</h1>

      {post.excerpt && (
        <p className="text-lg text-muted-foreground leading-relaxed mb-8 border-l-4 border-primary/30 pl-4">
          {post.excerpt}
        </p>
      )}

      <article className="prose prose-slate max-w-none prose-headings:font-heading prose-headings:font-bold prose-a:text-primary prose-p:leading-relaxed prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4 prose-h2:text-2xl prose-h2:mt-7 prose-h2:mb-3 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2 prose-img:rounded-xl prose-img:my-4 prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-xl prose-ul:list-disc prose-ol:list-decimal prose-li:my-1 prose-hr:border-border">
        {isHtmlContent(post.content) ? (
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, { ...defaultSchema, attributes: { ...defaultSchema.attributes, code: ['className'], span: ['className'], div: ['className'] } }]]}>{post.content}</ReactMarkdown>
        )}
      </article>

      {specialists.length > 0 && (
        <div className="mt-8">
          <h3 className="font-heading font-bold text-xl text-foreground mb-4">Especialistas recomendados</h3>
          <div className="grid grid-cols-1 gap-4">
            {specialists.map(s => (
              <SpecialistCard key={s.id} specialist={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}