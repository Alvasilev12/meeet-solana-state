import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Lock, ChevronDown, Trophy, Compass, FlaskConical, Swords,
  Coins, MessageCircle, Wrench, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ──────────────────────────────────────────────── */

type Rarity = "bronze" | "silver" | "gold" | "legendary";

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  icon: string;
  reward: number;
  requiredProgress: number;
  currentProgress: number;
  unlocked: boolean;
  unlockedAt?: string;
  points: number;
}

interface CategoryDef {
  name: string;
  icon: React.ReactNode;
  achievements: AchievementDef[];
}

/* ── Rarity styling ─────────────────────────────────────── */

const RARITY: Record<Rarity, { color: string; bg: string; border: string; glow: string; label: string }> = {
  bronze:    { color: "text-[#CD7F32]", bg: "bg-[#CD7F32]/10", border: "border-[#CD7F32]/30", glow: "shadow-[0_0_12px_rgba(205,127,50,0.4)]", label: "Bronze" },
  silver:    { color: "text-[#C0C0C0]", bg: "bg-[#C0C0C0]/10", border: "border-[#C0C0C0]/30", glow: "shadow-[0_0_12px_rgba(192,192,192,0.4)]", label: "Silver" },
  gold:      { color: "text-[#FFD700]", bg: "bg-[#FFD700]/10", border: "border-[#FFD700]/30", glow: "shadow-[0_0_12px_rgba(255,215,0,0.4)]", label: "Gold" },
  legendary: { color: "text-[#9B59B6]", bg: "bg-[#9B59B6]/10", border: "border-[#9B59B6]/30", glow: "shadow-[0_0_16px_rgba(155,89,182,0.5)]", label: "Legendary" },
};

/* ── Simulated data ─────────────────────────────────────── */

const CATEGORIES: CategoryDef[] = [
  {
    name: "Explorer",
    icon: <Compass className="w-5 h-5" />,
    achievements: [
      { id: "exp1", name: "First Steps", description: "Visit 5 different pages", rarity: "bronze", icon: "🗺️", reward: 25, requiredProgress: 5, currentProgress: 5, unlocked: true, unlockedAt: "2026-03-15", points: 50 },
      { id: "exp2", name: "World Traveler", description: "Visit all major sections", rarity: "silver", icon: "🌍", reward: 100, requiredProgress: 12, currentProgress: 9, unlocked: false, points: 100 },
      { id: "exp3", name: "Cartographer", description: "Explore all World Map domains", rarity: "gold", icon: "🧭", reward: 250, requiredProgress: 8, currentProgress: 3, unlocked: false, points: 200 },
    ],
  },
  {
    name: "Scientist",
    icon: <FlaskConical className="w-5 h-5" />,
    achievements: [
      { id: "sci1", name: "Curious Mind", description: "Vote on your first discovery", rarity: "bronze", icon: "🔬", reward: 25, requiredProgress: 1, currentProgress: 1, unlocked: true, unlockedAt: "2026-03-18", points: 50 },
      { id: "sci2", name: "Peer Reviewer", description: "Vote on 25 discoveries", rarity: "silver", icon: "📋", reward: 150, requiredProgress: 25, currentProgress: 25, unlocked: true, unlockedAt: "2026-04-01", points: 150 },
      { id: "sci3", name: "Nobel Laureate", description: "Contribute to 50 discoveries", rarity: "gold", icon: "🏅", reward: 500, requiredProgress: 50, currentProgress: 31, unlocked: false, points: 300 },
    ],
  },
  {
    name: "Gladiator",
    icon: <Swords className="w-5 h-5" />,
    achievements: [
      { id: "gla1", name: "First Blood", description: "Win your first arena debate", rarity: "bronze", icon: "⚔️", reward: 30, requiredProgress: 1, currentProgress: 1, unlocked: true, unlockedAt: "2026-03-20", points: 50 },
      { id: "gla2", name: "Arena Champion", description: "Win 25 arena debates", rarity: "silver", icon: "🏟️", reward: 200, requiredProgress: 25, currentProgress: 14, unlocked: false, points: 150 },
      { id: "gla3", name: "Undefeated", description: "Win 10 debates in a row", rarity: "gold", icon: "👑", reward: 500, requiredProgress: 10, currentProgress: 4, unlocked: false, points: 300 },
    ],
  },
  {
    name: "Economist",
    icon: <Coins className="w-5 h-5" />,
    achievements: [
      { id: "eco1", name: "First Stake", description: "Stake $MEEET for the first time", rarity: "bronze", icon: "💰", reward: 30, requiredProgress: 1, currentProgress: 1, unlocked: true, unlockedAt: "2026-03-22", points: 50 },
      { id: "eco2", name: "Diamond Hands", description: "Maintain a stake for 30 days", rarity: "silver", icon: "💎", reward: 200, requiredProgress: 30, currentProgress: 30, unlocked: true, unlockedAt: "2026-04-05", points: 150 },
      { id: "eco3", name: "Whale", description: "Stake 100,000 $MEEET", rarity: "gold", icon: "🐋", reward: 1000, requiredProgress: 100000, currentProgress: 42000, unlocked: false, points: 500 },
    ],
  },
  {
    name: "Social",
    icon: <MessageCircle className="w-5 h-5" />,
    achievements: [
      { id: "soc1", name: "Chatterbox", description: "Send 10 guild messages", rarity: "bronze", icon: "💬", reward: 20, requiredProgress: 10, currentProgress: 10, unlocked: true, unlockedAt: "2026-03-19", points: 50 },
      { id: "soc2", name: "Influencer", description: "Refer 5 new users", rarity: "silver", icon: "📣", reward: 200, requiredProgress: 5, currentProgress: 5, unlocked: true, unlockedAt: "2026-04-02", points: 150 },
      { id: "soc3", name: "Ambassador", description: "Refer 25 new users", rarity: "gold", icon: "🌟", reward: 500, requiredProgress: 25, currentProgress: 8, unlocked: false, points: 300 },
    ],
  },
  {
    name: "Builder",
    icon: <Wrench className="w-5 h-5" />,
    achievements: [
      { id: "bld1", name: "Creator", description: "Deploy your first agent", rarity: "bronze", icon: "🤖", reward: 50, requiredProgress: 1, currentProgress: 1, unlocked: true, unlockedAt: "2026-03-17", points: 50 },
      { id: "bld2", name: "Army Commander", description: "Deploy 10 agents", rarity: "silver", icon: "🎖️", reward: 300, requiredProgress: 10, currentProgress: 10, unlocked: true, unlockedAt: "2026-04-03", points: 200 },
      { id: "bld3", name: "AI Overlord", description: "Have an agent reach Level 20", rarity: "legendary", icon: "🔮", reward: 1000, requiredProgress: 20, currentProgress: 12, unlocked: false, points: 500 },
    ],
  },
];

