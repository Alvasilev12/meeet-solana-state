import { useState } from "react";
import { useSolanaWallet, WalletId } from "@/hooks/useSolanaWallet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [pickerOpen, setPickerOpen] = useState(false);

  const displayAddress = address || savedAddress;
  const isConnected = !!address;
  const needsSave = isConnected && address !== savedAddress;

  const handleConnect = async (id: WalletId) => {
    const addr = await connect(id);
    if (addr) setPickerOpen(false);
  };

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

  // Wallet picker grid used in both compact and full modes
  const WalletGrid = ({ columns = 2 }: { columns?: number }) => (
    <div className={`grid gap-1.5 ${columns === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {availableWallets
        .sort((a, b) => (b.installed ? 1 : 0) - (a.installed ? 1 : 0))
        .map((w) => (
          <Button
            key={w.id}
            variant="outline"
            className="justify-start gap-2 h-10 hover:border-primary/30 hover:bg-primary/5 text-xs"
            disabled={connecting}
            onClick={() => handleConnect(w.id)}
          >
            <span className="text-base">{w.icon}</span>
            <span className="font-semibold truncate">{w.label}</span>
            {w.installed && (
              <Badge variant="outline" className="ml-auto bg-secondary/10 text-secondary border-secondary/20 text-[9px] px-1">
                ✓
              </Badge>
            )}
          </Button>
        ))}
    </div>
  );

  // Compact mode for dashboard header
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
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
            disabled={connecting}
          >
            {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
            Connect Wallet
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="end">
          <p className="text-xs font-display font-bold mb-2 text-foreground">Select Wallet</p>
          <WalletGrid columns={2} />
          {connecting && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center py-2 mt-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for approval…
            </div>
          )}
          {error && <p className="text-xs text-red-400 text-center mt-2">{error}</p>}
        </PopoverContent>
      </Popover>
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
          <WalletGrid columns={2} />
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
