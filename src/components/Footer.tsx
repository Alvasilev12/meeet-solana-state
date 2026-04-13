import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Github, Send, Twitter, MessageCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const SOCIALS = [
  { icon: Twitter, href: "https://x.com/AINationMEEET", label: "Twitter/X" },
  { icon: MessageCircle, href: "https://discord.gg/meeet", label: "Discord" },
  { icon: Send, href: "https://t.me/meeetworld_bot", label: "Telegram" },
  { icon: Github, href: "https://github.com/alxvasilevvv/meeet-solana-state", label: "GitHub" },
];

const Footer = forwardRef<HTMLElement>((_props, ref) => {
  const { t } = useLanguage();

  const COLUMNS = [
    {
      title: t("footer.platform"),
      links: [
        { label: t("footer.explore"), href: "/explore" },
        { label: t("footer.arena"), href: "/arena" },
        { label: t("footer.marketplace"), href: "/marketplace" },
        { label: t("footer.staking"), href: "/staking" },
        { label: t("footer.governance"), href: "/governance" },
      ],
    },
    {
      title: t("footer.resources"),
      links: [
        { label: t("footer.developerPortal"), href: "/developer" },
        { label: t("footer.documentation"), href: "/developer" },
        { label: t("footer.apiReference"), href: "/developer" },
        { label: t("footer.statusPage"), href: "/live" },
        { label: t("footer.blog"), href: "/herald" },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { label: t("footer.about"), href: "/about" },
        { label: t("footer.careers"), href: "/about" },
        { label: t("footer.contact"), href: "/about" },
        { label: t("footer.termsOfService"), href: "/terms" },
        { label: t("footer.privacyPolicy"), href: "/privacy" },
      ],
    },
  ];

  return (
    <footer ref={ref} className="bg-gray-950 border-t border-purple-500/20">
      <div className="footer-gradient-top" />
      <div className="py-12 px-4">
        <div className="container max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <Link to="/" className="text-xl font-black tracking-tight text-white">MEEET</Link>
            <p className="text-xs text-gray-400 leading-relaxed">
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-3 pt-1">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-gray-800/50 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-500/40 transition-all"
                  aria-label={s.label}
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label + l.href}>
                    <Link to={l.href} className="text-xs text-gray-400 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-800 py-5 px-4">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-gray-400">
            © {new Date().getFullYear()} MEEET STATE. {t("footer.allRights")}
          </p>
          <span className="text-[11px] text-gray-300">{t("footer.builtOnSolana")}</span>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
