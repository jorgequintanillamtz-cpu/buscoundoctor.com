import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Tag, ChevronDown } from "lucide-react";
import moment from "moment";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SpecialistCard from "../components/SpecialistCard";
import BlogCard from "../components/BlogCard";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

// Detecta si el contenido es HTML legado o Markdown puro
function isHtmlContent(content) {
  return /<[a-z][\s\S]*>/i.test(content);
}

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function childrenToText(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(childrenToText).join('');
  if (children && typeof children === 'object' && 'props' in children) return childrenToText(children.props.children);
  return '';
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [specialists, setSpecialists] = useState([]);
  const [specialty, setSpecialty] = useState(null);
  const [related, setRelated] = useState([]);
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

        if (p.specialty_id) {
          try {
            const spec = await base44.entities.Specialty.get(p.specialty_id);
            setSpecialty(spec);
            let rel = (await base44.entities.BlogPost.filter({ specialty_id: p.specialty_id, published: true }))
              .filter(r => r.slug !== p.slug)
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            if (rel.length < 3) {
              const recent = (await base44.entities.BlogPost.filter({ published: true }))
                .filter(r => r.slug !== p.slug)
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
              const have = new Set([p.id, ...rel.map(r => r.id)]);
              rel = [...rel, ...recent.filter(r => !have.has(r.id)).slice(0, 3 - rel.length)];
            } else {
              rel = rel.slice(0, 3);
            }
            setRelated(rel);
          } catch (e) {
            setSpecialty(null);
            setRelated([]);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  const [tocOpen, setTocOpen] = useState(false);

  // Tabla de contenidos desde encabezados H2
  const toc = useMemo(() => {
    if (!post?.content) return [];
    if (isHtmlContent(post.content)) {
      const items = [];
      const re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
      let m;
      while ((m = re.exec(post.content)) !== null) {
        const text = m[1].replace(/<[^>]+>/g, '').trim();
        if (text) items.push({ id: slugify(text), text });
      }
      return items;
    }
    return post.content
      .split('\n')
      .map(line => {
        const m = line.match(/^##\s+(.+)$/);
        if (!m) return null;
        const text = m[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').trim();
        return text ? { id: slugify(text), text } : null;
      })
      .filter(Boolean);
  }, [post]);

  // HTML legado: inyecta ids en los <h2> para que coincidan con el TOC
  const htmlWithIds = useMemo(() => {
    if (!post?.content || !isHtmlContent(post.content)) return null;
    return post.content.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (full, attrs, inner) => {
      if (/id\s*=/.test(attrs)) return full;
      const text = inner.replace(/<[^>]+>/g, '').trim();
      return `<h2${attrs} id="${slugify(text)}">${inner}</h2>`;
    });
  }, [post]);

  const handleScroll = (e, id) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updatedDifferent = !!post && !!post.updated_date
    && moment(post.updated_date).format('YYYY-MM-DD') !== moment(post.created_date).format('YYYY-MM-DD');

  // Datos estructurados JSON-LD (Article / BlogPosting)
  const jsonLd = post ? {
    '@context': 'https://schema.org',
    '@type': post.schema_type || 'Article',
    headline: post.title,
    datePublished: post.created_date,
    dateModified: post.updated_date || post.created_date,
    author: { '@type': 'Person', name: post.author || 'BuscounDoctor' },
    ...(post.image ? { image: post.image } : {}),
    ...(post.meta_description || post.excerpt ? { description: post.meta_description || post.excerpt } : {}),
  } : null;

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
        {jsonLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        )}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/blog">Blog</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{post.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
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
        <span className="text-xs text-muted-foreground">Publicado el {moment(post.created_date).format("DD MMMM YYYY")}</span>
        {updatedDifferent && (
          <span className="text-xs text-muted-foreground">· Actualizado el {moment(post.updated_date).format("DD MMMM YYYY")}</span>
        )}
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

      {specialty && (
        <div className="mb-8 rounded-2xl bg-primary text-primary-foreground p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-heading font-bold text-lg">Encuentra un {specialty.name} cerca de ti</p>
            <p className="text-sm text-primary-foreground/80 mt-1">Explora especialistas disponibles en tu zona.</p>
          </div>
          <Link to={`/especialidad/${specialty.slug}`} className="inline-flex items-center justify-center rounded-xl bg-background text-primary px-4 py-2 text-sm font-semibold hover:bg-background/90 transition-colors flex-shrink-0">
            Ver {specialty.name}
          </Link>
        </div>
      )}

      {toc.length > 0 && (
        <nav className="mb-8 rounded-2xl border border-border/50 bg-card p-4">
          <button
            type="button"
            onClick={() => setTocOpen(o => !o)}
            className="flex items-center justify-between w-full text-sm font-heading font-semibold text-foreground"
          >
            <span>Tabla de contenidos</span>
            <ChevronDown className={`w-4 h-4 transition-transform sm:hidden ${tocOpen ? 'rotate-180' : ''}`} />
          </button>
          <ul className={`mt-3 space-y-1.5 text-sm border-t border-border/30 pt-3 ${tocOpen ? 'block' : 'hidden'} sm:block`}>
            {toc.map(item => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleScroll(e, item.id)}
                  className="text-muted-foreground hover:text-primary transition-colors block py-0.5"
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <article className="max-w-none text-foreground">
        {isHtmlContent(post.content) ? (
          <div dangerouslySetInnerHTML={{ __html: htmlWithIds || post.content }} />
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}

            components={{
              h1: ({children}) => <h1 className="text-3xl font-heading font-bold mt-8 mb-4 leading-snug">{children}</h1>,
              h2: ({children}) => {
                const id = slugify(childrenToText(children));
                return <h2 id={id} className="text-2xl font-heading font-bold mt-7 mb-3 leading-snug scroll-mt-24">{children}</h2>;
              },
              h3: ({children}) => <h3 className="text-xl font-heading font-semibold mt-6 mb-2 leading-snug">{children}</h3>,
              h4: ({children}) => <h4 className="text-lg font-heading font-semibold mt-5 mb-2">{children}</h4>,
              p: ({children}) => <p className="mb-4 leading-relaxed">{children}</p>,
              ul: ({children}) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
              li: ({children}) => <li className="mb-1 leading-relaxed">{children}</li>,
              blockquote: ({children}) => <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-6">{children}</blockquote>,
              code: ({inline, children, className}) => inline
                ? <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                : <pre className="bg-muted p-4 rounded-xl overflow-x-auto mb-4"><code className="font-mono text-sm">{children}</code></pre>,
              pre: ({children}) => <>{children}</>,
              a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>,
              img: ({src, alt}) => <img src={src} alt={alt} className="rounded-xl max-w-full my-4" />,
              hr: () => <hr className="border-0 border-t border-border my-8" />,
              strong: ({children}) => <strong className="font-bold">{children}</strong>,
              em: ({children}) => <em className="italic">{children}</em>,
            }}
          >{post.content}</ReactMarkdown>
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

      {specialty && related.length > 0 && (
        <div className="mt-10">
          <h3 className="font-heading font-bold text-xl text-foreground mb-4">Artículos relacionados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map(r => (
              <BlogCard key={r.id} post={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}