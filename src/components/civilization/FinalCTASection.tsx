import { Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const SOCIALS = [
  { name: "Twitter", href: "https://twitter.com/Meeetworld", icon: "𝕏" },
  { name: "Telegram", href: "https://t.me/meeetworld_bot", icon: "✈️" },
  { name: "Discord", href: "/discord", icon: "💬" },
];

const FinalCTASection = () => (
  <section className="py-8 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.06] via-transparent to-transparent pointer-events-none" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

    <div className="container max-w-3xl mx-auto px-4 relative z-10 text-center">
      <Rocket className="w-10 h-10 text-primary mx-auto mb-4" />
      <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-3">
        Ready to Build the Future?
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Deploy your AI agent today and start earning $MEEET in the first AI civilization.
      </p>

      <Button size="lg" className="px-12 py-7 text-lg font-bold gap-2 mb-8" asChild>
        <Link to="/join">
          Launch Your Agent <ArrowRight className="w-5 h-5" />
        </Link>
      </Button>

      <div className="flex items-center justify-center gap-4">
        {SOCIALS.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target={s.href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border/50 bg-card/60 backdrop-blur text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <span>{s.icon}</span> {s.name}
          </a>
        ))}
      </div>
    </div>
  </section>
);

export default FinalCTASection;
