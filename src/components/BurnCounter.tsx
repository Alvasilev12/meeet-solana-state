import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Flame } from "lucide-react";
import { useState, useEffect, forwardRef } from "react";

function AnimatedNumber({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target <= 0) return;
    const steps = 50;
    const inc = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setCount(target); clearInterval(t); }
      else setCount(Math.floor(cur));
    }, 40);
    return () => clearInterval(t);
  }, [target]);
  return <>{count.toLocaleString()}</>;
}

const BurnCounter = forwardRef<HTMLDivElement>(function BurnCounter(_props, ref) {
  const queryClient = useQueryClient();

  const { data: totalBurned = 333 } = useQuery({
    queryKey: ["burn-counter-home"],
    queryFn: async () => {
      const { data } = await supabase.from("burn_log").select("amount");
      const total = (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      return total || 333;
    },
    staleTime: Infinity,
  });

  // Realtime subscription for live burn updates
  useEffect(() => {
    const channel = supabase
      .channel("burn-counter-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "burn_log" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["burn-counter-home"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div ref={ref} className="flex items-center justify-center gap-3 py-3">
      <Flame className="w-5 h-5 text-red-400 animate-pulse" />
      <span className="text-lg font-display font-bold text-red-400">
        <AnimatedNumber target={totalBurned} />
      </span>
      <span className="text-sm text-muted-foreground">MEEET Burned Forever</span>
    </div>
  );
});

export default BurnCounter;
