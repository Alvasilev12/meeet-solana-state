import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, ExternalLink, Wallet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TreasuryData {
  address: string;
  balance_sol: number;
}

export default function TreasuryDeposit() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data, isLoading, refetch, isRefetching } = useQuery<TreasuryData>({
    queryKey: ["treasury-sol-info"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("treasury-info");
      if (error) throw error;
      return data as TreasuryData;
    },
    staleTime: 60_000,
  });

  const copyAddress = () => {
    if (!data?.address) return;
    navigator.clipboard.writeText(data.address);
    setCopied(true);
    toast({ title: "Copied!", description: "Treasury address copied. Send SOL to this address." });
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddress = data?.address
    ? `${data.address.slice(0, 8)}...${data.address.slice(-6)}`
    : "Loading...";

  return (
    <Card className="glass-card border-secondary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <Wallet className="w-4 h-4 text-secondary" />
          Treasury Wallet (SOL)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-8 bg-muted rounded w-1/2" />
          </div>
        ) : data ? (
          <>
            <div className="text-2xl font-mono font-bold text-secondary">
              {data.balance_sol.toFixed(4)} SOL
            </div>

            <div className="flex items-center gap-2">
              <code className="text-[11px] font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded flex-1 truncate">
                {data.address}
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={copyAddress}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Send SOL to this address to fund quest rewards. Balance auto-deducts on quest approval.
            </p>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-1"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isRefetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex-1"
                asChild
              >
                <a
                  href={`https://solscan.io/account/${data.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Solscan
                </a>
              </Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Treasury not configured</p>
        )}
      </CardContent>
    </Card>
  );
}
