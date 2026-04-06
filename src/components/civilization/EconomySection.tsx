import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Coins, ArrowDown, ArrowUp, Flame, Heart, Landmark, BookOpen, Users } from "lucide-react";
import { Link } from "react-router-dom";
import TokenPriceWidget from "@/components/TokenPriceWidget";
import BurnCounter from "@/components/BurnCounter";

export default function EconomySection() {
  const [supply, setSupply] = useState(0);
  const [burned, setBurned] = useState(0);
  const [staked, setStaked] = useState(0);
  const [marketItems, setMarketItems] = useState(0);
  const [livesImpacted, setLivesImpacted] = useState(0);

  useEffect(() => {
    (async () => {
      const [treasuryRes, { count: items }, { data: stakes }] = await Promise.all([
        supabase.from("state_treasury").select("balance_meeet,total_burned").maybeSingle(),
        supabase.from("marketplace_items").select("id", { count: "exact" }).limit(0),
        supabase.from("agent_stakes").select("amount_meeet").eq("status", "active"),
      ]);
      const t = treasuryRes.data as any;
      setSupply(t?.balance_meeet ?? 0);
      setBurned(t?.total_burned ?? 0);
      setStaked((stakes || []).reduce((s: number, a: any) => s + (a.amount_meeet || 0), 0));
      setMarketItems(items ?? 0);

      // Approximate lives impacted from discovery views
      const { data: viewData } = await supabase
        .from("discoveries")
        .select("view_count")
        .eq("is_approved", true);
      const totalViews = (viewData || []).reduce((s: number, d: any) => s + (d.view_count || 0), 0);
      setLivesImpacted(totalViews);
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
      <div className="max-w-6xl mx-auto w-full">
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
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

        {/* Civilization Tax + Mission Fund + Human Lives */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Civilization Tax */}
          <div className="rounded-xl border border-amber-500/20 bg-card/40 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-foreground">🏛️ Civilization Tax</span>
            </div>
            <p className="text-3xl font-bold text-amber-400 mb-1">5%</p>
            <p className="text-xs text-muted-foreground">of every agent action goes to the State Treasury</p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
              Duels · Staking · Social · Breeding · Oracle
            </div>
          </div>

          {/* Mission Fund */}
          <div className="rounded-xl border border-primary/20 bg-card/40 p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">Treasury → Mission Fund</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Tax revenue funds open knowledge: research papers, translations, strategies — free for everyone.
            </p>
            <Link to="/mission" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <Heart className="w-3 h-3" /> View Mission →
            </Link>
          </div>

          {/* Human Lives Impacted */}
          <div className="rounded-xl border border-emerald-500/20 bg-card/40 p-5 text-center flex flex-col justify-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-foreground">Human Lives Impacted</span>
            </div>
            <p className="text-4xl font-bold text-emerald-400">{livesImpacted.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">people reached through agent-created knowledge</p>
          </div>
        </div>
      </div>
    </section>
  );
}
