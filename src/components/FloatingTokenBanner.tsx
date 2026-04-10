import { useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { useMeeetPrice } from "@/hooks/useMeeetPrice";
import { PUMP_FUN_URL } from "@/components/ContractAddress";

const STORAGE_KEY = "meeet_token_banner_dismissed";

const FloatingTokenBanner = () => {
  const [visible, setVisible] = useState(false);
  const { price, isUnavailable } = useMeeetPrice();

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setTimeout(() => setVisible(true), 1500);
    }
  }, []);

  if (!visible) return null;

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const priceStr = isUnavailable ? "$0.000015" : `$${price.priceUsd.toFixed(6)}`;
  const mcStr = isUnavailable
    ? "$15K"
    : price.marketCap >= 1000
    ? `$${(price.marketCap / 1000).toFixed(0)}K`
    : `$${price.marketCap.toLocaleString("en-US")}`;

  return (
    <a
      href={PUMP_FUN_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
    >
      <div className="bg-gradient-to-r from-primary/90 via-purple-600/90 to-primary/90 backdrop-blur-xl border-t border-primary/30 px-4 py-2.5 flex items-center justify-center gap-4 text-white text-sm">
        <span className="font-mono font-bold">$MEEET {priceStr}</span>
        <span className="text-white/60">|</span>
        <span className="text-white/80 text-xs">MC: {mcStr}</span>
        <span className="text-white/60">|</span>
        <span className="font-semibold flex items-center gap-1">
          Buy on Pump.fun <ExternalLink className="w-3 h-3" />
        </span>
        <button
          onClick={dismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </a>
  );
};

export default FloatingTokenBanner;
