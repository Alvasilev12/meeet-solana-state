import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  questionId: string;
}

interface DayData {
  date: string;
  yes: number;
  no: number;
}

export default function OracleMarketChart({ questionId }: Props) {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data: rows } = await supabase.rpc("get_oracle_bet_history", {
          p_question_id: questionId,
        });
        if (!cancelled && rows) {
          // Build cumulative data
          let cumYes = 0;
          let cumNo = 0;
          const cumulative = (rows as { bet_date: string; yes_total: number; no_total: number }[]).map((r) => {
            cumYes += Number(r.yes_total);
            cumNo += Number(r.no_total);
            const total = cumYes + cumNo;
            return {
              date: new Date(r.bet_date).toLocaleDateString("en", { month: "short", day: "numeric" }),
              yes: total > 0 ? Math.round((cumYes / total) * 100) : 50,
              no: total > 0 ? Math.round((cumNo / total) * 100) : 50,
            };
          });
          setData(cumulative);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [questionId]);

  if (loading) {
    return <Skeleton className="h-[140px] w-full rounded-lg" />;
  }

  if (data.length < 2) {
    return (
      <div className="h-[100px] flex items-center justify-center text-xs text-muted-foreground border border-border/30 rounded-lg">
        Not enough data for chart
      </div>
    );
  }

  return (
    <div className="h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="yesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="noGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [`${value}%`, name === "yes" ? "YES" : "NO"]}
          />
          <Area type="monotone" dataKey="yes" stroke="hsl(142, 71%, 45%)" fill="url(#yesGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="no" stroke="hsl(0, 84%, 60%)" fill="url(#noGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
