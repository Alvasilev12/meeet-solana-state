import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, Bell, ChevronDown, Twitter, Github, Sun, Moon, Users } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NavWalletButton from "@/components/NavWalletButton";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const location = useLocation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { onlineCitizens, activeAgents } = useRealtimePresence(location.pathname);

  const NAV_LINKS = [
    ...(user ? [{ href: "/dashboard", label: "🤖 " + (t("nav.world") === "Мир" ? "Мои агенты" : "My Agents") }] : []),
    { href: "/marketplace", label: "🛍️ Marketplace" },
    { href: "/about", label: t("nav.world") === "Мир" ? "О проекте" : "About" },
    { href: "/world", label: t("nav.world") },
    { href: "/skills", label: "⚡ Skills" },
    { href: "/activity", label: "🔴 Live" },
    { href: "/chat", label: "💬 Chat" },
    { href: "/launch", label: "🚀 Launch", glow: true },
    { href: "/oracle", label: "🔮 Oracle" },
    { href: "/deploy", label: "🚀 Deploy" },
    { href: "/arena", label: t("nav.arena") },
    { href: "/leaderboard", label: t("nav.rankings") },
    { href: "/token", label: "💰 $MEEET" },
  ];

  const MORE_LINKS = [
    { href: "/reports", label: "📊 Reports" },
    { href: "/intellra", label: "🛒 Маркетплейс" },
    { href: "/governance", label: "🏛️ Governance" },
    { href: "/staking", label: "🔒 Staking" },
    { href: "/social-graph", label: "🌐 Social Graph" },
    { href: "/attestations", label: "🔐 Attestations" },
    { href: "/social", label: "💬 Social" },
    { href: "/oracle/consensus", label: "🧠 Consensus" },
    { href: "/guilds", label: "🛡️ Guilds" },
    { href: "/discoveries", label: t("nav.discoveries") },
    { href: "/parliament", label: t("nav.parliament") },
    { href: "/monitor", label: "📊 System Monitor" },
    { href: "/simulation", label: "🧪 Simulation Lab" },
  ];

  const ALL_LINKS = [...NAV_LINKS, ...MORE_LINKS];

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notif-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const typeIcons: Record<string, string> = {
    dm: "💬",
    trade: "🔄",
    alliance: "🤝",
    duel: "⚔️",
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="relative text-xl font-display font-bold tracking-tight flex items-center gap-2">
            <span className="text-gradient-primary">MEEET</span>
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_hsl(var(--secondary))]" />
          </span>
          <span className="text-xs text-muted-foreground font-body hidden sm:inline whitespace-nowrap">Solana State</span>
        </Link>
        {/* Online presence counter */}
        <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Users className="w-3 h-3" />
          <span>{onlineCitizens.toLocaleString()}</span>
          <span className="text-border">·</span>
          <span>🤖 {activeAgents.toLocaleString()}</span>
        </div>

        {/* Desktop nav — hidden below md */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4 font-body text-sm text-muted-foreground whitespace-nowrap overflow-x-auto scrollbar-hide">
          {NAV_LINKS.map((l: any) => {
            const isActive = location.pathname === l.href;
            return (
              <Link
                key={l.href}
                to={l.href}
                className={`relative py-1 hover:text-foreground transition-colors duration-150${l.glow ? " text-secondary animate-pulse-glow" : ""}${isActive ? " text-foreground" : ""}`}
              >
                {l.label}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
              </Link>
            );
          })}
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 hover:text-foreground transition-colors duration-150">
                More <ChevronDown className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start">
              {MORE_LINKS.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setMoreOpen(false)}
                  className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Right side: always visible */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a href="https://x.com/Meeetworld" target="_blank" rel="noopener noreferrer" className="hidden sm:flex p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter/X">
            <Twitter className="w-4 h-4" />
          </a>
          <a href="https://github.com/akvasileevv/meeet-solana-state" target="_blank" rel="noopener noreferrer" className="hidden sm:flex p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
            <Github className="w-4 h-4" />
          </a>
          <button
            onClick={toggleTheme}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <LanguageSwitcher />

          {/* Notifications bell */}
          {user && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors duration-150">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-sm font-display font-bold">{t("nav.notifications")}</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[10px] text-primary hover:underline font-body">
                      {t("nav.markAllRead")}
                    </button>
                  )}
                </div>
                <ScrollArea className="max-h-64">
                  {notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground text-xs py-6">{t("nav.noNotifications")}</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.map((n: any) => (
                        <Link
                          key={n.id}
                          to={n.type === "dm" ? "/social" : "/social"}
                          className={`block px-3 py-2.5 hover:bg-muted/50 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-sm mt-0.5">{typeIcons[n.type] || "🔔"}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-body ${!n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                {n.title}
                              </p>
                              {n.body && <p className="text-[10px] text-muted-foreground truncate">{n.body}</p>}
                              <p className="text-[9px] text-muted-foreground mt-0.5">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}

          {/* Wallet + Auth */}
          <NavWalletButton />
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden md:block px-3 py-1.5 text-sm font-display font-semibold bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors duration-150"
              >
                {t("nav.dashboard")}
              </Link>
              <button
                onClick={signOut}
                className="hidden md:flex items-center gap-1.5 p-2 text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="hidden md:block px-3 py-1.5 text-sm font-display font-semibold bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors duration-150"
            >
              {t("nav.signIn")}
            </Link>
          )}

          {/* Hamburger — hidden; bottom tab bar used on mobile instead */}
        </div>
      </div>

    </nav>
  );
};

export default Navbar;
