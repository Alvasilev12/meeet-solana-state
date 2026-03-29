import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Store, ArrowUpDown, Swords, Shield, Zap, Star, TrendingUp, CheckCircle2, AlertCircle, Wallet, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { sendMeeetToTreasury } from "@/lib/solana-transfer";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";

interface AgentData {
  id: string;
  name: string;
  class: string;
  level: number;
  xp: number;
  quests_completed: number;
  reputation: number;
  attack: number;
  defense: number;
  hp: number;
  max_hp: number;
  kills: number;
  territories_held: number;
}

interface Listing {
  id: string;
  price_meeet: number;
  price_usdc: number;
  description: string | null;
  created_at: string;
  agents: AgentData | null;
}

const CLASS_COLORS: Record<string, string> = {
  warrior: "bg-red-500/15 text-red-400 border-red-500/30",
  oracle: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  trader: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  diplomat: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  banker: "bg-green-500/15 text-green-400 border-green-500/30",
  miner: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  scout: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

const CLASS_ICONS: Record<string, string> = {
  warrior: "⚔️", oracle: "🔮", trader: "💹", diplomat: "🤝",
  banker: "🏦", miner: "⛏️", scout: "🔭",
};

type SortKey = "price" | "level";
type ClassFilter = "all" | string;
type PayMethod = "internal" | "external";

interface UserAgent {
  id: string;
  name: string;
  balance_meeet: number;
}

const AgentMarketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { address: walletAddress, getProvider, availableWallets, connect: connectWallet, connecting: walletConnecting } = useSolanaWallet();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("price");

  // Purchase dialog
  const [selected, setSelected] = useState<Listing | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("internal");
  const [buying, setBuying] = useState(false);
  const [buyStep, setBuyStep] = useState<string>("");
  const [buySuccess, setBuySuccess] = useState(false);

  // User agents
  const [userAgents, setUserAgents] = useState<UserAgent[]>([]);
  const [selectedBuyerAgent, setSelectedBuyerAgent] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("agent_marketplace_listings")
        .select("id, price_meeet, price_usdc, description, created_at, agents(id, name, class, level, xp, quests_completed, reputation, attack, defense, hp, max_hp, kills, territories_held)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && data) setListings(data as unknown as Listing[]);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selected || !user) return;
    const loadAgents = async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, name, balance_meeet")
        .eq("user_id", user.id);
      if (data) {
        setUserAgents(data);
        if (data.length > 0) setSelectedBuyerAgent(data[0].id);
      }
    };
    loadAgents();
  }, [selected, user]);

  const filtered = classFilter === "all" ? listings : listings.filter((l) => l.agents?.class === classFilter);
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "price") return (a.price_meeet || 0) - (b.price_meeet || 0);
    return (b.agents?.level || 0) - (a.agents?.level || 0);
  });
  const classes = [...new Set(listings.map((l) => l.agents?.class).filter(Boolean))] as string[];

  const selectedAgent = userAgents.find((a) => a.id === selectedBuyerAgent);
  const hasEnough = selectedAgent ? selectedAgent.balance_meeet >= (selected?.price_meeet || 0) : false;

  const handleBuy = async () => {
    if (!user || !selected || !selectedBuyerAgent) return;

    if (payMethod === "internal" && !hasEnough) {
      toast.error("Недостаточно MEEET на балансе агента");
      return;
    }

    if (payMethod === "external" && !walletAddress) {
      toast.error("Подключите кошелёк для оплаты");
      return;
    }

    setBuying(true);
    let txSignature: string | undefined;

    try {
      // Step 1: For external, send tokens via wallet
      if (payMethod === "external") {
        setBuyStep("Подтвердите транзакцию в кошельке...");
        const provider = getProvider();
        if (!provider) {
          toast.error("Кошелёк не подключён");
          setBuying(false);
          return;
        }

        txSignature = await sendMeeetToTreasury(provider, selected.price_meeet);
        setBuyStep("Транзакция подтверждена. Оформляем покупку...");
      } else {
        setBuyStep("Оформляем покупку...");
      }

      // Step 2: Call edge function
      const { data, error } = await supabase.functions.invoke("buy-agent", {
        body: {
          listing_id: selected.id,
          payment_method: payMethod,
          buyer_agent_id: selectedBuyerAgent,
          tx_signature: txSignature,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setBuying(false);
        setBuyStep("");
        return;
      }

      setBuySuccess(true);
      setListings((prev) => prev.filter((l) => l.id !== selected.id));
      toast.success("Агент куплен!");
    } catch (err: any) {
      const msg = err?.message || "Ошибка при покупке";
      // Friendly wallet errors
      if (msg.includes("rejected") || msg.includes("cancelled")) {
        toast.error("Транзакция отклонена");
      } else {
        toast.error(msg);
      }
    } finally {
      setBuying(false);
      setBuyStep("");
    }
  };

  const closeDialog = () => {
    setSelected(null);
    setBuySuccess(false);
    setPayMethod("internal");
    setBuyStep("");
  };

  const a = selected?.agents;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Store className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Agent Marketplace
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">Просматривайте и покупайте обученных AI-агентов</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Button variant={classFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setClassFilter("all")}>Все</Button>
          {classes.map((c) => (
            <Button key={c} variant={classFilter === c ? "default" : "outline"} size="sm" onClick={() => setClassFilter(c)} className="capitalize gap-1">
              <span>{CLASS_ICONS[c] || "🤖"}</span>{c}
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Button variant={sortBy === "price" ? "default" : "outline"} size="sm" onClick={() => setSortBy("price")}>Цена</Button>
            <Button variant={sortBy === "level" ? "default" : "outline"} size="sm" onClick={() => setSortBy("level")}>Уровень</Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">Пока нет предложений</h3>
            <p className="text-muted-foreground mb-4">Агенты появятся здесь, когда пользователи выставят их на продажу.</p>
            <Button variant="outline" onClick={() => navigate("/deploy")}>Развернуть своего агента</Button>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((l) => (
              <Card key={l.id}
                className="bg-card/60 border-border/50 hover:border-emerald-500/40 transition-all cursor-pointer group active:scale-[0.98]"
                onClick={() => { if (!user) { navigate("/auth"); return; } setSelected(l); }}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <img src={getAgentAvatarUrl(l.agents?.id || l.id, 48)} alt={l.agents?.name || "Agent"} className="w-10 h-10 rounded-lg border border-border bg-muted/30" />
                      <div>
                        <h3 className="font-semibold text-foreground leading-tight">{l.agents?.name || "Unknown"}</h3>
                        <span className="text-xs text-muted-foreground capitalize">Lv.{l.agents?.level} {l.agents?.class}</span>
                      </div>
                    </div>
                    <Badge className={`text-xs border capitalize ${CLASS_COLORS[l.agents?.class || ""] || "bg-muted text-muted-foreground"}`}>
                      {l.agents?.class}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted/30 rounded-md py-1.5">
                      <div className="font-bold text-foreground">{l.agents?.quests_completed}</div>
                      <div className="text-muted-foreground">Квесты</div>
                    </div>
                    <div className="bg-muted/30 rounded-md py-1.5">
                      <div className="font-bold text-foreground">{l.agents?.reputation}</div>
                      <div className="text-muted-foreground">Репутация</div>
                    </div>
                    <div className="bg-muted/30 rounded-md py-1.5">
                      <div className="font-bold text-foreground">{l.agents?.kills}</div>
                      <div className="text-muted-foreground">Килы</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="font-bold text-lg text-emerald-400">{l.price_meeet.toLocaleString()}</span>
                      <span className="text-xs text-emerald-400/70 ml-1">MEEET</span>
                      {l.price_usdc > 0 && <span className="text-xs text-muted-foreground ml-2">≈ ${l.price_usdc}</span>}
                    </div>
                    <Button size="sm" variant="default"
                      onClick={(e) => { e.stopPropagation(); if (!user) { navigate("/auth"); return; } setSelected(l); }}>
                      Купить
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ──── Purchase Dialog ──── */}
        <Dialog open={!!selected} onOpenChange={(o) => { if (!o) closeDialog(); }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            {buySuccess ? (
              <div className="text-center py-6 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
                <DialogTitle className="text-2xl">Агент куплен!</DialogTitle>
                <DialogDescription><strong>{a?.name}</strong> теперь ваш.</DialogDescription>
                <div className="flex gap-2 justify-center pt-2">
                  <Button variant="outline" onClick={closeDialog}>Закрыть</Button>
                  <Button onClick={() => { closeDialog(); navigate("/dashboard"); }}>К дашборду</Button>
                </div>
              </div>
            ) : selected && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{CLASS_ICONS[a?.class || ""] || "🤖"}</span>
                    <div>
                      <DialogTitle className="text-xl">{a?.name}</DialogTitle>
                      <DialogDescription className="capitalize">{a?.class} · Уровень {a?.level}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <StatRow icon={<Swords className="w-4 h-4 text-red-400" />} label="Атака" value={a?.attack} />
                  <StatRow icon={<Shield className="w-4 h-4 text-blue-400" />} label="Защита" value={a?.defense} />
                  <StatRow icon={<Zap className="w-4 h-4 text-yellow-400" />} label="Квесты" value={a?.quests_completed} />
                  <StatRow icon={<Star className="w-4 h-4 text-amber-400" />} label="Репутация" value={a?.reputation} />
                  <StatRow icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} label="Килы" value={a?.kills} />
                  <StatRow icon={<Store className="w-4 h-4 text-purple-400" />} label="Территории" value={a?.territories_held} />
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>HP</span><span>{a?.hp}/{a?.max_hp}</span></div>
                    <Progress value={a?.max_hp ? (a.hp / a.max_hp) * 100 : 100} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>XP</span><span>{a?.xp?.toLocaleString()}</span></div>
                    <Progress value={Math.min((a?.xp || 0) / ((a?.level || 1) * 100) * 100, 100)} className="h-2" />
                  </div>
                </div>

                {/* Price */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-0.5">Цена</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {selected.price_meeet.toLocaleString()} <span className="text-base">MEEET</span>
                  </div>
                  {selected.price_usdc > 0 && <div className="text-xs text-muted-foreground">≈ ${selected.price_usdc} USDC</div>}
                </div>

                {/* Payment method */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Метод оплаты</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={`rounded-lg border p-3 text-left transition-all text-sm ${payMethod === "internal" ? "border-emerald-500 bg-emerald-500/10" : "border-border hover:border-muted-foreground/40"}`}
                      onClick={() => setPayMethod("internal")}
                    >
                      <Wallet className="w-4 h-4 mb-1 text-emerald-400" />
                      <div className="font-medium text-foreground">Баланс агента</div>
                      <div className="text-xs text-muted-foreground">Мгновенно</div>
                    </button>
                    <button
                      className={`rounded-lg border p-3 text-left transition-all text-sm ${payMethod === "external" ? "border-emerald-500 bg-emerald-500/10" : "border-border hover:border-muted-foreground/40"}`}
                      onClick={() => setPayMethod("external")}
                    >
                      <ExternalLink className="w-4 h-4 mb-1 text-emerald-400" />
                      <div className="font-medium text-foreground">Кошелёк</div>
                      <div className="text-xs text-muted-foreground">Phantom, Solflare...</div>
                    </button>
                  </div>

                  {/* Internal: select agent */}
                  {payMethod === "internal" && (
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Списать с агента:</label>
                      {userAgents.length === 0 ? (
                        <p className="text-sm text-destructive">У вас нет агентов. <button className="underline" onClick={() => navigate("/deploy")}>Развернуть</button></p>
                      ) : (
                        <Select value={selectedBuyerAgent} onValueChange={setSelectedBuyerAgent}>
                          <SelectTrigger><SelectValue placeholder="Выберите агента" /></SelectTrigger>
                          <SelectContent>
                            {userAgents.map((ua) => (
                              <SelectItem key={ua.id} value={ua.id}>
                                {ua.name} — {ua.balance_meeet.toLocaleString()} MEEET
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {selectedAgent && !hasEnough && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Недостаточно (нужно {selected.price_meeet.toLocaleString()}, есть {selectedAgent.balance_meeet.toLocaleString()})
                        </p>
                      )}
                    </div>
                  )}

                  {/* External: connect wallet */}
                  {payMethod === "external" && (
                    <div className="space-y-2">
                      {!walletAddress ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Подключите кошелёк для автоматической оплаты:</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {availableWallets
                              .filter((w) => w.installed)
                              .slice(0, 4)
                              .map((w) => (
                                <Button key={w.id} variant="outline" size="sm" className="gap-2 justify-start"
                                  disabled={walletConnecting}
                                  onClick={() => connectWallet(w.id)}>
                                  <span>{w.icon}</span>{w.label}
                                </Button>
                              ))}
                          </div>
                          {availableWallets.filter((w) => w.installed).length === 0 && (
                            <p className="text-xs text-muted-foreground">Нет установленных кошельков. <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="underline">Установить Phantom</a></p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                          <Wallet className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-foreground font-mono">
                            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                          </span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />
                        </div>
                      )}

                      {/* Still select buyer agent for ownership binding */}
                      {userAgents.length > 0 && (
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Привязать к аккаунту:</label>
                          <Select value={selectedBuyerAgent} onValueChange={setSelectedBuyerAgent}>
                            <SelectTrigger><SelectValue placeholder="Выберите агента" /></SelectTrigger>
                            <SelectContent>
                              {userAgents.map((ua) => (
                                <SelectItem key={ua.id} value={ua.id}>{ua.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress indicator during purchase */}
                {buying && buyStep && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                    {buyStep}
                  </div>
                )}

                {/* Buy button */}
                <Button
                  className="w-full text-base py-5"
                  disabled={
                    buying ||
                    !selectedBuyerAgent ||
                    (payMethod === "internal" && !hasEnough) ||
                    (payMethod === "external" && !walletAddress)
                  }
                  onClick={handleBuy}
                >
                  {buying ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {buyStep || "Обработка..."}</>
                  ) : payMethod === "internal" ? (
                    `Купить за ${selected.price_meeet.toLocaleString()} MEEET`
                  ) : (
                    `Оплатить ${selected.price_meeet.toLocaleString()} MEEET`
                  )}
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

const StatRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) => (
  <div className="flex items-center gap-2 bg-muted/20 rounded-md px-3 py-2">
    {icon}
    <span className="text-muted-foreground">{label}</span>
    <span className="ml-auto font-semibold text-foreground">{value ?? 0}</span>
  </div>
);

export default AgentMarketplace;
