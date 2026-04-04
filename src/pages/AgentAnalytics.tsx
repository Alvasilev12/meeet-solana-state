import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, CheckCircle2, Clock, Star, TrendingUp, TrendingDown,
  DollarSign, Zap, ArrowLeft, BarChart3, Loader2, Users,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";

interface DailyData {
  date: string;
  conversations: number;
  messages_sent: number;
  tasks_completed: number;
  tokens_used: number;
  avg_response_time_ms: number;
  satisfaction_score: number;
  estimated_hours_saved: number;
  estimated_cost_saved: number;
}

interface RoiSummary {
  total_conversations: number;
  total_tasks: number;
  total_tokens: number;
  total_hours_saved: number;
  total_cost_saved: number;
  avg_satisfaction: number;
  avg_response_ms: number;
  trend_pct: number;
  recent_7d_convos: number;
  prev_7d_convos: number;
}

const CHART_COLORS = {
  purple: "hsl(265, 80%, 60%)",
  blue: "hsl(220, 80%, 60%)",
  gold: "hsl(45, 90%, 55%)",
  emerald: "hsl(160, 70%, 45%)",
  pink: "hsl(330, 70%, 55%)",
  cyan: "hsl(190, 80%, 50%)",
};

const PIE_COLORS = [CHART_COLORS.purple, CHART_COLORS.cyan, CHART_COLORS.gold];

function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const dur = 1200;
    const start = performance.now();
    const from = ref.current;
    const animate = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = from + (value - from) * eased;
      setDisplay(cur);
      if (p < 1) requestAnimationFrame(animate);
      else ref.current = value;
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}

