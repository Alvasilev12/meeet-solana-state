import { Link } from "react-router-dom";
import { useMeeetPrice } from "@/hooks/useMeeetPrice";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PUMP_FUN_URL } from "@/components/ContractAddress";

export default function TokenPriceWidget() {
  const { price, isLoading, isUnavailable } = useMeeetPrice();
  const positive = (price.change24h ?? 0) >= 0;

  return (
    <div className="inline-flex items-center gap-4 px-5 py-3 rounded-xl border border-border bg-card/60 backdrop-blur-xl shadow-lg">
      <Link to="/token" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-400 flex items-center justify-center shadow-md shadow-primary/20">
          <span className="text-white font-bold text-xs">M</span>
        </div>
        <span className="font-display font-bold text-sm">$MEEET</span>
      </Link>

      {isLoading ? (
        <Skeleton className="h-5 w-24" />
      ) : isUnavailable ? (
        <span className="text-xs text-muted-foreground">Live data unavailable</span>
      ) : (
        <>
          <span className="font-mono font-bold text-sm">${price.priceUsd.toFixed(6)}</span>
          <span className={`text-xs font-bold flex items-center gap-0.5 ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {positive ? "+" : ""}{price.change24h.toFixed(1)}%
          </span>
        </>
      )}

      <a
        href={PUMP_FUN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:text-primary/80 font-bold flex items-center gap-0.5"
      >
        Buy <ArrowRight className="w-3 h-3" />
      </a>
    </div>
  );
}
