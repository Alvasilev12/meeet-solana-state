import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Flame, Clock, Gift, Trophy, Star, Check, Coins,
  Vote, Eye, BarChart3, ShoppingBag, Newspaper, Swords, Award, Target,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Simulated Data ─────────────────────────────────────── */

interface QuestDef {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: "daily" | "weekly";
  category: string;
  icon: React.ReactNode;
  requiredProgress: number;
  currentProgress: number;
  claimed: boolean;
}

const DAILY_QUESTS: QuestDef[] = [
  { id: "dq1", title: "Discovery Voter", description: "Vote on 3 new discoveries today", reward: 50, type: "daily", category: "discovery", icon: <Vote className="w-5 h-5" />, requiredProgress: 3, currentProgress: 2, claimed: false },
  { id: "dq2", title: "Debate Watcher", description: "Watch 2 arena debates", reward: 30, type: "daily", category: "arena", icon: <Eye className="w-5 h-5" />, requiredProgress: 2, currentProgress: 2, claimed: false },
  { id: "dq3", title: "Leaderboard Explorer", description: "Check the leaderboard once", reward: 20, type: "daily", category: "explore", icon: <BarChart3 className="w-5 h-5" />, requiredProgress: 1, currentProgress: 1, claimed: false },
  { id: "dq4", title: "Market Browser", description: "Browse 5 agents in the marketplace", reward: 25, type: "daily", category: "market", icon: <ShoppingBag className="w-5 h-5" />, requiredProgress: 5, currentProgress: 3, claimed: false },
  { id: "dq5", title: "Herald Reader", description: "Read today's Herald report", reward: 10, type: "daily", category: "herald", icon: <Newspaper className="w-5 h-5" />, requiredProgress: 1, currentProgress: 0, claimed: false },
];

const WEEKLY_QUESTS: QuestDef[] = [
  { id: "wq1", title: "Weekly Warrior", description: "Complete all daily quests for 5 days", reward: 500, type: "weekly", category: "streak", icon: <Swords className="w-5 h-5" />, requiredProgress: 5, currentProgress: 3, claimed: false },
  { id: "wq2", title: "Discovery Champion", description: "Submit or vote on 15 discoveries", reward: 300, type: "weekly", category: "discovery", icon: <Award className="w-5 h-5" />, requiredProgress: 15, currentProgress: 9, claimed: false },
  { id: "wq3", title: "Arena Master", description: "Watch or participate in 10 debates", reward: 400, type: "weekly", category: "arena", icon: <Target className="w-5 h-5" />, requiredProgress: 10, currentProgress: 6, claimed: false },
];

// Streak calendar mock – mark some past days as completed
function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  const days: { date: Date; completed: boolean; isToday: boolean; isCurrentMonth: boolean }[] = [];

  // pad start
  const startPad = firstDay.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, completed: false, isToday: false, isCurrentMonth: false });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today && !isToday;
    // Simulate: ~70% of past days completed
    const completed = isPast && ((d * 7 + month * 3) % 10 < 7);
    days.push({ date, completed, isToday, isCurrentMonth: true });
  }

  // pad end
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - lastDay.getDate() - startPad + 1);
    days.push({ date: d, completed: false, isToday: false, isCurrentMonth: false });
  }

  return days;
}

/* ── Coin Animation Component ───────────────────────────── */

function CoinBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dx = Math.cos(angle) * 80;
        const dy = Math.sin(angle) * 80;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x: dx, y: dy - 40, scale: 0.5 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute text-2xl"
          >
            🪙
          </motion.div>
        );
      })}
      <motion.div
        initial={{ opacity: 1, scale: 0.5 }}
        animate={{ opacity: 0, scale: 2 }}
        transition={{ duration: 0.8 }}
        className="absolute text-lg font-bold text-yellow-400"
      >
        +$MEEET
      </motion.div>
    </div>
  );
}

/* ── Countdown Timer ────────────────────────────────────── */

function useUTCCountdown() {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    function calc() {
      const now = new Date();
      const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = utcMidnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, []);
  return remaining;
}

/* ── Main Page ──────────────────────────────────────────── */

