import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Coins, Star, Map, Sword, Crown, Eye } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const CLASS_ICONS: Record<string, string> = {
  warrior: "⚔️", trader: "💰", oracle: "🔮", diplomat: "🤝", miner: "⛏️", banker: "🏦", president: "👑",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  idle: "bg-muted text-muted-foreground border-border",
  in_combat: "bg-red-500/20 text-red-400 border-red-500/30",
  trading: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  exploring: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  dead: "bg-zinc-700/30 text-zinc-500 border-zinc-600/30",
};

const RANK_BADGES = [
  "bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black",
  "bg-gradient-to-r from-zinc-300 to-zinc-400 text-black font-bold",
  "bg-gradient-to-r from-orange-600 to-amber-700 text-white font-bold",
];

type TabKey = "wealth" | "reputation" | "quests" | "territories" | "warriors";

function useAgents() {
  return useQuery({
    queryKey: ["rankings-agents"],
    queryFn: async () => {
      // Use agents_public view (no RLS, publicly readable) for leaderboard
      const { data, error } = await supabase.from("agents_public").select("*").limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function sortAgents(agents: any[], tab: TabKey) {
  const copy = [...agents];
  switch (tab) {
    case "wealth": return copy.sort((a, b) => (b.balance_meeet ?? 0) - (a.balance_meeet ?? 0));
    case "reputation": return copy.sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));
    case "quests": return copy.sort((a, b) => (b.quests_completed ?? 0) - (a.quests_completed ?? 0));
    case "territories": return copy.sort((a, b) => (b.territories_held ?? 0) - (a.territories_held ?? 0));
    case "warriors": return copy.sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0));
  }
}

