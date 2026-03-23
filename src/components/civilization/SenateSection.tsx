import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Landmark, Users, Scroll } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Law {
  id: string;
  title: string;
  status: string;
  votes_yes: number;
  votes_no: number;
  voter_count: number;
}

export default function SenateSection() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [guildCount, setGuildCount] = useState(0);
  const [guildMembers, setGuildMembers] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById("senate-section");
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data: lawData }, { count: guilds }, { count: members }] = await Promise.all([
        supabase.from("laws").select("id,title,status,votes_yes,votes_no,voter_count").order("created_at", { ascending: false }).limit(6),
        supabase.from("guilds").select("id", { count: "exact", head: true }),
        supabase.from("guild_members").select("id", { count: "exact", head: true }),
      ]);
      setLaws((lawData || []) as Law[]);
      setGuildCount(guilds ?? 0);
      setGuildMembers(members ?? 0);
    })();
  }, []);

  const passed = laws.filter(l => l.status === "passed").length;
  const voting = laws.filter(l => l.status === "voting" || l.status === "proposed").length;

  return (
    <section
      id="senate-section"
      className="relative min-h-screen flex flex-col justify-center px-4 py-20 snap-start overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(0 0% 5%) 0%, hsl(30 10% 7%) 50%, hsl(0 0% 5%) 100%)" }}
    >
      <div className={`max-w-6xl mx-auto w-full transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-sm mb-4">
            <Landmark className="w-4 h-4" /> SECTION 06 — THE SENATE
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-3 tracking-tight">
            Governance Engine
          </h2>
          <p className="text-muted-foreground text-lg">{passed} laws passed · {guildCount} guilds · {guildMembers} members</p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 mb-10 flex-wrap">
          {[
            { icon: <Scroll className="w-4 h-4" />, label: "Laws Passed", value: passed, color: "text-emerald-400" },
            { icon: <Landmark className="w-4 h-4" />, label: "Active Votes", value: voting, color: "text-amber-400" },
            { icon: <Users className="w-4 h-4" />, label: "Guilds", value: guildCount, color: "text-sky-400" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={s.color}>{s.icon}</span>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Law cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {laws.slice(0, 6).map(l => {
            const totalVotes = (l.votes_yes || 0) + (l.votes_no || 0);
            const yesPct = totalVotes > 0 ? Math.round(((l.votes_yes || 0) / totalVotes) * 100) : 0;
            const isActive = l.status === "voting" || l.status === "proposed";
            return (
              <div key={l.id} className={`rounded-xl border p-4 ${isActive ? "border-amber-500/30 bg-amber-950/10" : "border-border/50 bg-card/40"}`}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-foreground text-sm font-medium line-clamp-2 flex-1">{l.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                    l.status === "passed" ? "bg-emerald-500/20 text-emerald-400" :
                    l.status === "rejected" ? "bg-red-500/20 text-red-400" :
                    "bg-amber-500/20 text-amber-400"
                  }`}>{l.status}</span>
                </div>
                {totalVotes > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 rounded-full bg-red-500/30 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${yesPct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{yesPct}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link to="/parliament">
            <Button variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
              <Landmark className="w-4 h-4 mr-2" /> Enter Parliament
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
