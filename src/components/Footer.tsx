import { forwardRef } from "react";
import { Link } from "react-router-dom";
import ContractAddress from "@/components/ContractAddress";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Twitter, Github, MessageCircle, BookOpen, Shield, FileText, Globe, Send } from "lucide-react";

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const linkClass = "hover:text-foreground transition-colors";

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

      {/* Links grid */}
      <div className="py-12 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <span className="font-display font-bold text-gradient-primary text-xl">MEEET</span>
              <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">{t("footer.tagline")}</p>
              <div className="flex items-center gap-3 mt-4">
                <a href="https://x.com/Meeetworld" target="_blank" rel="noopener noreferrer" className={`text-muted-foreground ${linkClass}`} aria-label="Twitter/X">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="https://github.com/akvasileevv/meeet-solana-state" target="_blank" rel="noopener noreferrer" className={`text-muted-foreground ${linkClass}`} aria-label="GitHub">
                  <Github className="w-5 h-5" />
                </a>
                <a href="https://t.me/meeetworld" target="_blank" rel="noopener noreferrer" className={`text-muted-foreground ${linkClass}`} aria-label="Telegram">
                  <Send className="w-5 h-5" />
                </a>
                <a href="https://discord.gg/meeet" target="_blank" rel="noopener noreferrer" className={`text-muted-foreground ${linkClass}`} aria-label="Discord">
                  <MessageCircle className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-primary" /> Explore</h4>
              <ul className="space-y-2 text-xs text-muted-foreground font-body">
                <li><Link to="/quests" className={linkClass}>{t("nav.quests")}</Link></li>
                <li><Link to="/arena" className={linkClass}>{t("nav.arena")}</Link></li>
                <li><Link to="/rankings" className={linkClass}>{t("nav.rankings")}</Link></li>
                <li><Link to="/oracle" className={linkClass}>Oracle</Link></li>
                <li><Link to="/map" className={linkClass}>{t("footer.liveMap")}</Link></li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-primary" /> Community</h4>
              <ul className="space-y-2 text-xs text-muted-foreground font-body">
                <li><Link to="/parliament" className={linkClass}>{t("nav.parliament")}</Link></li>
                <li><Link to="/guilds" className={linkClass}>Guilds</Link></li>
                <li><Link to="/herald" className={linkClass}>{t("nav.herald")}</Link></li>
                <li><Link to="/discoveries" className={linkClass}>Discoveries</Link></li>
                <li><Link to="/about" className={linkClass}>About</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Legal</h4>
              <ul className="space-y-2 text-xs text-muted-foreground font-body">
                <li><Link to="/terms" className={linkClass}>Terms of Service</Link></li>
                <li><Link to="/privacy" className={linkClass}>Privacy Policy</Link></li>
                <li><Link to="/cookies" className={linkClass}>Cookie Policy</Link></li>
                <li><Link to="/token" className={linkClass}>$MEEET Token</Link></li>
                <li><Link to="/disclaimer" className={linkClass}>Disclaimer</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <ContractAddress variant="inline" />
            <p className="text-[10px] text-muted-foreground font-mono">© {new Date().getFullYear()} MEEET STATE. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = "Footer";
export default Footer;
