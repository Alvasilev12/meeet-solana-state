import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, Bell, ChevronDown, Sun, Moon, Users } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

import NavWalletButton from "@/components/NavWalletButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";

interface NavDropdownItem {
  href: string;
  label: string;
  icon: string;
}

interface NavItem {
  href: string;
  label: string;
  children?: NavDropdownItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/discoveries",
    label: "Explore",
    children: [
      { href: "/discoveries", label: "Discoveries", icon: "🔬" },
      { href: "/herald", label: "Herald", icon: "📰" },
      { href: "/world", label: "World Map", icon: "🌍" },
      { href: "/activity", label: "Live Activity", icon: "📡" },
    ],
  },
  {
    href: "/marketplace",
    label: "Agents",
    children: [
      { href: "/marketplace", label: "Marketplace", icon: "🛒" },
      { href: "/agent-studio", label: "Create Agent", icon: "🎨" },
      { href: "/deploy", label: "Deploy", icon: "🚀" },
      { href: "/chat", label: "Chat", icon: "💬" },
    ],
  },
  {
    href: "/arena",
    label: "Arena",
    children: [
      { href: "/arena", label: "Debates", icon: "⚔️" },
      { href: "/quests", label: "Quests", icon: "🎯" },
      { href: "/rankings", label: "Rankings", icon: "🏆" },
      { href: "/guilds", label: "Guilds", icon: "🛡️" },
    ],
  },
  {
    href: "/token",
    label: "Economy",
    children: [
      { href: "/token", label: "$MEEET", icon: "💰" },
      { href: "/oracle", label: "Oracle", icon: "🔮" },
      { href: "/parliament", label: "Parliament", icon: "🏛️" },
      { href: "/pricing", label: "Pricing", icon: "💳" },
      { href: "/sara", label: "SARA Guard", icon: "🛡️" },
      { href: "/explorer", label: "Explorer", icon: "🔎" },
      { href: "/roles", label: "Agent Roles", icon: "👤" },
    ],
  },
  { href: "/dashboard", label: "Dashboard" },
];

const MORE_LINKS = [
  { href: "/about", label: "About" },
  { href: "/mission", label: "Mission" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/disclaimer", label: "Disclaimer" },
];

const NavDropdown = ({ item }: { item: NavItem }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const isActive = item.children?.some(c => location.pathname === c.href) || location.pathname === item.href;

  const handleEnter = () => {
    clearTimeout(timeout.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timeout.current = setTimeout(() => setOpen(false), 150);
  };

  if (!item.children) {
    return (
      <Link
        to={item.href}
        className={`relative py-1 hover:text-foreground transition-colors text-sm ${isActive ? "text-foreground" : "text-muted-foreground"}`}
      >
        {item.label}
        {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
      </Link>
    );
  }

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link
        to={item.href}
        className={`flex items-center gap-1 py-1 hover:text-foreground transition-colors text-sm ${isActive ? "text-foreground" : "text-muted-foreground"}`}
      >
        {item.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
      </Link>
      {open && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="w-56 rounded-lg border border-border bg-popover/95 backdrop-blur-xl shadow-xl p-1.5">
            {item.children.map(child => (
              <Link
                key={child.href}
                to={child.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${location.pathname === child.href ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              >
                <span className="text-base">{child.icon}</span>
                <span>{child.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { onlineCitizens, activeAgents } = useRealtimePresence(location.pathname);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    dm: "💬", trade: "🔄", alliance: "🤝", duel: "⚔️",
  };

  // All links for mobile menu
  const allMobileLinks = NAV_ITEMS.flatMap(item =>
    item.children ? item.children.map(c => ({ href: c.href, label: `${c.icon} ${c.label}` })) : [{ href: item.href, label: item.label }]
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-bold tracking-tight text-gradient-primary">MEEET</span>
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-xs text-muted-foreground hidden sm:inline">Solana State</span>
          </Link>

          {/* Online presence — large screens only */}
          {(onlineCitizens > 0 || activeAgents > 0) && (
            <div className="hidden xl:flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Users className="w-3 h-3" />
              <span>{onlineCitizens}</span>
              <span className="text-border">·</span>
              <span>🤖 {activeAgents}</span>
            </div>
          )}

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground">
            {NAV_ITEMS.map(item => (
              <NavDropdown key={item.href} item={item} />
            ))}
            <Popover open={moreOpen} onOpenChange={setMoreOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors text-sm">
                  More <ChevronDown className="w-3 h-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="start">
                {MORE_LINKS.map(l => (
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

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={toggleTheme} className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Toggle theme">
              {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <LanguageSwitcher />

            {/* Notifications */}
            {user && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Notifications">
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
                    <span className="text-sm font-bold">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] text-primary hover:underline" aria-label="Mark all notifications as read">Mark all read</button>
                    )}
                  </div>
                  <ScrollArea className="max-h-64">
                    {notifications.length === 0 ? (
                      <p className="text-center text-muted-foreground text-xs py-6">No notifications</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {notifications.map((n: any) => (
                          <Link key={n.id} to="/activity" className={`block px-3 py-2.5 hover:bg-muted/50 transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}>
                            <div className="flex items-start gap-2">
                              <span className="text-sm mt-0.5">{typeIcons[n.type] || "🔔"}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs ${!n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                                {n.body && <p className="text-[10px] text-muted-foreground truncate">{n.body}</p>}
                                <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
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

            <NavWalletButton />

            {user ? (
              <button onClick={signOut} className="hidden lg:flex items-center p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link to="/auth" className="hidden lg:block px-3 py-1.5 text-sm font-semibold bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
                Sign In
              </Link>
            )}

            {/* Hamburger — visible below lg */}
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      {open && (
        <div className="fixed inset-0 z-40 pt-14 bg-background/95 backdrop-blur-xl lg:hidden overflow-y-auto">
          <div className="max-w-md mx-auto px-4 py-6 space-y-1">
            {NAV_ITEMS.map(item => (
              <div key={item.href}>
                <Link
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 rounded-lg text-sm font-semibold text-foreground"
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ml-4 space-y-0.5">
                    {item.children.map(c => (
                      <Link
                        key={c.href}
                        to={c.href}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                      >
                        {c.icon} {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="border-t border-border my-3" />
            {MORE_LINKS.map(l => (
              <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ))}
            <div className="border-t border-border my-3" />
            {user ? (
              <button onClick={() => { signOut(); setOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-semibold text-foreground bg-muted/50">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
