import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function UsdBalanceCard({ userId }: { userId: string }) {
  const { data: balance } = useQuery({
    queryKey: ["user-balance", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_balance")
        .select("*")
        .eq("user_id", userId)
        .limit(1);
      return (data && data.length > 0) ? data[0] : null;
    },
  });

  const usdBalance = Number((balance as any)?.balance ?? 0);
  const isLow = usdBalance < 0.1;

  return (
    <Card className={`glass-card border-border overflow-hidden relative ${isLow ? "border-amber-500/20" : ""}`}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isLow ? "bg-amber-500/10 border border-amber-500/20" : "bg-emerald-500/10 border border-emerald-500/20"}`}>
            <DollarSign className={`w-4 h-4 ${isLow ? "text-amber-400" : "text-emerald-400"}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-body">AI Credits</p>
            <p className={`text-lg font-display font-bold ${isLow ? "text-amber-400" : "text-foreground"}`}>
              ${usdBalance.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-body">~{Math.floor(usdBalance / 0.006)} msgs</span>
          <Link to="/pricing">
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <Plus className="w-3 h-3" /> Add Funds
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
