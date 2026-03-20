import { useState, useCallback, useEffect } from "react";

interface SolanaProvider {
  publicKey: { toString(): string; toBytes(): Uint8Array } | null;
  connect(): Promise<{ publicKey: { toString(): string; toBytes(): Uint8Array } }>;
  disconnect(): Promise<void>;
  signAndSendTransaction?(transaction: any, options?: any): Promise<{ signature: string }>;
  signTransaction?(transaction: any): Promise<any>;
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  isCoin98?: boolean;
  isTrust?: boolean;
}

export type WalletId =
  | "phantom"
  | "solflare"
  | "backpack"
  | "coin98"
  | "trust"
  | "exodus"
  | "brave"
  | "slope"
  | "mathwallet"
  | "tokenpocket"
  | "bitget"
  | "okx";

interface WalletMeta {
  id: WalletId;
  label: string;
  icon: string;
  getProvider: () => SolanaProvider | null;
  downloadUrl: string;
}

function w(): any {
  return typeof window !== "undefined" ? window : {};
}

const WALLETS: WalletMeta[] = [
  {
    id: "phantom",
    label: "Phantom",
    icon: "👻",
    getProvider: () => w().phantom?.solana?.isPhantom ? w().phantom.solana : w().solana?.isPhantom ? w().solana : null,
    downloadUrl: "https://phantom.app/",
  },
  {
    id: "solflare",
    label: "Solflare",
    icon: "🔥",
    getProvider: () => w().solflare?.isSolflare ? w().solflare : null,
    downloadUrl: "https://solflare.com/",
  },
  {
    id: "backpack",
    label: "Backpack",
    icon: "🎒",
    getProvider: () => w().backpack?.isBackpack ? w().backpack : null,
    downloadUrl: "https://backpack.app/",
  },
  {
    id: "okx",
    label: "OKX Wallet",
    icon: "⭕",
    getProvider: () => w().okxwallet?.solana ?? null,
    downloadUrl: "https://www.okx.com/web3",
  },
  {
    id: "bitget",
    label: "Bitget Wallet",
    icon: "💎",
    getProvider: () => w().bitkeep?.solana ?? null,
    downloadUrl: "https://web3.bitget.com/",
  },
  {
    id: "coin98",
    label: "Coin98",
    icon: "🪙",
    getProvider: () => w().coin98?.sol ?? null,
    downloadUrl: "https://coin98.com/",
  },
  {
    id: "trust",
    label: "Trust Wallet",
    icon: "🛡️",
    getProvider: () => w().trustwallet?.solana ?? null,
    downloadUrl: "https://trustwallet.com/",
  },
  {
    id: "exodus",
    label: "Exodus",
    icon: "🚀",
    getProvider: () => w().exodus?.solana ?? null,
    downloadUrl: "https://www.exodus.com/",
  },
  {
    id: "brave",
    label: "Brave Wallet",
    icon: "🦁",
    getProvider: () => w().braveSolana ?? null,
    downloadUrl: "https://brave.com/wallet/",
  },
  {
    id: "mathwallet",
    label: "MathWallet",
    icon: "🔢",
    getProvider: () => w().solana?.isMathWallet ? w().solana : null,
    downloadUrl: "https://mathwallet.org/",
  },
  {
    id: "tokenpocket",
    label: "TokenPocket",
    icon: "👝",
    getProvider: () => w().tokenpocket?.solana ?? null,
    downloadUrl: "https://tokenpocket.pro/",
  },
  {
    id: "slope",
    label: "Slope",
    icon: "📐",
    getProvider: () => w().Slope ? new (w().Slope)() : null,
    downloadUrl: "https://slope.finance/",
  },
];

export function useSolanaWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<WalletId | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect which wallets are installed
  const availableWallets = WALLETS.map((wm) => ({
    ...wm,
    installed: !!wm.getProvider(),
  }));

  const connect = useCallback(async (id: WalletId) => {
    setError(null);
    const meta = WALLETS.find((wm) => wm.id === id);
    if (!meta) return null;

    const provider = meta.getProvider();
    if (!provider) {
      window.open(meta.downloadUrl, "_blank");
      setError(`${meta.label} not installed. Opening download page...`);
      return null;
    }

    try {
      setConnecting(true);
      const resp = await provider.connect();
      const addr = resp.publicKey.toString();
      setAddress(addr);
      setWalletId(id);
      return addr;
    } catch (err: any) {
      setError(err?.message || "Connection rejected");
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (walletId) {
      const meta = WALLETS.find((wm) => wm.id === walletId);
      const provider = meta?.getProvider();
      if (provider) {
        try { await provider.disconnect(); } catch {}
      }
    }
    setAddress(null);
    setWalletId(null);
  }, [walletId]);

  // Listen for account changes
  useEffect(() => {
    if (!walletId) return;
    const meta = WALLETS.find((wm) => wm.id === walletId);
    const provider = meta?.getProvider();
    if (!provider) return;

    const handleChange = () => {
      if (provider.publicKey) {
        setAddress(provider.publicKey.toString());
      } else {
        setAddress(null);
        setWalletId(null);
      }
    };
    const handleDisconnect = () => {
      setAddress(null);
      setWalletId(null);
    };

    provider.on("accountChanged", handleChange);
    provider.on("disconnect", handleDisconnect);
    return () => {
      provider.off("accountChanged", handleChange);
      provider.off("disconnect", handleDisconnect);
    };
  }, [walletId]);

  /** Get the raw provider for transaction signing */
  const getProvider = useCallback((): SolanaProvider | null => {
    if (!walletId) return null;
    const meta = WALLETS.find((wm) => wm.id === walletId);
    return meta?.getProvider() ?? null;
  }, [walletId]);

  return { address, walletName: walletId, connecting, error, availableWallets, connect, disconnect, getProvider };
}
