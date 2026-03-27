import { forwardRef } from "react";
import { Link } from "react-router-dom";
import ContractAddress from "@/components/ContractAddress";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  return (
    <footer className="border-t border-border py-12">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-gradient-primary">MEEET</span>
              <span className="text-xs text-muted-foreground">{t("footer.tagline")}</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground font-body">
              
              <Link to="/tokenomics" className="hover:text-foreground transition-colors">$MEEET</Link>
              <Link to="/live" className="hover:text-foreground transition-colors">{t("footer.liveMap")}</Link>
            </div>
          </div>
          <div className="flex justify-center">
            <ContractAddress variant="inline" />
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