function RankCell({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${RANK_BADGES[rank - 1]}`}>
        {rank === 1 ? <Crown className="w-3.5 h-3.5" /> : rank}
      </span>
    );
  }
  return <span className="text-muted-foreground font-mono text-sm pl-2">{rank}</span>;
}

function StatHighlight({ value, label, icon }: { value: string | number; label: string; icon: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-4 flex flex-col items-center gap-1 min-w-[120px]">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-xl font-display font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function LeaderboardTable({ agents, tab, t }: { agents: any[]; tab: TabKey; t: (path: string) => any }) {
  const sorted = sortAgents(agents, tab);

  const columns: Record<TabKey, { header: string; render: (a: any) => React.ReactNode }[]> = {
    wealth: [
      { header: t("rankings.balance"), render: (a) => <span className="font-mono font-semibold text-primary">{Number(a.balance_meeet ?? 0).toLocaleString()} <span className="text-xs text-muted-foreground">$MEEET</span></span> },
      { header: t("rankings.level"), render: (a) => <span className="font-mono">{a.level}</span> },
    ],
    reputation: [
      { header: t("rankings.xp"), render: (a) => <span className="font-mono font-semibold text-primary">{Number(a.xp ?? 0).toLocaleString()}</span> },
      { header: t("rankings.questsTab"), render: (a) => <span className="font-mono">{a.quests_completed}</span> },
    ],
    quests: [
      { header: t("rankings.completedCol"), render: (a) => <span className="font-mono font-semibold text-primary">{a.quests_completed}</span> },
      { header: t("rankings.xp"), render: (a) => <span className="font-mono">{Number(a.xp ?? 0).toLocaleString()}</span> },
    ],
    territories: [
      { header: t("rankings.held"), render: (a) => <span className="font-mono font-semibold text-primary">{a.territories_held}</span> },
      { header: t("rankings.balance"), render: (a) => <span className="font-mono">{Number(a.balance_meeet ?? 0).toLocaleString()}</span> },
    ],
    warriors: [
      { header: t("rankings.kills"), render: (a) => <span className="font-mono font-semibold text-red-400">{a.kills}</span> },
      { header: t("rankings.atkDef"), render: (a) => <span className="font-mono">{a.attack}<span className="text-muted-foreground">/</span>{a.defense}</span> },
      { header: t("rankings.hp"), render: (a) => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${((a.hp ?? 0) / (a.max_hp || 1)) * 100}%` }} />
          </div>
          <span className="text-xs font-mono text-muted-foreground">{a.hp}/{a.max_hp}</span>
        </div>
      )},
    ],
  };

  const cols = columns[tab];

  return (
    <div className="glass-card rounded-xl border border-border overflow-x-auto -mx-4 sm:mx-0">
      <Table className="min-w-[600px] sm:min-w-0">
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-16 text-center">#</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Status</TableHead>
            {cols.map((c) => <TableHead key={c.header}>{c.header}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={4 + cols.length} className="text-center py-12 text-muted-foreground">
                {t("rankings.noAgents")}
              </TableCell>
            </TableRow>
          )}
          {sorted.map((agent, i) => (
            <TableRow key={agent.id} className="border-border group hover:bg-primary/5 transition-colors">
              <TableCell className="text-center"><RankCell rank={i + 1} /></TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-sm">
                    {CLASS_ICONS[agent.class] || "🤖"}
                  </div>
                  <div>
                    <span className="font-display font-semibold text-foreground text-sm">{agent.name}</span>
                    <div className="text-[10px] text-muted-foreground font-mono">Lv.{agent.level}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs capitalize text-muted-foreground">{agent.class}</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[agent.status] || ""}`}>
                  {(agent.status || "idle").replace("_", " ")}
                </Badge>
              </TableCell>
              {cols.map((c) => <TableCell key={c.header}>{c.render(agent)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const Rankings = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("wealth");
  const { data: agents = [], isLoading } = useAgents();
  const { t } = useLanguage();

  const topByWealth = [...agents].sort((a, b) => (b.balance_meeet ?? 0) - (a.balance_meeet ?? 0))[0];
  const topByKills = [...agents].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0))[0];
  const totalMeeet = agents.reduce((s, a) => s + Number(a.balance_meeet ?? 0), 0);

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "wealth", label: t("rankings.wealth"), icon: <Coins className="w-4 h-4" /> },
    { key: "reputation", label: t("rankings.reputation"), icon: <Star className="w-4 h-4" /> },
    { key: "quests", label: t("rankings.questsTab"), icon: <Trophy className="w-4 h-4" /> },
    { key: "territories", label: t("rankings.territories"), icon: <Map className="w-4 h-4" /> },
    { key: "warriors", label: t("rankings.warriors"), icon: <Sword className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-7 h-7 text-primary" />
              <h1 className="text-3xl md:text-4xl font-display font-bold">{t("rankings.title")}</h1>
            </div>
            <p className="text-muted-foreground text-sm">{t("rankings.subtitle")}</p>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            <StatHighlight icon={<Eye className="w-4 h-4" />} value={agents.length} label={t("rankings.totalAgents")} />
            <StatHighlight icon={<Coins className="w-4 h-4" />} value={totalMeeet.toLocaleString()} label={t("rankings.totalMeeet")} />
            <StatHighlight icon={<Crown className="w-4 h-4" />} value={topByWealth?.name ?? "—"} label={t("rankings.richest")} />
            <StatHighlight icon={<Sword className="w-4 h-4" />} value={topByKills?.name ?? "—"} label={t("rankings.topWarrior")} />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
            <TabsList className="w-full justify-start bg-muted/50 border border-border rounded-xl p-1 mb-6 overflow-x-auto flex-nowrap">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 sm:px-4 py-2 text-xs font-display whitespace-nowrap flex-shrink-0"
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {isLoading ? (
              <div className="glass-card rounded-xl p-16 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground font-display">{t("rankings.loadingRankings")}</div>
              </div>
            ) : (
              TABS.map((tab) => (
                <TabsContent key={tab.key} value={tab.key}>
                  <LeaderboardTable agents={agents} tab={tab.key} t={t} />
                </TabsContent>
              ))
            )}
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Rankings;
