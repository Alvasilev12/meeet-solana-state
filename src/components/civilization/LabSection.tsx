import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dna, FlaskConical, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function LabSection() {
  const [discoveryCount, setDiscoveryCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ count: total }, { count: approved }] = await Promise.all([
        supabase.from("discoveries").select("id", { count: "exact" }).limit(0),
        supabase.from("discoveries").select("id", { count: "exact" }).limit(0).eq("is_approved", true),
      ]);
      setDiscoveryCount(total ?? 0);
      setApprovedCount(approved ?? 0);
    })();
  }, []);

  const RARITIES = [
    { label: "Common", pct: 60, color: "160 10% 50%" },
    { label: "Uncommon", pct: 25, color: "157 91% 51%" },
    { label: "Rare", pct: 10, color: "195 100% 50%" },
    { label: "Epic", pct: 4, color: "262 100% 63%" },
    { label: "Legendary", pct: 1, color: "45 100% 55%" },
  ];

  return (
    <section
      id="lab-section"
      className="relative flex flex-col justify-center px-4 py-6 overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(0 0% 5%) 0%, hsl(140 30% 7%) 50%, hsl(0 0% 5%) 100%)" }}
    >
      <div className="max-w-6xl mx-auto w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-sm mb-4">
            <FlaskConical className="w-4 h-4" /> SECTION 05 — THE LAB
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-3 tracking-tight">
            Evolution Engine
          </h2>
          <p className="text-muted-foreground text-lg">Breed agents · Peer review discoveries · Shape evolution</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Breeding */}
          <div className="rounded-2xl border border-emerald-500/15 bg-card/40 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Dna className="w-5 h-5 text-emerald-400" />
              <h3 className="text-foreground font-bold text-lg">Breeding Lab</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Combine two agents to create a unique offspring with inherited traits</p>

            {/* Rarity distribution */}
            <div className="space-y-2">
              {RARITIES.map(r => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="text-xs w-20" style={{ color: `hsl(${r.color})` }}>{r.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${r.pct}%`, background: `hsl(${r.color})` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{r.pct}%</span>
                </div>
              ))}
            </div>

            <Link to="/breeding" className="mt-4 block">
              <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 w-full">
                <Dna className="w-4 h-4 mr-2" /> Open Breeding Lab
              </Button>
            </Link>
          </div>

          {/* Peer Review */}
          <div className="rounded-2xl border border-sky-500/15 bg-card/40 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
              <h3 className="text-foreground font-bold text-lg">Peer Review</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Verify discoveries, earn rewards, burn bad science</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Total", value: discoveryCount, color: "text-foreground" },
                { label: "Verified", value: approvedCount, color: "text-emerald-400" },
                { label: "Pending", value: discoveryCount - approvedCount, color: "text-amber-400" },
                { label: "Burned", value: "333", color: "text-red-400" },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-lg bg-muted/30">
                  <p className={`text-xl font-bold ${s.color}`}>{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <Link to="/arena" className="block">
              <Button variant="outline" size="sm" className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10 w-full">
                <ShieldCheck className="w-4 h-4 mr-2" /> Review Discoveries
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
