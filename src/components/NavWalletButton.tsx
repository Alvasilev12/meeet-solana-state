import { useState, useEffect, useCallback } from "react";
import { useSolanaWallet, WalletId } from "@/hooks/useSolanaWallet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Wallet, Copy, Check, Unplug, Loader2, ChevronDown } from "lucide-react";

export default function NavWalletButton() {
  const { address, walletName, connecting, error, availableWallets, connect, disconnect } = useSolanaWallet();
  const [copied, setCopied] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const shortAddr = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : null;

  const fetchBalance = useCallback(async (addr: string) => {
    try {
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const conn = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      const lamports = await conn.getBalance(new PublicKey(addr));
      setSolBalance(lamports / 1e9);
    } catch { setSolBalance(null); }
  }, []);

  useEffect(() => { if (address) fetchBalance(address); }, [address, fetchBalance]);

  const copyAddr = () => {
    if (address) { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleConnect = async (id: WalletId) => {
    const addr = await connect(id);
    if (addr) setOpen(false);
  };

  const walletIcon = walletName === "phantom" ? "👻" : walletName === "solflare" ? "🔥" : walletName === "backpack" ? "🎒" : "💳";

  if (address) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-display font-semibold rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <span>{walletIcon}</span>
            <span className="font-mono">{shortAddr}</span>
            {solBalance !== null && <span className="text-muted-foreground">({solBalance.toFixed(2)} SOL)</span>}
            <ChevronDown className="w-3 h-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="end">
          <div className="px-2 py-1.5 border-b border-border mb-1">
            <p className="text-[10px] text-muted-foreground">Connected via {walletName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="font-mono text-xs text-foreground">{shortAddr}</p>
              <button onClick={copyAddr} className="text-muted-foreground hover:text-foreground">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          {solBalance !== null && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">{solBalance.toFixed(4)} SOL</div>
          )}
          <button
            onClick={() => { disconnect(); setOpen(false); setSolBalance(null); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
          >
            <Unplug className="w-3.5 h-3.5" /> Disconnect
          </button>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
          Connect Wallet
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-xs font-display font-bold px-2 py-1 text-foreground">Select Wallet</p>
        <div className="space-y-0.5 mt-1">
          {availableWallets
            .filter(w => ["phantom", "solflare", "backpack"].includes(w.id) || w.installed)
            .sort((a, b) => (b.installed ? 1 : 0) - (a.installed ? 1 : 0))
            .slice(0, 6)
            .map(w => (
              <button
                key={w.id}
                onClick={() => handleConnect(w.id)}
                disabled={connecting}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted/50 transition-colors text-foreground"
              >
                <span>{w.icon}</span>
                <span className="font-semibold">{w.label}</span>
                {w.installed && <span className="ml-auto text-[9px] text-emerald-400">✓</span>}
              </button>
            ))}
        </div>
        {connecting && <p className="text-[10px] text-muted-foreground text-center py-1">Waiting for approval…</p>}
        {error && <p className="text-[10px] text-red-400 text-center py-1">{error}</p>}
      </PopoverContent>
    </Popover>
  );
}
