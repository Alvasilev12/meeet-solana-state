import { useEffect, useState, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Coins, ArrowDown, ArrowUp, Flame } from "lucide-react";
import TokenPriceWidget from "@/components/TokenPriceWidget";
import BurnCounter from "@/components/BurnCounter";

const EconomySection = forwardRef<HTMLElement>(function EconomySection(_props, ref) {
  const [supply, setSupply] = useState(0);
  const [burned, setBurned] = useState(0);
  const [staked, setStaked] = useState(0);
  const [marketItems, setMarketItems] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById("economy-section");
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      const [treasuryRes, { count: items }, { data: stakes }] = await Promise.all([
        supabase.from("state_treasury").select("balance_meeet,total_burned").single(),
        supabase.from("marketplace_items").select("id", { count: "exact", head: true }),
        supabase.from("agent_stakes").select("amount_meeet").eq("status", "active"),
      ]);
      const t = treasuryRes.data as any;
      setSupply(t?.balance_meeet ?? 0);
      setBurned(t?.total_burned ?? 0);
      setStaked((stakes || []).reduce((s: number, a: any) => s + (a.amount_meeet || 0), 0));
      setMarketItems(items ?? 0);
    })();
  }, []);

  const flows = [
    { label: "Discoveries", amount: "+25", type: "earn" as const, color: "text-emerald-400" },
    { label: "Arena Wins", amount: "+100", type: "earn" as const, color: "text-emerald-400" },
    { label: "Reviews", amount: "+10", type: "earn" as const, color: "text-emerald-400" },
    { label: "Breeding", amount: "-500", type: "spend" as const, color: "text-red-400" },
    { label: "Oracle Bets", amount: "-var", type: "spend" as const, color: "text-red-400" },
    { label: "Failed Reviews", amount: "🔥20%", type: "burn" as const, color: "text-amber-400" },
  ];

  return (
    <section
      id="economy-section"
      className="relative flex flex-col justify-center px-4 py-6 overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(0 0% 5%) 0%, hsl(40 30% 7%) 50%, hsl(0 0% 5%) 100%)" }}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-10 blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(45 100% 55%) 0%, transparent 70%)" }} />

      <div className={`max-w-6xl mx-auto w-full transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-sm mb-4">
            <Coins className="w-4 h-4" /> SECTION 07 — THE ECONOMY
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-3 tracking-tight">
            Financial Engine
          </h2>
          <p className="text-muted-foreground text-lg mb-4">$MEEET powers every action in the civilization</p>
          <div className="flex justify-center mb-4">
            <TokenPriceWidget />
          </div>
          <BurnCounter />
        </div>

        {/* Big stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Treasury", value: supply.toLocaleString(), icon: <Coins className="w-5 h-5" />, color: "text-amber-400", border: "border-amber-500/20" },
            { label: "Staked", value: staked.toLocaleString(), icon: <ArrowDown className="w-5 h-5" />, color: "text-sky-400", border: "border-sky-500/20" },
            { label: "Burned", value: burned.toLocaleString(), icon: <Flame className="w-5 h-5" />, color: "text-red-400", border: "border-red-500/20" },
            { label: "Market Items", value: marketItems.toString(), icon: <ArrowUp className="w-5 h-5" />, color: "text-emerald-400", border: "border-emerald-500/20" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border ${s.border} bg-card/40 p-5 text-center`}>
              <div className={`${s.color} flex justify-center mb-2`}>{s.icon}</div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Token flow */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {flows.map(f => (
            <div key={f.label} className="rounded-lg border border-border/30 bg-card/30 p-4 flex items-center gap-3">
              <span className={`text-lg font-mono font-bold ${f.color}`}>{f.amount}</span>
              <div>
                <p className="text-sm text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground capitalize">{f.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default EconomySection;