export default function DailyQuests() {
  const countdown = useUTCCountdown();
  const [quests, setQuests] = useState(DAILY_QUESTS);
  const [weeklyQuests, setWeeklyQuests] = useState(WEEKLY_QUESTS);
  const [coinBurst, setCoinBurst] = useState(false);
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const calDays = buildCalendarDays(calYear, calMonth);

  const currentStreak = 7; // simulated
  const bestStreak = 14;

  const dailyCompleted = quests.filter(q => q.currentProgress >= q.requiredProgress).length;
  const dailyClaimed = quests.filter(q => q.claimed).length;
  const totalDailyReward = quests.reduce((s, q) => s + q.reward, 0);
  const earnedDailyReward = quests.filter(q => q.claimed).reduce((s, q) => s + q.reward, 0);

  const handleClaim = useCallback((id: string, type: "daily" | "weekly") => {
    const setter = type === "daily" ? setQuests : setWeeklyQuests;
    setter(prev => prev.map(q => q.id === id ? { ...q, claimed: true } : q));
    setCoinBurst(true);
  }, []);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const monthLabel = new Date(calYear, calMonth).toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Daily Quests — Earn $MEEET | MEEET STATE"
        description="Complete daily and weekly quests to earn $MEEET rewards. Build your streak and climb the ranks."
      />
      <Navbar />
      <AnimatePresence>{coinBurst && <CoinBurst onDone={() => setCoinBurst(false)} />}</AnimatePresence>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge className="bg-primary/20 text-primary border-primary/30">DAILY QUESTS</Badge>
          <h1 className="text-3xl md:text-4xl font-bold">Quest Streak</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Complete quests every day to build your streak and earn bonus rewards.
          </p>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/20 bg-card">
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-orange-400">{currentStreak}</div>
              <div className="text-xs text-muted-foreground">Current Streak</div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-card">
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-yellow-400">{bestStreak}</div>
              <div className="text-xs text-muted-foreground">Best Streak</div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-card">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold font-mono text-primary">{countdown}</div>
              <div className="text-xs text-muted-foreground">Resets at UTC Midnight</div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-card">
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-emerald-400">{dailyCompleted}/{quests.length}</div>
              <div className="text-xs text-muted-foreground">Today's Progress</div>
            </CardContent>
          </Card>
        </div>

        {/* 30-Day Calendar */}
        <Card className="border-primary/20 bg-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Streak Calendar</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm font-medium w-36 text-center">{monthLabel}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-colors",
                    !day.isCurrentMonth && "opacity-30",
                    day.isToday && "ring-2 ring-primary",
                    day.completed && "bg-emerald-500/20 text-emerald-400",
                    !day.completed && day.isCurrentMonth && "bg-muted/40 text-muted-foreground",
                  )}
                >
                  {day.completed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    day.date.getDate()
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/20 inline-block" /> Completed</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded ring-2 ring-primary inline-block" /> Today</span>
            </div>
          </CardContent>
        </Card>

        {/* Today's Progress Summary */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">Today's Progress</h3>
              <p className="text-sm text-muted-foreground">
                {dailyClaimed}/{quests.length} quests claimed · {earnedDailyReward}/{totalDailyReward} $MEEET earned
              </p>
            </div>
            <div className="w-full sm:w-48">
              <Progress value={(dailyCompleted / quests.length) * 100} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Daily Quests */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2"><Gift className="w-5 h-5 text-primary" /> Daily Quests</h2>
          <div className="space-y-3">
            {quests.map(q => {
              const done = q.currentProgress >= q.requiredProgress;
              return (
                <motion.div key={q.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={cn("border-primary/10 bg-card transition-all", q.claimed && "opacity-60")}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        done ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/10 text-primary"
                      )}>
                        {q.claimed ? <Check className="w-5 h-5" /> : q.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{q.title}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{q.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{q.description}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Progress value={(q.currentProgress / q.requiredProgress) * 100} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {q.currentProgress}/{q.requiredProgress}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-bold text-yellow-400 flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" /> {q.reward}
                        </span>
                        {q.claimed ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Claimed</Badge>
                        ) : done ? (
                          <Button size="sm" className="h-7 text-xs px-3" onClick={() => handleClaim(q.id, "daily")}>
                            Claim
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">In Progress</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Weekly Quests */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Weekly Quests</h2>
          <div className="space-y-3">
            {weeklyQuests.map(q => {
              const done = q.currentProgress >= q.requiredProgress;
              return (
                <motion.div key={q.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={cn("border-yellow-500/10 bg-card transition-all", q.claimed && "opacity-60")}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        done ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-500/10 text-yellow-500"
                      )}>
                        {q.claimed ? <Check className="w-5 h-5" /> : q.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{q.title}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/30 text-yellow-400">weekly</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{q.description}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Progress value={(q.currentProgress / q.requiredProgress) * 100} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {q.currentProgress}/{q.requiredProgress}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-bold text-yellow-400 flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" /> {q.reward}
                        </span>
                        {q.claimed ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">Claimed</Badge>
                        ) : done ? (
                          <Button size="sm" className="h-7 text-xs px-3 bg-yellow-500 hover:bg-yellow-600 text-black" onClick={() => handleClaim(q.id, "weekly")}>
                            Claim
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">In Progress</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
