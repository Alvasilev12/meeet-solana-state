import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Loader2, ExternalLink, Plus, Zap, Sparkles, AlertCircle } from "lucide-react";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { toast } from "sonner";

interface Props {
  userId: string;
}

const QUICK_AMOUNTS = [1, 5, 20, 50];

export default function BillingTopUp({ userId }: Props) {
  const qc = useQueryClient();
  const { address, getProvider, connect } = useSolanaWallet();
  const [selectedUsd, setSelectedUsd] = useState<number>(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [info, setInfo] = useState<{ treasury_address: string; sol_usd_price: number } | null>(null);

  // Current balance
  const { data: billing } = useQuery({
    queryKey: ["agent-billing", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_billing")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    refetchInterval: 15000,
  });

  // Load treasury info on mount
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("topup-via-sol", { body: { action: "info" } });
      if (!error && data?.success) {
        setInfo({ treasury_address: data.treasury_address, sol_usd_price: data.sol_usd_price });
      }
    })();
  }, []);

  const balanceUsd = billing?.balance_usd ?? 0;
  const totalSpent = billing?.total_spent ?? 0;
  const isLowBalance = balanceUsd < 0.5;

  const solAmount = info ? (selectedUsd / info.sol_usd_price) : 0;

  const handleTopUp = async () => {
    if (!info) return toast.error("Treasury info not loaded yet");
    const provider = getProvider();
    if (!provider || !address) {
      toast.error("Connect a Solana wallet first");
      await connect("phantom");
      return;
    }

    setIsProcessing(true);
    try {
      // Build SOL transfer transaction
      const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
      const conn = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

      const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);
      const fromPubkey = new PublicKey(address);
      const toPubkey = new PublicKey(info.treasury_address);

      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
      );
      tx.feePayer = fromPubkey;
      const { blockhash } = await conn.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;

      // Sign + send via wallet
      if (!provider.signAndSendTransaction) {
        toast.error("Wallet does not support signing");
        return;
      }
      const { signature } = await provider.signAndSendTransaction(tx);
      toast.info("⏳ Transaction sent — confirming on-chain...", { duration: 8000 });

      // Wait for confirmation
      await conn.confirmTransaction(signature, "confirmed");

      // Verify with backend (give RPC a moment to propagate)
      await new Promise((r) => setTimeout(r, 2000));

      const { data, error } = await supabase.functions.invoke("topup-via-sol", {
        body: { action: "verify", signature, user_id: userId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Verification failed");

      toast.success(`💰 Credited $${data.usd_credited.toFixed(2)} (new balance: $${data.new_balance.toFixed(2)})`);
      qc.invalidateQueries({ queryKey: ["agent-billing", userId] });
    } catch (e: any) {
      console.error("Top-up failed:", e);
      toast.error(e?.message || "Top-up failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="glass-card border-border overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Agent Balance
          </CardTitle>
          {isLowBalance && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">
              <AlertCircle className="w-2.5 h-2.5 mr-1" /> Low balance
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current balance */}
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-display font-bold text-foreground">
              ${balanceUsd.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground font-body mt-0.5">
              Spent so far: ${totalSpent.toFixed(2)}
            </div>
          </div>
          {info && (
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">SOL price</div>
              <div className="text-xs font-mono text-primary">${info.sol_usd_price.toFixed(2)}</div>
            </div>
          )}
        </div>

        {/* Quick top-up amounts */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-body mb-2">
            Top up via Solana
          </div>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((usd) => (
              <button
                key={usd}
                onClick={() => setSelectedUsd(usd)}
                className={`py-2 rounded-lg border text-sm font-display font-bold transition ${
                  selectedUsd === usd
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card hover:border-primary/40 text-foreground"
                }`}
              >
                ${usd}
              </button>
            ))}
          </div>
          {info && (
            <div className="text-[10px] text-muted-foreground font-mono mt-2 text-center">
              ≈ {solAmount.toFixed(5)} SOL
            </div>
          )}
        </div>

        {/* Action button */}
        <Button
          variant="hero"
          size="sm"
          className="w-full gap-1.5"
          onClick={handleTopUp}
          disabled={isProcessing || !info}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
            </>
          ) : !info ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
            </>
          ) : !address ? (
            <>
              <Wallet className="w-3.5 h-3.5" /> Connect wallet to top up
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" /> Pay {solAmount.toFixed(4)} SOL
            </>
          )}
        </Button>

        {/* Why this matters */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <div className="text-[10px] text-muted-foreground font-body leading-relaxed">
            Balance powers your agents' autonomous AI cycles, chats, discoveries, and Spix calls.
            <span className="text-foreground font-semibold"> 20% of every fee is burned</span> from $MEEET supply.
          </div>
        </div>

        {/* Treasury link */}
        {info && (
          <a
            href={`https://solscan.io/account/${info.treasury_address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition"
          >
            View treasury on Solscan <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
