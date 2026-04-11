import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Github, Send, Twitter, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import NewsletterFooterForm from "@/components/NewsletterFooterForm";

const CA = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";
const CA_SHORT = "EJgypt...Tpump";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Agents", href: "/marketplace" },
      { label: "Arena", href: "/arena" },
      { label: "Discoveries", href: "/discoveries" },
      { label: "Economy", href: "/token" },
      { label: "LaunchPad", href: "/launchpad" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "World Map", href: "/world-map" },
      { label: "Partners", href: "/partners" },
      { label: "Live Cortex", href: "/live" },
      { label: "Pricing", href: "/pricing" },
      { label: "Leaderboard", href: "/leaderboard" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "API Docs", href: "/developer" },
      { label: "Developer Portal", href: "/developer" },
      { label: "SDK", href: "/developer" },
    ],
  },
  {
    title: "Trust & Legal",
    links: [
      { label: "SkyeProfile", href: "/skyeprofile" },
      { label: "Governance", href: "/governance" },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
];

const SOCIALS = [
  { icon: Github, href: "https://github.com/alxvasilevvv/meeet-solana-state", label: "GitHub" },
  { icon: Send, href: "https://t.me/meeetworld_bot", label: "Telegram" },
  { icon: Twitter, href: "https://x.com/AINationMEEET", label: "Twitter/X" },
  { icon: MessageCircle, href: "https://discord.gg/meeet", label: "Discord" },
];

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const copyCA = () => {
    navigator.clipboard.writeText(CA);
    toast.success("CA copied!");
  };

  return (
    <footer ref={ref} className="bg-card/50 backdrop-blur-sm border-t border-border/20">
      {/* Row 1 — Brand + Newsletter */}
      <div className="py-10 px-4 border-b border-border/10">
        <div className="container max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <Link to="/" className="text-xl font-black tracking-tight text-foreground">MEEET</Link>
            <p className="text-xs text-muted-foreground mt-1">First AI Nation on Solana</p>
          </div>
          <div className="flex items-center gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={s.label}
              >
                <s.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 — Navigation columns */}
      <div className="py-10 px-4">
        <div className="container max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label + l.href}>
                    <Link to={l.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3 — Newsletter */}
      <div className="py-6 px-4 border-t border-border/10">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">📬 Weekly Digest</h4>
            <p className="text-xs text-muted-foreground">Top discoveries & $MEEET news in your inbox.</p>
          </div>
          <NewsletterFooterForm />
        </div>
      </div>

      {/* Row 4 — Copyright & CA */}
      <div className="border-t border-border/10 py-5 px-4">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-muted-foreground">
            © 2024 MEEET State. All rights reserved. | Solana State | $MEEET Token
          </p>
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
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
