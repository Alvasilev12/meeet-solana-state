import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, LogOut, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const NAV_LINKS = [
    { href: "/about", label: "О проекте" },
    { href: "/world", label: t("nav.world") },
    { href: "/quests", label: t("nav.quests") },
    { href: "/oracle", label: "🔮 Oracle" },
    { href: "/warnings", label: "⚠️ Warnings" },
    { href: "/deploy", label: "🚀 Deploy" },
    { href: "/world/rankings", label: t("nav.rankings") },
    { href: "/tokenomics", label: t("nav.meeet") },
  ];

  const MORE_LINKS = [
    { href: "/discoveries", label: t("nav.discoveries") },
    { href: "/arena", label: t("nav.arena") },
    { href: "/parliament", label: t("nav.parliament") },
  ];

  const ALL_LINKS = [...NAV_LINKS, ...MORE_LINKS];

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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-display font-bold tracking-tight">
            <span className="text-gradient-primary">MEEET</span>
          </span>
          <span className="text-xs text-muted-foreground font-body hidden sm:inline whitespace-nowrap">Solana State</span>
        </Link>

        <div className="hidden lg:flex items-center gap-5 font-body text-sm text-muted-foreground whitespace-nowrap">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} to={l.href} className="hover:text-foreground transition-colors duration-150">
              {l.label}
            </Link>
          ))}
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

        <div className="flex items-center gap-2 shrink-0">
          <LanguageSwitcher />

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

          {user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden lg:block px-4 py-2 text-sm font-display font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150"
              >
                {t("nav.dashboard")}
              </Link>
              <button
                onClick={signOut}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm font-display text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="hidden lg:block px-4 py-2 text-sm font-display font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150"
            >
              {t("nav.signIn")}
            </Link>
          )}
          <button
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-fade-up">
          <div className="container max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3">
            {ALL_LINKS.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                onClick={() => setOpen(false)}
                className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors py-2 border-b border-border last:border-0"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="mt-2 w-full px-4 py-2.5 text-sm font-display font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150 text-center block"
                >
                  {t("nav.dashboard")}
                </Link>
                <button
                  onClick={() => { signOut(); setOpen(false); }}
                  className="w-full px-4 py-2.5 text-sm font-display font-semibold border border-border text-muted-foreground rounded-lg hover:text-foreground transition-colors duration-150"
                >
                  {t("nav.signOut")}
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="mt-2 w-full px-4 py-2.5 text-sm font-display font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150 text-center block"
              >
                {t("nav.signIn")}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
