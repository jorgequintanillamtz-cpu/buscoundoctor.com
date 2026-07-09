import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import moment from "moment";

export default function BlogCard({ post, priority = false }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block bg-card rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
    >
      <div className="aspect-video bg-accent flex items-center justify-center overflow-hidden">
        {post.image ? (
          <img src={post.image} alt={post.title} loading={priority ? "eager" : "lazy"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center">
            <span className="font-heading font-bold text-2xl text-primary/30">BD</span>
          </div>
        )}
      </div>
      <div className="p-5">
        {post.category && (
          <span className="text-xs font-medium text-primary bg-accent px-2.5 py-1 rounded-full">
            {post.category}
          </span>
        )}
        <h3 className="font-heading font-semibold text-foreground mt-3 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{post.excerpt}</p>
        )}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {moment(post.created_date).format("DD MMM YYYY")}
          </span>
          <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            Leer más <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}