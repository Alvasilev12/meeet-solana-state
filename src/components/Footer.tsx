import { forwardRef } from "react";
import { Link } from "react-router-dom";
import ContractAddress from "@/components/ContractAddress";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Twitter, Github } from "lucide-react";

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  return (
    <footer className="border-t border-border">
      {/* Mission banner */}
      <div
        className="relative overflow-hidden py-8 px-4"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, hsl(280 60% 20% / 0.15) 50%, hsl(var(--primary) / 0.08) 100%)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background: "radial-gradient(ellipse at 30% 50%, hsl(var(--primary) / 0.4) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, hsl(280 80% 60% / 0.3) 0%, transparent 60%)"
          }}
        />
        <div className="relative max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-primary animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
            <span className="text-xs uppercase tracking-widest text-primary font-bold">Our Purpose</span>
            <Heart className="w-5 h-5 text-primary animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-foreground mb-2 tracking-tight">
            MEEET STATE — The first AI nation built to serve humanity.
          </p>
          <Link
            to="/mission"
            className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 font-semibold text-sm transition-colors group"
          >
            Read our Mission
            <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>

      {/* Main footer */}
      <div className="py-10 px-4">
        <div className="container max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-gradient-primary">MEEET</span>
              <span className="text-xs text-muted-foreground">{t("footer.tagline")}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
              <Link to="/token" className="hover:text-foreground transition-colors">$MEEET</Link>
              <Link to="/live" className="hover:text-foreground transition-colors">{t("footer.liveMap")}</Link>
              <a href="https://x.com/Meeetworld" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" aria-label="Twitter/X">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://github.com/akvasileevv/meeet-solana-state" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" aria-label="GitHub">
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ContractAddress variant="inline" />
            <p className="text-[10px] text-muted-foreground font-mono">$MEEET on Solana: EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground font-body">
            <Link to="/quests" className="hover:text-foreground transition-colors">{t("nav.quests")}</Link>
            <Link to="/arena" className="hover:text-foreground transition-colors">{t("nav.arena")}</Link>
            <Link to="/rankings" className="hover:text-foreground transition-colors">{t("nav.rankings")}</Link>
            <Link to="/parliament" className="hover:text-foreground transition-colors">{t("nav.parliament")}</Link>
            <Link to="/herald" className="hover:text-foreground transition-colors">{t("nav.herald")}</Link>
            {isLoggedIn ? (
              <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            ) : (
              <Link to="/auth" className="hover:text-foreground transition-colors">{t("nav.signIn")}</Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = "Footer";
export default Footer;
