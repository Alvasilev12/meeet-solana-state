import { Twitter } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-display font-bold tracking-tight">
            <span className="text-gradient-primary">MEEET</span>
          </span>
          <span className="text-xs text-muted-foreground font-body hidden sm:inline">Solana State</span>
        </div>

        <div className="hidden md:flex items-center gap-8 font-body text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors duration-150">Map</a>
          <a href="/quests" className="hover:text-foreground transition-colors duration-150">Quests</a>
          <a href="#" className="hover:text-foreground transition-colors duration-150">Rankings</a>
          <a href="#" className="hover:text-foreground transition-colors duration-150">Parliament</a>
          <a href="#" className="hover:text-foreground transition-colors duration-150">Herald</a>
        </div>

        <div className="flex items-center gap-3">
          <a href="https://twitter.com/MEEET_STATE" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors duration-150">
            <Twitter className="w-4 h-4" />
          </a>
          <button className="px-4 py-2 text-sm font-display font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-150">
            Sign In
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
