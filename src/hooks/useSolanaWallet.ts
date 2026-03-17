import { useState, useCallback, useEffect } from "react";

interface SolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey: { toString(): string } | null;
  connect(): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
}

type WalletName = "phantom" | "solflare";

function getProvider(name: WalletName): SolanaProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  if (name === "phantom") return w.solana?.isPhantom ? w.solana : null;
  if (name === "solflare") return w.solflare?.isSolflare ? w.solflare : null;
  return null;
}

export function useSolanaWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<WalletName | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableWallets: { name: WalletName; label: string; icon: string; installed: boolean }[] = [
    {
      name: "phantom",
      label: "Phantom",
      icon: "👻",
      installed: !!getProvider("phantom"),
    },
    {
      name: "solflare",
      label: "Solflare",
      icon: "🔥",
      installed: !!getProvider("solflare"),
    },
  ];

  const connect = useCallback(async (name: WalletName) => {
    setError(null);
    const provider = getProvider(name);
    if (!provider) {
      const urls: Record<WalletName, string> = {
        phantom: "https://phantom.app/",
        solflare: "https://solflare.com/",
      };
      window.open(urls[name], "_blank");
      setError(`${name} not installed. Opening download page...`);
      return null;
    }

    try {
      setConnecting(true);
      const resp = await provider.connect();
      const addr = resp.publicKey.toString();
      setAddress(addr);
      setWalletName(name);
      return addr;
    } catch (err: any) {
      setError(err?.message || "Connection rejected");
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (walletName) {
      const provider = getProvider(walletName);
      if (provider) {
        try { await provider.disconnect(); } catch {}
      }
    }
    setAddress(null);
    setWalletName(null);
  }, [walletName]);

  // Listen for account changes
  useEffect(() => {
    if (!walletName) return;
    const provider = getProvider(walletName);
    if (!provider) return;

    const handleChange = () => {
      if (provider.publicKey) {
        setAddress(provider.publicKey.toString());
      } else {
        setAddress(null);
        setWalletName(null);
      }
    };

    const handleDisconnect = () => {
      setAddress(null);
      setWalletName(null);
    };

    provider.on("accountChanged", handleChange);
    provider.on("disconnect", handleDisconnect);
    return () => {
      provider.off("accountChanged", handleChange);
      provider.off("disconnect", handleDisconnect);
    };
  }, [walletName]);

  return { address, walletName, connecting, error, availableWallets, connect, disconnect };
}
