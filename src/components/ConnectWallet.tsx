import { useState } from "react";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, Unplug, Copy, Check, ExternalLink } from "lucide-react";

interface ConnectWalletProps {
  savedAddress?: string | null;
  compact?: boolean;
}

export default function ConnectWallet({ savedAddress, compact = false }: ConnectWalletProps) {
  const { address, walletName, connecting, error, availableWallets, connect, disconnect } = useSolanaWallet();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayAddress = address || savedAddress;
  const isConnected = !!address;
  const needsSave = isConnected && address !== savedAddress;

  const handleSave = async () => {
    if (!user || !address) return;
    setSaving(true);
    const { error: err } = await supabase
      .from("profiles")
      .update({ wallet_address: address })
      .eq("user_id", user.id);
    setSaving(false);
    if (err) {
      toast({ title: "Error saving wallet", description: err.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Wallet saved!", description: `${address.slice(0, 4)}...${address.slice(-4)} linked to your profile.` });
    }
  };

  const copyAddr = () => {
    if (displayAddress) {
      navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortAddr = displayAddress
    ? `${displayAddress.slice(0, 4)}...${displayAddress.slice(-4)}`
    : null;

  // Compact mode for dashboard
  if (compact) {
    if (displayAddress) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-xs gap-1.5 py-1 px-2">
            <Wallet className="w-3 h-3" />
            {shortAddr}
          </Badge>
          <button onClick={copyAddr} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      );
    }
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
        disabled={connecting}
        onClick={() => {
          const installed = availableWallets.find(w => w.installed);
          if (installed) connect(installed.name);
          else connect("phantom");
        }}
      >
        {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
        Connect Wallet
      </Button>
    );
  }

  // Full mode for profile page
  return (
    <div className="space-y-4">
      {displayAddress ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-body">
                {isConnected ? `Connected via ${walletName}` : "Saved wallet"}
              </p>
              <p className="font-mono text-sm text-foreground truncate">{displayAddress}</p>
            </div>
            <button onClick={copyAddr} className="text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {needsSave && (
            <Button variant="hero" className="w-full gap-2" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              Save Wallet to Profile
            </Button>
          )}

          {isConnected && (
            <Button variant="outline" size="sm" className="w-full gap-2 border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={disconnect}>
              <Unplug className="w-3.5 h-3.5" /> Disconnect
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {availableWallets.map((w) => (
            <Button
              key={w.name}
              variant="outline"
              className="w-full justify-between gap-2 h-12 hover:border-primary/30 hover:bg-primary/5"
              disabled={connecting}
              onClick={() => connect(w.name)}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{w.icon}</span>
                <span className="font-display font-semibold">{w.label}</span>
              </span>
              {w.installed ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                  Detected
                </Badge>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  Install <ExternalLink className="w-3 h-3" />
                </span>
              )}
            </Button>
          ))}
          {connecting && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for wallet approval…
            </div>
          )}
          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}
          <p className="text-[10px] text-muted-foreground text-center font-body">
            Withdrawal available after token listing 🚀
          </p>
        </div>
      )}
    </div>
  );
}
