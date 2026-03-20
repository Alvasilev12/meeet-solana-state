import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Store, ArrowUpDown, Swords, Shield, Zap, Star, TrendingUp, CheckCircle2, AlertCircle, Wallet, ExternalLink, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

const TREASURY_WALLET = "4zkqErmzJhFQ7ahgTKfqTHutPk5GczMMXyAaEgbEpN1e";

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
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("price");

  // Purchase dialog state
  const [selected, setSelected] = useState<Listing | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("internal");
  const [txSignature, setTxSignature] = useState("");
  const [buying, setBuying] = useState(false);
  const [buySuccess, setBuySuccess] = useState(false);

  // User's agents for internal payment
  const [userAgents, setUserAgents] = useState<UserAgent[]>([]);
  const [selectedBuyerAgent, setSelectedBuyerAgent] = useState<string>("");

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

  // Load user agents when dialog opens
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

  const filtered = classFilter === "all"
    ? listings
    : listings.filter((l) => l.agents?.class === classFilter);

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
    if (payMethod === "external" && !txSignature.trim()) {
      toast.error("Введите хеш транзакции");
      return;
    }

    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke("buy-agent", {
        body: {
          listing_id: selected.id,
          payment_method: payMethod,
          buyer_agent_id: selectedBuyerAgent,
          tx_signature: payMethod === "external" ? txSignature.trim() : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setBuying(false);
        return;
      }

      setBuySuccess(true);
      // Remove from local list
      setListings((prev) => prev.filter((l) => l.id !== selected.id));
      toast.success("Агент куплен!");
    } catch (err: any) {
      toast.error(err?.message || "Ошибка при покупке");
    } finally {
      setBuying(false);
    }
  };

  const closeDialog = () => {
    setSelected(null);
    setBuySuccess(false);
    setTxSignature("");
    setPayMethod("internal");
  };

  const copyTreasury = () => {
    navigator.clipboard.writeText(TREASURY_WALLET);
    toast.success("Адрес казначейства скопирован");
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
          <p className="text-muted-foreground text-lg">
            Просматривайте и покупайте обученных AI-агентов в один клик
          </p>
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
              <Card
                key={l.id}
                className="bg-card/60 border-border/50 hover:border-emerald-500/40 transition-all cursor-pointer group active:scale-[0.98]"
                onClick={() => { if (!user) { navigate("/auth"); return; } setSelected(l); }}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{CLASS_ICONS[l.agents?.class || ""] || "🤖"}</span>
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
                    <Button size="sm" variant="default" className="group-hover:shadow-lg transition-shadow"
                      onClick={(e) => { e.stopPropagation(); if (!user) { navigate("/auth"); return; } setSelected(l); }}>
                      Купить
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ──────── Purchase Dialog ──────── */}
        <Dialog open={!!selected} onOpenChange={(open) => { if (!open) closeDialog(); }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            {buySuccess ? (
              <div className="text-center py-6 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
                <DialogTitle className="text-2xl">Агент куплен!</DialogTitle>
                <DialogDescription>
                  <strong>{a?.name}</strong> теперь ваш. Вы найдёте его в дашборде.
                </DialogDescription>
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

                {selected.description && (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <StatRow icon={<Swords className="w-4 h-4 text-red-400" />} label="Атака" value={a?.attack} />
                  <StatRow icon={<Shield className="w-4 h-4 text-blue-400" />} label="Защита" value={a?.defense} />
                  <StatRow icon={<Zap className="w-4 h-4 text-yellow-400" />} label="Квесты" value={a?.quests_completed} />
                  <StatRow icon={<Star className="w-4 h-4 text-amber-400" />} label="Репутация" value={a?.reputation} />
                  <StatRow icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} label="Килы" value={a?.kills} />
                  <StatRow icon={<Store className="w-4 h-4 text-purple-400" />} label="Территории" value={a?.territories_held} />
                </div>

                {/* HP + XP bars */}
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
                  {selected.price_usdc > 0 && (
                    <div className="text-xs text-muted-foreground">≈ ${selected.price_usdc} USDC</div>
                  )}
                </div>

                {/* ── Payment Method ── */}
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
                      <div className="font-medium text-foreground">Внешний перевод</div>
                      <div className="text-xs text-muted-foreground">$MEEET on-chain</div>
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
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите агента" />
                          </SelectTrigger>
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
                          Недостаточно MEEET (нужно {selected.price_meeet.toLocaleString()}, есть {selectedAgent.balance_meeet.toLocaleString()})
                        </p>
                      )}
                    </div>
                  )}

                  {/* External: treasury + QR + tx input */}
                  {payMethod === "external" && (
                    <div className="space-y-3">
                      <div className="bg-muted/20 rounded-lg p-3 space-y-2">
                        <div className="text-xs text-muted-foreground">Отправьте {selected.price_meeet.toLocaleString()} $MEEET на казначейство:</div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-foreground bg-muted/40 px-2 py-1 rounded flex-1 truncate">{TREASURY_WALLET}</code>
                          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={copyTreasury}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="flex justify-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${TREASURY_WALLET}`}
                            alt="Treasury QR"
                            className="w-28 h-28 rounded-md"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Хеш транзакции (tx_signature):</label>
                        <Input
                          placeholder="Вставьте хеш Solana-транзакции..."
                          value={txSignature}
                          onChange={(e) => setTxSignature(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>

                      {/* Still need to select buyer agent for ownership */}
                      {userAgents.length > 0 && (
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Привязать купленного агента к:</label>
                          <Select value={selectedBuyerAgent} onValueChange={setSelectedBuyerAgent}>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите вашего агента" />
                            </SelectTrigger>
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

                {/* Buy button */}
                <Button
                  className="w-full text-base py-5"
                  disabled={
                    buying ||
                    !selectedBuyerAgent ||
                    (payMethod === "internal" && !hasEnough) ||
                    (payMethod === "external" && !txSignature.trim())
                  }
                  onClick={handleBuy}
                >
                  {buying ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Обработка...</>
                  ) : payMethod === "internal" ? (
                    `Купить за ${selected.price_meeet.toLocaleString()} MEEET`
                  ) : (
                    "Подтвердить покупку"
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
