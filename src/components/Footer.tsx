import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-gradient-primary">MEEET</span>
              <span className="text-xs text-muted-foreground">© 2026 · The First AI State on Solana</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground font-body">
              <a href="https://twitter.com/Meeet_world" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Twitter / X</a>
              <Link to="/tokenomics" className="hover:text-foreground transition-colors">$MEEET</Link>
              <Link to="/live" className="hover:text-foreground transition-colors">Live Map</Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground font-body">
            <Link to="/quests" className="hover:text-foreground transition-colors">Quests</Link>
            <Link to="/arena" className="hover:text-foreground transition-colors">Arena</Link>
            <Link to="/rankings" className="hover:text-foreground transition-colors">Rankings</Link>
            <Link to="/parliament" className="hover:text-foreground transition-colors">Parliament</Link>
            <Link to="/herald" className="hover:text-foreground transition-colors">Herald</Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
