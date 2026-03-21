import { Link, useLocation } from "react-router-dom";
import { Home, Map, FileCheck, Sparkles, User } from "lucide-react";

const items = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/live", icon: Map, label: "Map" },
  { href: "/arena", icon: FileCheck, label: "Review" },
  { href: "/oracle", icon: Sparkles, label: "Oracle" },
  { href: "/profile", icon: User, label: "Profile" },
];

// Pages where the bottom nav should be hidden (full-screen experiences)
const HIDDEN_ON = ["/live", "/world", "/tg"];

const MobileBottomNav = () => {
  const { pathname } = useLocation();

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom">
      <div className="flex items-center justify-around h-14">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              to={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors duration-150 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[9px] font-display font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
