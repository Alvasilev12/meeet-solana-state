import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Check, Gift, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";

interface DailyQuest {
  id: string;
  icon: string;
  title: string;
  description: string;
  reward: number;
  target: number;
}

const DAILY_QUESTS: DailyQuest[] = [
  { id: "explore", icon: "🔍", title: "Explore the Nation", description: "Visit 3 different pages", reward: 5, target: 3 },
  { id: "knowledge", icon: "📖", title: "Knowledge Seeker", description: "Read 2 discoveries in Explore", reward: 10, target: 2 },
  { id: "arena", icon: "⚔️", title: "Arena Spectator", description: "Watch 1 debate in Arena", reward: 8, target: 1 },
  { id: "lab", icon: "🧪", title: "Lab Scientist", description: "Run 1 analysis in AI Playground", reward: 15, target: 1 },
  { id: "civic", icon: "🗳️", title: "Civic Duty", description: "Vote on 1 governance proposal", reward: 12, target: 1 },
  { id: "market", icon: "📊", title: "Market Analyst", description: "Check the token page", reward: 3, target: 1 },
];

const STREAK_MILESTONES = [
  { days: 3, multiplier: 2 },
  { days: 7, multiplier: 3 },
  { days: 30, multiplier: 5 },
];

const FAKE_LEADERBOARD = [
  { name: "QuantumPhoenix", quests: 42, earned: 3250 },
  { name: "NeuraStar", quests: 38, earned: 2980 },
  { name: "CyberOwl", quests: 35, earned: 2710 },
  { name: "DataHawk", quests: 31, earned: 2400 },
  { name: "SolPilot", quests: 28, earned: 2150 },
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekKey() {
  const d = new Date();
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return start.toISOString().slice(0, 10);
}

function getTimeToMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "0h 0m";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function getWeekCountdown() {
  const now = new Date();
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(0, 0, 0, 0);
  const ms = nextSunday.getTime() - now.getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

interface QuestState {
  completed: Record<string, boolean>;
  date: string;
  streak: number;
  lastStreakDate: string;
  weeklyCompleted: number;
  weekKey: string;
  totalEarned: number;
  streakDates: string[];
}

function loadState(): QuestState {
  try {
    const raw = localStorage.getItem("dq_state");
    if (raw) {
      const s = JSON.parse(raw) as QuestState;
      const today = getTodayKey();
      const weekKey = getWeekKey();
      // Reset daily if new day
      if (s.date !== today) {
        // Check streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yKey = yesterday.toISOString().slice(0, 10);
        const streak = s.lastStreakDate === yKey ? s.streak + 1 : (s.lastStreakDate === today ? s.streak : 1);
        const streakDates = [...(s.streakDates || [])];
        if (!streakDates.includes(today)) streakDates.push(today);
        return { ...s, completed: {}, date: today, streak, lastStreakDate: s.date, weeklyCompleted: s.weekKey === weekKey ? s.weeklyCompleted : 0, weekKey, streakDates: streakDates.slice(-30) };
      }
      if (s.weekKey !== weekKey) {
        return { ...s, weeklyCompleted: 0, weekKey };
      }
      return s;
    }
  } catch { /* ignore */ }
  return { completed: {}, date: getTodayKey(), streak: 1, lastStreakDate: "", weeklyCompleted: 0, weekKey: getWeekKey(), totalEarned: 0, streakDates: [getTodayKey()] };
}

function saveState(s: QuestState) {
  localStorage.setItem("dq_state", JSON.stringify(s));
}

const DailyQuestsBoard = () => {
  const [state, setState] = useState<QuestState>(loadState);
  const [countdown, setCountdown] = useState(formatCountdown(getTimeToMidnight()));
  const [weekCountdown, setWeekCountdown] = useState(getWeekCountdown());

  useEffect(() => {
    const iv = setInterval(() => {
      setCountdown(formatCountdown(getTimeToMidnight()));
      setWeekCountdown(getWeekCountdown());
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const streakMultiplier = useMemo(() => {
    for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
      if (state.streak >= STREAK_MILESTONES[i].days) return STREAK_MILESTONES[i].multiplier;
    }
    return 1;
  }, [state.streak]);

  const completeQuest = useCallback((quest: DailyQuest) => {
    setState(prev => {
      if (prev.completed[quest.id]) return prev;
      const reward = quest.reward * streakMultiplier;
      const completedCount = Object.values(prev.completed).filter(Boolean).length + 1;
      const anyDailyDoneToday = completedCount === 1; // first quest today counts for weekly
      const next: QuestState = {
        ...prev,
        completed: { ...prev.completed, [quest.id]: true },
        totalEarned: prev.totalEarned + reward,
        weeklyCompleted: anyDailyDoneToday ? prev.weeklyCompleted + 1 : prev.weeklyCompleted,
      };
      saveState(next);
      toast.success(`+${reward} $MEEET earned!`, { description: quest.title });
      return next;
    });
  }, [streakMultiplier]);

  const completedCount = Object.values(state.completed).filter(Boolean).length;
  const totalDailyReward = DAILY_QUESTS.reduce((s, q) => s + q.reward, 0) * streakMultiplier;

  return (
    <div className="space-y-8">
      {/* Weekly Challenge */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Weekly Challenge</h3>
            </div>
            <p className="text-sm text-muted-foreground">Complete daily quests on 5 different days this week</p>
            <Progress value={(state.weeklyCompleted / 5) * 100} className="h-2 w-full max-w-xs" />
            <p className="text-xs text-muted-foreground">{state.weeklyCompleted}/5 days · Reward: <strong className="text-primary">100 $MEEET</strong></p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" /> Resets in: {weekCountdown}
            </div>
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <Flame className="w-6 h-6 text-orange-500" />
          </motion.div>
          <div>
            <p className="font-bold text-foreground">🔥 Streak: {state.streak} day{state.streak !== 1 ? "s" : ""}</p>
            <p className="text-xs text-muted-foreground">
              {streakMultiplier > 1 ? `${streakMultiplier}x rewards active!` : "Complete quests daily for bonus multipliers"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" /> Resets in: {countdown}
          <span className="text-border">·</span>
          <span>Earned today: <strong className="text-foreground">{completedCount > 0 ? DAILY_QUESTS.filter(q => state.completed[q.id]).reduce((s, q) => s + q.reward * streakMultiplier, 0) : 0} $MEEET</strong></span>
        </div>
      </div>

      {/* Streak milestones */}
      <div className="flex gap-3 flex-wrap">
        {STREAK_MILESTONES.map(m => (
          <div key={m.days} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${state.streak >= m.days ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border"}`}>
            {m.days}d = {m.multiplier}x
          </div>
        ))}
      </div>

      {/* Streak calendar */}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: 30 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          const key = d.toISOString().slice(0, 10);
          const done = state.streakDates?.includes(key);
          return (
            <div
              key={key}
              title={key}
              className={`w-4 h-4 rounded-sm ${done ? "bg-primary" : "bg-muted/30"}`}
            />
          );
        })}
      </div>

      {/* Quest Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAILY_QUESTS.map(quest => {
          const done = state.completed[quest.id];
          return (
            <motion.div
              key={quest.id}
              layout
              className={`rounded-xl border p-4 space-y-3 transition-colors ${done ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{quest.icon}</span>
                  <h4 className="font-bold text-sm text-foreground">{quest.title}</h4>
                </div>
                {done && <Check className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">{quest.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">+{quest.reward * streakMultiplier} $MEEET</span>
                <Button
                  size="sm"
                  variant={done ? "ghost" : "default"}
                  disabled={done}
                  onClick={() => completeQuest(quest)}
                  className="text-xs h-7 px-3"
                >
                  {done ? (
                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Done</span>
                  ) : "Complete"}
                </Button>
              </div>
              <Progress value={done ? 100 : 0} className="h-1" />
            </motion.div>
          );
        })}
      </div>

      {/* Mini Leaderboard */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" /> Top Quest Completers This Week
        </h3>
        <div className="space-y-2">
          {FAKE_LEADERBOARD.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-3 py-1.5">
              <span className="w-5 text-xs text-muted-foreground font-bold text-center">{i + 1}</span>
              <img src={getAgentAvatarUrl(entry.name)} alt="" className="w-6 h-6 rounded-full bg-muted" />
              <span className="text-sm font-medium text-foreground flex-1">{entry.name}</span>
              <span className="text-xs text-muted-foreground">{entry.quests} quests</span>
              <span className="text-xs font-bold text-primary">{entry.earned} $MEEET</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyQuestsBoard;
