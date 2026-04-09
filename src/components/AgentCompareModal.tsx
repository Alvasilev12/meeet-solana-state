import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Star, Users, Zap, Trophy, Brain, Coins, Swords } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  reviews: number;
  price: number;
  hires: number;
  responseTime: string;
  verified: boolean;
  featured: boolean;
}

const AVATAR_COLORS: Record<string, string> = {
  DeltaWolf: "hsl(340 70% 50%)", FrostStrike: "hsl(210 80% 55%)", AlphaShark: "hsl(30 85% 50%)",
  OnyxFox: "hsl(150 65% 45%)", ShadowRift: "hsl(270 60% 50%)", LyraPrime: "hsl(190 80% 50%)",
  NovaCrest: "hsl(50 85% 50%)", IronPulse: "hsl(0 70% 50%)", CipherMind: "hsl(230 70% 55%)",
};

const RADAR_COLORS = ["hsl(270 80% 65%)", "hsl(190 80% 55%)", "hsl(30 85% 55%)"];

function getAgentMetrics(a: Agent) {
  // Derive normalized 0-100 metrics from agent data
  return {
    popularity: Math.min(100, Math.round((a.hires / 700) * 100)),
    quality: Math.round(a.rating * 20),
    value: Math.round(Math.max(0, 100 - (a.price - 10) * 2)),
    reputation: Math.min(100, Math.round((a.reviews / 200) * 100)),
    speed: a.responseTime.includes("1") ? 95 : a.responseTime.includes("2") ? 80 : a.responseTime.includes("3") ? 65 : 50,
    trust: a.verified ? 90 : 55,
  };
}

function getProsCons(a: Agent) {
  const pros: string[] = [];
  const cons: string[] = [];
  if (a.rating >= 4.8) pros.push("Exceptional rating");
  else if (a.rating >= 4.6) pros.push("Strong rating");
  if (a.hires >= 400) pros.push("Highly popular");
  if (a.price <= 20) pros.push("Budget-friendly");
  if (a.verified) pros.push("Verified agent");
  if (a.featured) pros.push("Staff pick");
  if (a.responseTime.includes("1")) pros.push("Ultra-fast response");

  if (a.rating < 4.6) cons.push("Average rating");
  if (a.hires < 250) cons.push("Fewer hires");
  if (a.price >= 40) cons.push("Premium pricing");
  if (!a.verified) cons.push("Not verified");

  return { pros: pros.slice(0, 3), cons: cons.slice(0, 2) };
}

interface Props {
  agents: Agent[];
  open: boolean;
  onClose: () => void;
}

const AgentCompareModal = ({ agents, open, onClose }: Props) => {
  if (agents.length < 2) return null;

  const metrics = agents.map(getAgentMetrics);
  const radarData = [
    { metric: "Popularity", ...Object.fromEntries(agents.map((a, i) => [a.name, metrics[i].popularity])) },
    { metric: "Quality", ...Object.fromEntries(agents.map((a, i) => [a.name, metrics[i].quality])) },
    { metric: "Value", ...Object.fromEntries(agents.map((a, i) => [a.name, metrics[i].value])) },
    { metric: "Reputation", ...Object.fromEntries(agents.map((a, i) => [a.name, metrics[i].reputation])) },
    { metric: "Speed", ...Object.fromEntries(agents.map((a, i) => [a.name, metrics[i].speed])) },
    { metric: "Trust", ...Object.fromEntries(agents.map((a, i) => [a.name, metrics[i].trust])) },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Agent Comparison</DialogTitle>
        </DialogHeader>

        {/* Agent headers */}
        <div className={`grid gap-4 ${agents.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {agents.map((a) => (
            <div key={a.id} className="text-center space-y-2">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white mx-auto"
                style={{ background: AVATAR_COLORS[a.name] || "hsl(var(--primary))" }}
              >
                {a.name.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="font-semibold text-foreground">{a.name}</h3>
              <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
              {a.verified && <Badge className="ml-1 text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">✓ Verified</Badge>}
            </div>
          ))}
        </div>

        {/* Radar chart */}
        <div className="w-full h-64 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              {agents.map((a, i) => (
                <Radar
                  key={a.id}
                  name={a.name}
                  dataKey={a.name}
                  stroke={RADAR_COLORS[i]}
                  fill={RADAR_COLORS[i]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Stats comparison table */}
        <div className="border border-border/50 rounded-lg overflow-hidden text-sm">
          {[
            { label: "Price", icon: <Coins className="w-3.5 h-3.5" />, values: agents.map((a) => `$${a.price}/mo`) },
            { label: "Rating", icon: <Star className="w-3.5 h-3.5 text-amber-400" />, values: agents.map((a) => `${a.rating} ★ (${a.reviews})`) },
            { label: "Hires", icon: <Users className="w-3.5 h-3.5" />, values: agents.map((a) => a.hires.toLocaleString()) },
            { label: "Speed", icon: <Zap className="w-3.5 h-3.5" />, values: agents.map((a) => a.responseTime) },
          ].map((row, ri) => (
            <div key={ri} className={`grid ${agents.length === 2 ? "grid-cols-[140px_1fr_1fr]" : "grid-cols-[140px_1fr_1fr_1fr]"} ${ri % 2 === 0 ? "bg-muted/20" : ""}`}>
              <div className="px-3 py-2.5 flex items-center gap-2 text-muted-foreground font-medium border-r border-border/30">
                {row.icon} {row.label}
              </div>
              {row.values.map((v, vi) => {
                // Highlight best value
                const isBest = row.label === "Price"
                  ? agents[vi].price === Math.min(...agents.map((a) => a.price))
                  : row.label === "Rating"
                  ? agents[vi].rating === Math.max(...agents.map((a) => a.rating))
                  : row.label === "Hires"
                  ? agents[vi].hires === Math.max(...agents.map((a) => a.hires))
                  : agents[vi].responseTime <= agents.reduce((best, a) => a.responseTime < best ? a.responseTime : best, "~ 99s");

                return (
                  <div key={vi} className={`px-3 py-2.5 text-center ${isBest ? "text-primary font-semibold" : "text-foreground"}`}>
                    {v}
                    {isBest && <span className="ml-1 text-[9px] text-primary">★</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Pros / Cons */}
        <div className={`grid gap-4 mt-2 ${agents.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {agents.map((a) => {
            const { pros, cons } = getProsCons(a);
            return (
              <div key={a.id} className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground text-center">{a.name}</h4>
                <div className="space-y-1">
                  {pros.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <span>✓</span> {p}
                    </div>
                  ))}
                  {cons.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-red-400">
                      <span>✗</span> {c}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentCompareModal;