const AgentAnalytics = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { user } = useAuth();
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [roi, setRoi] = useState<RoiSummary | null>(null);
  const [agentName, setAgentName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    loadData();
  }, [agentId]);

  const loadData = async () => {
    const [analyticsRes, roiRes, agentRes] = await Promise.all([
      supabase
        .from("agent_analytics")
        .select("date, conversations, messages_sent, tasks_completed, tokens_used, avg_response_time_ms, satisfaction_score, estimated_hours_saved, estimated_cost_saved")
        .eq("agent_id", agentId!)
        .order("date", { ascending: true })
        .limit(30),
      supabase.rpc("get_agent_roi_summary", { agent_uuid: agentId! }),
      supabase.from("agents").select("name").eq("id", agentId!).maybeSingle(),
    ]);

    if (analyticsRes.data) setDailyData(analyticsRes.data as DailyData[]);
    if (roiRes.data) setRoi(roiRes.data as unknown as RoiSummary);
    if (agentRes.data) setAgentName(agentRes.data.name);
    setLoading(false);
  };

  // Compute weekly data for ROI bar chart
  const weeklyData = (() => {
    const weeks: Record<string, { hours: number; cost: number; label: string }> = {};
    dailyData.forEach((d) => {
      const weekStart = new Date(d.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks[key]) weeks[key] = { hours: 0, cost: 0, label: `W${Object.keys(weeks).length + 1}` };
      weeks[key].hours += Number(d.estimated_hours_saved);
      weeks[key].cost += Number(d.estimated_cost_saved);
    });
    return Object.values(weeks);
  })();

  // Channel breakdown mock
  const channelData = [
    { name: "Web", value: 45 },
    { name: "Telegram", value: 38 },
    { name: "API", value: 17 },
  ];

  // Response time distribution
  const responseDistribution = (() => {
    let fast = 0, med = 0, slow = 0;
    dailyData.forEach((d) => {
      if (d.avg_response_time_ms < 800) fast++;
      else if (d.avg_response_time_ms < 1500) med++;
      else slow++;
    });
    const total = fast + med + slow || 1;
    return [
      { label: "Быстрый (<0.8s)", pct: Math.round((fast / total) * 100), color: "bg-emerald-500" },
      { label: "Средний (0.8–1.5s)", pct: Math.round((med / total) * 100), color: "bg-amber-500" },
      { label: "Медленный (>1.5s)", pct: Math.round((slow / total) * 100), color: "bg-red-500" },
    ];
  })();

  if (loading) {
    return (
      <PageWrapper>
        <SEOHead title="Agent Analytics — Meeet" description="Track agent performance and ROI" />
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  const trendUp = (roi?.trend_pct ?? 0) >= 0;
  const hourlyRate = 35;
  const ftEquiv = roi ? Math.round(roi.total_hours_saved / 160 * 10) / 10 : 0;

  return (
    <PageWrapper>
      <SEOHead
        title={`${agentName || "Agent"} Analytics — Meeet`}
        description="Agent performance analytics and ROI tracking"
      />
      <Navbar />

      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Назад
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                {agentName || "Agent"} — Аналитика
              </h1>
              <p className="text-sm text-muted-foreground">Последние 30 дней</p>
            </div>
          </div>

          {/* Summary Cards */}
          {roi && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SummaryCard
                icon={MessageSquare}
                label="Диалоги"
                value={roi.total_conversations}
                trend={roi.trend_pct}
                color="text-purple-400"
              />
              <SummaryCard
                icon={CheckCircle2}
                label="Задачи"
                value={roi.total_tasks}
                color="text-blue-400"
              />
              <SummaryCard
                icon={Clock}
                label="Часы сэкономлены"
                value={roi.total_hours_saved}
                suffix="ч"
                decimals={1}
                color="text-emerald-400"
              />
              <SummaryCard
                icon={Star}
                label="Удовлетворённость"
                value={roi.avg_satisfaction}
                suffix="/5"
                decimals={1}
                color="text-amber-400"
              />
              <SummaryCard
                icon={Zap}
                label="Ответ"
                value={Math.round(roi.avg_response_ms)}
                suffix="ms"
                color="text-cyan-400"
              />
            </div>
          )}

          {/* ROI Highlight Card */}
          {roi && (
            <Card className="border-amber-500/40 bg-gradient-to-r from-amber-500/5 to-yellow-500/5">
              <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">💰 ROI за период</p>
                  <p className="text-4xl font-bold text-foreground">
                    <AnimatedNumber value={roi.total_cost_saved} prefix="$" decimals={0} />
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {roi.total_hours_saved}ч × ${hourlyRate}/ч ≈ эквивалент{" "}
                    <span className="text-foreground font-medium">{ftEquiv} FTE</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {trendUp ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
                      <TrendingUp className="w-3 h-3" /> +{roi.trend_pct}%
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/15 text-red-400 border-red-500/30 gap-1">
                      <TrendingDown className="w-3 h-3" /> {roi.trend_pct}%
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">vs прошлая неделя</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Area Chart */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Активность (диалоги/день)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.purple} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString("ru-RU")}
                    />
                    <Area type="monotone" dataKey="conversations" stroke={CHART_COLORS.purple} fill="url(#gradPurple)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* ROI Bar Chart */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">ROI по неделям</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis yAxisId="left" stroke={CHART_COLORS.blue} fontSize={10} />
                    <YAxis yAxisId="right" orientation="right" stroke={CHART_COLORS.gold} fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="hours" name="Часы" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="cost" name="$ Сэкономлено" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Channel Pie */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Каналы</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={channelData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {channelData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Satisfaction Trend */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Тренд удовлетворённости</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => new Date(v).toLocaleDateString("ru-RU", { day: "numeric" })}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                    />
                    <YAxis domain={[0, 5]} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="satisfaction_score" stroke={CHART_COLORS.gold} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Response Time Distribution */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Распределение времени ответа</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {responseDistribution.map((r) => (
                <div key={r.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="text-foreground font-medium">{r.pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.color} transition-all duration-1000`}
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </PageWrapper>
  );
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  trend,
  suffix = "",
  decimals = 0,
  color,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: number;
  trend?: number;
  suffix?: string;
  decimals?: number;
  color: string;
}) {
  return (
    <Card className="bg-card/30 border-border backdrop-blur-sm">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Icon className={`w-5 h-5 ${color}`} />
          {trend !== undefined && (
            <Badge
              variant="outline"
              className={`text-[10px] ${trend >= 0 ? "text-emerald-400 border-emerald-500/30" : "text-red-400 border-red-500/30"}`}
            >
              {trend >= 0 ? "+" : ""}{trend}%
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground">
          <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default AgentAnalytics;
