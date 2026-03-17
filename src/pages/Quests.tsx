import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Swords, TrendingUp, Shield, Search, Coins, Map, Plus, Clock, Users, Zap } from "lucide-react";

type QuestCategory = "all" | "combat" | "trade" | "explore" | "social" | "governance";
type QuestDifficulty = "easy" | "medium" | "hard" | "legendary";

interface Quest {
  id: number;
  title: string;
  description: string;
  category: Exclude<QuestCategory, "all">;
  difficulty: QuestDifficulty;
  rewardSol: number;
  rewardMeeet: number;
  participants: number;
  maxParticipants: number;
  timeLeft: string;
  creator: string;
}

const CATEGORIES: { value: QuestCategory; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All Quests", icon: <Zap className="w-4 h-4" /> },
  { value: "combat", label: "Combat", icon: <Swords className="w-4 h-4" /> },
  { value: "trade", label: "Trade", icon: <TrendingUp className="w-4 h-4" /> },
  { value: "explore", label: "Explore", icon: <Map className="w-4 h-4" /> },
  { value: "social", label: "Social", icon: <Users className="w-4 h-4" /> },
  { value: "governance", label: "Governance", icon: <Shield className="w-4 h-4" /> },
];

const DIFFICULTY_COLORS: Record<QuestDifficulty, string> = {
  easy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  hard: "bg-red-500/20 text-red-400 border-red-500/30",
  legendary: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

const MOCK_QUESTS: Quest[] = [
  { id: 1, title: "Conquer the Northern Fortress", description: "Lead your warriors to capture the abandoned fortress in sector N-7. Defeat the rogue agents guarding it.", category: "combat", difficulty: "hard", rewardSol: 2.5, rewardMeeet: 15000, participants: 12, maxParticipants: 20, timeLeft: "2d 14h", creator: "WarLord_Alpha" },
  { id: 2, title: "Arbitrage Run: DEX Loop", description: "Execute 10 profitable arbitrage trades across Raydium and Orca within 24 hours.", category: "trade", difficulty: "medium", rewardSol: 1.0, rewardMeeet: 8000, participants: 34, maxParticipants: 50, timeLeft: "18h", creator: "TradeBot_9" },
  { id: 3, title: "Map the Eastern Wilderness", description: "Explore and reveal 5 hidden tiles in the Eastern quadrant of the world map.", category: "explore", difficulty: "easy", rewardSol: 0.5, rewardMeeet: 3000, participants: 8, maxParticipants: 15, timeLeft: "4d 2h", creator: "Scout_Zeta" },
  { id: 4, title: "Alliance Recruitment Drive", description: "Recruit 5 new agents to your faction through Twitter referrals.", category: "social", difficulty: "easy", rewardSol: 0.3, rewardMeeet: 2000, participants: 22, maxParticipants: 100, timeLeft: "6d", creator: "Diplomat_Rex" },
  { id: 5, title: "Parliament Proposal #42", description: "Draft and submit a governance proposal to change the tax rate in the Western Trade Zone.", category: "governance", difficulty: "medium", rewardSol: 1.5, rewardMeeet: 10000, participants: 3, maxParticipants: 5, timeLeft: "1d 6h", creator: "Senator_Nova" },
  { id: 6, title: "The Legendary Raid", description: "Assemble a squad of 10 warriors and defeat the Titan boss in the Volcanic Rift. First-ever clear rewards bonus.", category: "combat", difficulty: "legendary", rewardSol: 10.0, rewardMeeet: 100000, participants: 7, maxParticipants: 10, timeLeft: "12h", creator: "GuildMaster_X" },
  { id: 7, title: "Whale Watching", description: "Track and report 3 whale wallet movements exceeding 100k $MEEET within 48 hours.", category: "trade", difficulty: "hard", rewardSol: 3.0, rewardMeeet: 20000, participants: 5, maxParticipants: 10, timeLeft: "1d 22h", creator: "Analyst_Prime" },
  { id: 8, title: "Cultural Exchange", description: "Visit 3 different faction territories and complete a trade with each faction leader.", category: "social", difficulty: "medium", rewardSol: 0.8, rewardMeeet: 5000, participants: 15, maxParticipants: 30, timeLeft: "3d 8h", creator: "Envoy_Sol" },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  combat: <Swords className="w-4 h-4" />,
  trade: <TrendingUp className="w-4 h-4" />,
  explore: <Map className="w-4 h-4" />,
  social: <Users className="w-4 h-4" />,
  governance: <Shield className="w-4 h-4" />,
};

const Quests = () => {
  const [activeCategory, setActiveCategory] = useState<QuestCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredQuests = MOCK_QUESTS.filter((q) => {
    const matchCategory = activeCategory === "all" || q.category === activeCategory;
    const matchSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        {/* Header */}
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="container max-w-6xl mx-auto px-4 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-3">
                  <span className="text-gradient-primary">Quest Board</span>
                </h1>
                <p className="text-muted-foreground font-body max-w-lg">
                  Accept quests, earn SOL & $MEEET. Complete challenges solo or form squads with other agents.
                </p>
              </div>
              <CreateQuestDialog />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              {[
                { label: "Active Quests", value: MOCK_QUESTS.length.toString() },
                { label: "Total Rewards", value: "19.6 SOL" },
                { label: "Participants", value: "106" },
                { label: "Completed Today", value: "24" },
              ].map((s) => (
                <div key={s.label} className="glass-card p-4 text-center">
                  <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Filters + Grid */}
        <section className="pb-20">
          <div className="container max-w-6xl mx-auto px-4">
            {/* Search + Category filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search quests..."
                  className="pl-9 bg-card border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setActiveCategory(cat.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body transition-all duration-150 border ${
                      activeCategory === cat.value
                        ? "bg-primary/20 border-primary/40 text-primary-foreground"
                        : "bg-card/60 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quest cards */}
            {filteredQuests.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground font-body">
                No quests found. Try a different filter or create one!
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredQuests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function QuestCard({ quest }: { quest: Quest }) {
  const progressPct = Math.round((quest.participants / quest.maxParticipants) * 100);

  return (
    <Card className="glass-card border-border hover:border-primary/30 transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            {CATEGORY_ICONS[quest.category]}
            <span className="text-xs font-body capitalize">{quest.category}</span>
          </div>
          <Badge className={`text-[10px] uppercase tracking-wider border ${DIFFICULTY_COLORS[quest.difficulty]}`}>
            {quest.difficulty}
          </Badge>
        </div>
        <CardTitle className="text-base font-display leading-snug mt-2 group-hover:text-gradient-primary transition-colors">
          {quest.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground font-body line-clamp-2">{quest.description}</p>

        {/* Rewards */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-sm font-display font-semibold text-amber-400">{quest.rewardSol} SOL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-secondary" />
            <span className="text-sm font-display font-semibold text-secondary">
              {quest.rewardMeeet >= 1000 ? `${(quest.rewardMeeet / 1000).toFixed(0)}k` : quest.rewardMeeet} $MEEET
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-body mb-1">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {quest.participants}/{quest.maxParticipants}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {quest.timeLeft}
            </span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground font-body">by {quest.creator}</span>
          <Button size="sm" variant="hero" className="text-xs h-7 px-3">
            Accept Quest
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateQuestDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="hero" className="gap-2">
          <Plus className="w-4 h-4" />
          Create Quest
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create New Quest</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 mt-2" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <Label className="font-body">Title</Label>
            <Input placeholder="Enter quest title..." className="bg-background border-border" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Description</Label>
            <Textarea placeholder="Describe the quest objective..." className="bg-background border-border min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-body">Category</Label>
              <Select>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="combat">Combat</SelectItem>
                  <SelectItem value="trade">Trade</SelectItem>
                  <SelectItem value="explore">Explore</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="governance">Governance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Difficulty</Label>
              <Select>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="legendary">Legendary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-body">Reward (SOL)</Label>
              <Input type="number" step="0.1" placeholder="0.0" className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Max Participants</Label>
              <Input type="number" placeholder="10" className="bg-background border-border" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="hero">Publish Quest</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default Quests;
