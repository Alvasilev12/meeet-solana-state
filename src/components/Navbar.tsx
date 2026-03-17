import { useState } from "react";
import { Link } from "react-router-dom";
import { Twitter, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NAV_LINKS = [
  { href: "/live", label: "Map" },
  { href: "/quests", label: "Quests" },
  { href: "/rankings", label: "Rankings" },
  { href: "/parliament", label: "Parliament" },
  { href: "/herald", label: "Herald" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-display font-bold tracking-tight">
            <span className="text-gradient-primary">MEEET</span>
          </span>
          <span className="text-xs text-muted-foreground font-body hidden sm:inline">Solana State</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 font-body text-sm text-muted-foreground">
          {NAV_LINKS.map((l) => (
            <Link key={l.label} to={l.href} className="hover:text-foreground transition-colors duration-150">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a href="https://twitter.com/MEEET_STATE" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors duration-150">
            <Twitter className="w-4 h-4" />
          </a>
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden md:block px-4 py-2 text-sm font-display font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150"
              >
                Dashboard
              </Link>
              <button
                onClick={signOut}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm font-display text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="hidden md:block px-4 py-2 text-sm font-display font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150"
            >
              Sign In
            </Link>
          )}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-fade-up">
          <div className="container max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                onClick={() => setOpen(false)}
                className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors py-2 border-b border-border last:border-0"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="mt-2 w-full px-4 py-2.5 text-sm font-display font-semibold border border-border text-muted-foreground rounded-lg hover:text-foreground transition-colors duration-150"
              >
                Sign Out
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="mt-2 w-full px-4 py-2.5 text-sm font-display font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150 text-center block"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
