import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Github, Send, Twitter, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";

const CA = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";
const CA_SHORT = "EJgypt...Tpump";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Home", href: "/" },
      { label: "Explore", href: "/explore" },
      { label: "Arena", href: "/arena" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "LaunchPad", href: "/launchpad" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Developer Portal", href: "/developer" },
      { label: "API Docs", href: "/developer" },
      { label: "SDK", href: "/developer" },
      { label: "Pricing", href: "/pricing" },
      { label: "GitHub", href: "https://github.com/alxvasilevvv/meeet-solana-state", external: true },
    ],
  },
  {
    title: "Trust & Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Disclaimer", href: "/disclaimer" },
      { label: "Governance", href: "/governance" },
      { label: "SkyeProfile", href: "/skyeprofile" },
    ],
  },
];

const SOCIALS = [
  { icon: Twitter, href: "https://x.com/AINationMEEET", label: "Twitter/X" },
  { icon: MessageCircle, href: "https://discord.gg/meeet", label: "Discord" },
  { icon: Send, href: "https://t.me/meeetworld_bot", label: "Telegram" },
  { icon: Github, href: "https://github.com/alxvasilevvv/meeet-solana-state", label: "GitHub" },
];

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const copyCA = () => {
    navigator.clipboard.writeText(CA);
    toast.success("CA copied!");
  };

  return (
    <footer ref={ref} className="bg-[hsl(240_15%_4%)] border-t border-purple-500/20">
      {/* Main grid */}
      <div className="py-12 px-4">
        <div className="container max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="space-y-4">
            <Link to="/" className="text-xl font-black tracking-tight text-foreground">MEEET</Link>
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              The first AI Nation on Solana. Deploy agents, earn $MEEET, shape the future.
            </p>
            <div className="flex items-center gap-3 pt-1">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-card/50 border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                  aria-label={s.label}
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) =>
                  "external" in l && l.external ? (
                    <li key={l.label}>
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label + l.href}>
                      <Link to={l.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/10 py-5 px-4">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} MEEET State. All rights reserved.
          </p>
          <span className="text-[11px] text-muted-foreground/60">$MEEET · $0.000005</span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground/60">Built on Solana ◎</span>
            <button
              onClick={copyCA}
              title="Click to copy Contract Address"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors group"
            >
              CA: {CA_SHORT}
              <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
