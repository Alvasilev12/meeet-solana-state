const Footer = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-gradient-primary">MEEET</span>
            <span className="text-xs text-muted-foreground">© 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground font-body">
            <a href="https://meeet.world" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">meeet.world</a>
            <a href="https://twitter.com/Meeet_world" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Twitter</a>
            <span>$MEEET on Solana</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
