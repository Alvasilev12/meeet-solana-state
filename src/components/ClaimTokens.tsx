import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import {
  Loader2, Coins, ArrowDown, Wallet, AlertTriangle, Flame, Receipt, CheckCircle2, Lock,
} from "lucide-react";
import ConnectWallet from "./ConnectWallet";

interface ClaimTokensProps {
  agentId: string;
  agentBalance: number;
  walletAddress?: string | null;
}

const TAX_RATE = 0.05; // 5% claim tax
const BURN_RATE = 0.20; // 20% of tax burned
const MIN_CLAIM = 100;

export default function ClaimTokens({ agentId, agentBalance, walletAddress }: ClaimTokensProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);

  const numAmount = Number(amount) || 0;
  const taxAmount = Math.floor(numAmount * TAX_RATE);
  const burnAmount = Math.floor(taxAmount * BURN_RATE);
  const netAmount = numAmount - taxAmount;

  const claimMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("claim-tokens", {
        body: { agent_id: agentId, amount: numAmount },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-agent"] });
      queryClient.invalidateQueries({ queryKey: ["recent-tx"] });
      toast({
        title: "🎉 Claim submitted!",
        description: `${data.net_amount.toLocaleString()} $MEEET queued for withdrawal to ${walletAddress?.slice(0, 4)}...${walletAddress?.slice(-4)}.`,
      });
      setAmount("");
      setOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Claim failed", description: err.message, variant: "destructive" });
    },
  });

  const canClaim = numAmount >= MIN_CLAIM && numAmount <= agentBalance && !!walletAddress;
  const isTokenLive = false; // Toggle when SPL token launches

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
        >
          <ArrowDown className="w-3 h-3" /> Claim $MEEET
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            Claim $MEEET Tokens
          </DialogTitle>
          <DialogDescription className="font-body text-xs">
            Withdraw $MEEET from your agent's balance to your Solana wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Agent balance */}
          <div className="glass-card rounded-lg p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mb-1">Agent Balance</p>
            <p className="text-2xl font-display font-bold text-foreground">
              {agentBalance.toLocaleString()} <span className="text-sm text-muted-foreground">$MEEET</span>
            </p>
          </div>

          {/* Wallet check */}
          {!walletAddress ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-400 font-body">
                  Connect and save a wallet to your profile first.
                </p>
              </div>
              <ConnectWallet />
            </div>
          ) : (
            <>
              {/* Connected wallet display */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-body">Withdraw to</p>
                  <p className="font-mono text-xs text-foreground truncate">{walletAddress}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-body text-muted-foreground">Amount to claim</label>
                  <button
                    onClick={() => setAmount(String(agentBalance))}
                    className="text-[10px] text-primary hover:underline font-body"
                  >
                    MAX
                  </button>
                </div>
                <Input
                  type="number"
                  placeholder={`Min ${MIN_CLAIM}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={MIN_CLAIM}
                  max={agentBalance}
                  className="font-mono bg-background"
                />
              </div>

              {/* Tax breakdown */}
              {numAmount > 0 && (
                <div className="glass-card rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-body flex items-center gap-1.5">
                      <Receipt className="w-3 h-3" /> Tax ({(TAX_RATE * 100).toFixed(0)}%)
                    </span>
                    <span className="font-mono text-amber-400">-{taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-body flex items-center gap-1.5">
                      <Flame className="w-3 h-3" /> Burned ({(BURN_RATE * 100).toFixed(0)}% of tax)
                    </span>
                    <span className="font-mono text-orange-400">🔥 {burnAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex items-center justify-between text-sm">
                    <span className="font-body font-semibold text-foreground">You receive</span>
                    <span className="font-mono font-bold text-emerald-400">{netAmount.toLocaleString()} $MEEET</span>
                  </div>
                </div>
              )}

              {/* Status notice */}
              {!isTokenLive && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                  <Lock className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-[10px] text-muted-foreground font-body">
                    Claims are queued and will be processed after the $MEEET SPL token launches on Solana. Your claim is recorded on-chain.
                  </p>
                </div>
              )}

              {/* Claim button */}
              <Button
                variant="hero"
                className="w-full gap-2"
                disabled={!canClaim || claimMutation.isPending}
                onClick={() => claimMutation.mutate()}
              >
                {claimMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
                {numAmount < MIN_CLAIM
                  ? `Minimum ${MIN_CLAIM} $MEEET`
                  : numAmount > agentBalance
                    ? "Insufficient balance"
                    : `Claim ${netAmount.toLocaleString()} $MEEET`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
