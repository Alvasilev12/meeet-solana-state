import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Rocket, Clock } from "lucide-react";

const PUMP_FUN_URL = "https://pump.fun/coin/EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";
const TARGET_SOL = 85;

// Next major update target date
const NEXT_UPDATE = new Date("2026-05-01T00:00:00Z");

function useCountdown(target: Date) {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, mins: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      setRemaining({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
      });
    };
    tick();
    const iv = setInterval(tick, 60000);
    return () => clearInterval(iv);
  }, [target]);

  return remaining;
}

const BondingCurveProgress = () => {
  const countdown = useCountdown(NEXT_UPDATE);

  const { data: curveData } = useQuery({
    queryKey: ["bonding-curve-progress"],
    queryFn: async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-meeet-price`);
        if (!res.ok) return null;
        const d = await res.json();
        return {
          solReserves: d.virtual_sol_reserves || 0,
          progress: d.bonding_progress || 0,
        };
      } catch { return null; }
    },
    refetchInterval: 30000,
  });

  const progress = curveData?.progress ?? 42;
  const solNeeded = TARGET_SOL - (curveData?.solReserves ?? 36);

  return (
    <section className="py-8 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bonding Curve */}
        <a
          href={PUMP_FUN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl border border-border/40 bg-gradient-to-br from-purple-600/10 via-card/60 to-blue-600/10 backdrop-blur-sm p-5 hover:border-purple-500/40 transition-all group"
        >
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-foreground">Bonding Curve Progress</h3>
          </div>
          <Progress value={progress} className="h-3 mb-2 bg-muted/50" />
          <div className="flex justify-between text-[11px]">
            <span className="text-purple-400 font-bold">{progress.toFixed(1)}% Complete</span>
            <span className="text-muted-foreground">{solNeeded.toFixed(1)} SOL to Raydium 🚀</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 group-hover:text-foreground/60 transition-colors">
            Click to buy on Pump.fun →
          </p>
        </a>

        {/* Countdown */}
        <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-foreground">Next Major Update</h3>
          </div>
          <div className="flex gap-4 justify-center">
            {[
              { val: countdown.days, label: "Days" },
              { val: countdown.hours, label: "Hours" },
              { val: countdown.mins, label: "Mins" },
            ].map((t) => (
              <div key={t.label} className="text-center">
                <p className="text-2xl md:text-3xl font-black text-foreground tabular-nums">{String(t.val).padStart(2, "0")}</p>
                <p className="text-[10px] text-muted-foreground">{t.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-3">v2.0 — Agent Marketplace + Multi-chain</p>
        </div>
      </div>
    </section>
  );
};

export default BondingCurveProgress;