const totalAchievements = CATEGORIES.reduce((s, c) => s + c.achievements.length, 0);
const unlockedAchievements = CATEGORIES.reduce((s, c) => s + c.achievements.filter(a => a.unlocked).length, 0);
const totalPoints = CATEGORIES.reduce((s, c) => s + c.achievements.filter(a => a.unlocked).reduce((p, a) => p + a.points, 0), 0);

/* ── Badge Card Component ───────────────────────────────── */

function BadgeCard({ a }: { a: AchievementDef }) {
  const r = RARITY[a.rarity];
  const pct = Math.min((a.currentProgress / a.requiredProgress) * 100, 100);

  return (
    <Card className={cn(
      "border transition-all",
      a.unlocked ? `${r.border} ${r.glow}` : "border-border opacity-60",
    )}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0",
          a.unlocked ? r.bg : "bg-muted/50",
        )}>
          {a.unlocked ? a.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-semibold text-sm", a.unlocked ? r.color : "text-muted-foreground")}>{a.name}</span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", a.unlocked ? `${r.border} ${r.color}` : "")}>
              {r.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{a.description}</p>
          <div className="flex items-center gap-2">
            <Progress value={pct} className="h-1.5 flex-1" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {a.requiredProgress >= 1000
                ? `${(a.currentProgress / 1000).toFixed(0)}k/${(a.requiredProgress / 1000).toFixed(0)}k`
                : `${a.currentProgress}/${a.requiredProgress}`}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-yellow-400 flex items-center gap-0.5">
              <Coins className="w-3 h-3" /> {a.reward} $MEEET
            </span>
            <span className="text-muted-foreground flex items-center gap-0.5">
              <Star className="w-3 h-3" /> {a.points} pts
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Category Section ───────────────────────────────────── */

function CategorySection({ cat }: { cat: CategoryDef }) {
  const [open, setOpen] = useState(true);
  const unlocked = cat.achievements.filter(a => a.unlocked).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {cat.icon}
            </div>
            <span className="font-semibold">{cat.name}</span>
            <Badge variant="outline" className="text-[10px]">{unlocked}/{cat.achievements.length}</Badge>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          {cat.achievements.map(a => <BadgeCard key={a.id} a={a} />)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export default function Achievements() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Achievements — Unlock Badges | MEEET STATE"
        description="Track your progress and unlock badges as you explore MEEET STATE."
      />
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">ACHIEVEMENTS</Badge>
          <h1 className="text-3xl md:text-4xl font-bold">Achievements</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Unlock badges as you explore MEEET STATE
          </p>
        </div>

        {/* Stats bar */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="font-bold text-lg">{unlockedAchievements}/{totalAchievements} Achievements Unlocked</p>
                <p className="text-sm text-muted-foreground">{totalPoints.toLocaleString()} Achievement Points</p>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Progress value={(unlockedAchievements / totalAchievements) * 100} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="space-y-4">
          {CATEGORIES.map(cat => <CategorySection key={cat.name} cat={cat} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Export for reuse on Dashboard
export { CATEGORIES, RARITY };
export type { AchievementDef };
