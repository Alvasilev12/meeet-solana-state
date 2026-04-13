import { Link, useLocation } from "react-router-dom";
import { Home, Search, Bot, Swords, LayoutDashboard } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const HIDDEN_ON = ["/live", "/tg"];

const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  if (HIDDEN_ON.some(p => pathname.startsWith(p))) return null;

  const ITEMS = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/discoveries", icon: Search, label: t("nav.explore") },
    { href: "/marketplace", icon: Bot, label: t("nav.agents") },
    { href: "/arena", icon: Swords, label: t("nav.arenaNav") },
    { href: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
  ];

  return (
    <>
      <div className="md:hidden h-16" />
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {ITEMS.map(({ href, icon: Icon, label }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                to={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors duration-150 ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[9px] font-semibold leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
