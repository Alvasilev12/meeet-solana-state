import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface Item {
  title: string;
  description: string;
  href: string;
  icon: string;
}

interface Props {
  title?: string;
  items: Item[];
}

/**
 * Cross-link block used at the bottom of trust-infrastructure pages
 * (Crosswalk, Passport Grades, Trust API, Minister Dashboard, etc.).
 */
export default function RelatedPages({ title = "Related pages", items }: Props) {
  if (!items || items.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 my-12">
      <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <Link
            key={it.href}
            to={it.href}
            className="group rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 hover:border-primary/40 transition-colors flex items-start gap-3"
          >
            <span className="text-2xl shrink-0">{it.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                {it.title}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {it.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
