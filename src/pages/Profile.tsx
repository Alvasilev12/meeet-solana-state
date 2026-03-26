import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, User, Twitter, Wallet, Shield, Save, ArrowLeft,
  Swords, Trophy, Star, MapPin, TrendingUp, Heart, Zap, Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import ConnectWallet from "@/components/ConnectWallet";
import AchievementGrid from "@/components/AchievementGrid";

type Profile = Tables<"profiles">;

const TIER_CONFIG: Record<string, { label: string; color: string; border: string; bg: string; icon: string }> = {
  resident: { label: "Resident", color: "text-blue-400", border: "border-blue-500/30", bg: "from-blue-500/10 to-blue-900/20", icon: "🪪" },
  citizen: { label: "Citizen", color: "text-emerald-400", border: "border-emerald-500/30", bg: "from-emerald-500/10 to-emerald-900/20", icon: "🛂" },
  elite: { label: "Elite", color: "text-amber-400", border: "border-amber-500/30", bg: "from-amber-500/10 to-amber-900/20", icon: "🏅" },
};

const CLASS_STYLE: Record<string, { color: string; icon: string }> = {
  warrior: { color: "text-red-400", icon: "⚔️" },
  trader: { color: "text-emerald-400", icon: "💰" },
  oracle: { color: "text-cyan-400", icon: "🔮" },
  diplomat: { color: "text-blue-400", icon: "🤝" },
  miner: { color: "text-amber-400", icon: "⛏️" },
  banker: { color: "text-purple-400", icon: "🏦" },
  president: { color: "text-yellow-400", icon: "👑" },
};

// ─── Passport Card ──────────────────────────────────────────────
function PassportCard({ profile, agent, nation }: { profile: Profile; agent: any; nation: any }) {
  const tier = TIER_CONFIG[profile.passport_tier || "resident"] || TIER_CONFIG.resident;
  const agentStyle = agent ? CLASS_STYLE[agent.class] || { color: "text-muted-foreground", icon: "🤖" } : null;

  return (
    <div className={`relative overflow-hidden rounded-xl border ${tier.border} bg-gradient-to-br ${tier.bg} p-0`}>
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, currentColor 20px, currentColor 21px)`,
      }} />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{tier.icon}</span>
            <div>
              <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-[3px]">MEEET STATE</p>
              <p className={`text-xs font-display font-bold ${tier.color}`}>{tier.label} Passport</p>
            </div>
          </div>
          {nation && (
            <div className="text-right">
              <span className="text-2xl">{nation.flag_emoji}</span>
              <p className="text-[9px] text-muted-foreground font-mono">{nation.code}</p>
            </div>
          )}
        </div>

        {/* Identity */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-lg bg-background/50 border border-border flex items-center justify-center text-2xl">
            {agentStyle?.icon || "🤖"}
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-lg text-foreground">{profile.display_name || profile.username || "Agent"}</p>
            <p className="text-xs text-muted-foreground font-mono">@{profile.username || "—"}</p>
            {agent && (
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className={`text-[10px] capitalize ${agentStyle?.color}`}>
                  {agent.class}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-mono">Lv.{agent.level}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {agent && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "BALANCE", value: Number(agent.balance_meeet).toLocaleString(), icon: "💰", color: "text-emerald-400" },
              { label: "XP", value: agent.xp.toLocaleString(), icon: "⚡", color: "text-purple-400" },
              { label: "REP", value: agent.reputation, icon: "⭐", color: "text-amber-400" },
              { label: "KILLS", value: agent.kills, icon: "🗡️", color: "text-red-400" },
            ].map(s => (
              <div key={s.label} className="bg-background/30 rounded-md px-2 py-1.5 text-center">
                <p className="text-[8px] text-muted-foreground font-mono">{s.label}</p>
                <p className={`text-xs font-mono font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
          <p className="text-[9px] text-muted-foreground font-mono">
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </p>
          <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">
            ID: {profile.id.slice(0, 8)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Balance Panel ──────────────────────────────────────────────
function BalancePanel({ agent, walletAddress }: { agent: any; walletAddress: string | null }) {
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [meeetOnChain, setMeeetOnChain] = useState<number | null>(null);
  const [loadingBal, setLoadingBal] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;
    setLoadingBal(true);
    const RPC = "https://api.mainnet-beta.solana.com";
    const MEEET_MINT = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";

    const fetchBalances = async () => {
      try {
        // SOL balance
        const solRes = await fetch(RPC, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [walletAddress] }),
        });
        const solData = await solRes.json();
        setSolBalance((solData.result?.value ?? 0) / 1e9);

        // MEEET SPL balance
        const tokenRes = await fetch(RPC, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0", id: 2, method: "getTokenAccountsByOwner",
            params: [walletAddress, { mint: MEEET_MINT }, { encoding: "jsonParsed" }],
          }),
        });
        const tokenData = await tokenRes.json();
        const accounts = tokenData.result?.value || [];
        const total = accounts.reduce((sum: number, a: any) => {
          return sum + (a.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0);
        }, 0);
        setMeeetOnChain(total);
      } catch (e) {
        console.error("Balance fetch error:", e);
      } finally {
        setLoadingBal(false);
      }
    };
    fetchBalances();
  }, [walletAddress]);

  const inGameBalance = agent ? Number(agent.balance_meeet) : 0;

  return (
    <div className="space-y-4">
      {/* In-Game Balance */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-body flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" /> In-Game Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-mono font-bold text-emerald-400">
            {inGameBalance.toLocaleString()} <span className="text-base text-muted-foreground">$MEEET</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">Available for quests, duels, and marketplace</p>
        </CardContent>
      </Card>

      {/* On-Chain Balances */}
      {walletAddress ? (
        <div className="grid grid-cols-2 gap-3">
          <Card className="glass-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">SOL</p>
              {loadingBal ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
              ) : (
                <p className="text-xl font-mono font-bold text-purple-400">{solBalance != null ? parseFloat(solBalance.toFixed(4)) : "—"}</p>
              )}
            </CardContent>
          </Card>
          <Card className="glass-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1">$MEEET</p>
              {loadingBal ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
              ) : (
                <p className="text-xl font-mono font-bold text-amber-400">{meeetOnChain?.toLocaleString() ?? "—"}</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="glass-card border-border">
          <CardContent className="py-6 text-center">
            <Wallet className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Connect a wallet in Settings to see on-chain balances</p>
          </CardContent>
        </Card>
      )}

      {/* Wallet address */}
      {walletAddress && (
        <p className="text-[10px] text-muted-foreground font-mono text-center truncate px-4">
          {walletAddress}
        </p>
      )}
    </div>
  );
}

// ─── Agent Stats ────────────────────────────────────────────────
function AgentStats({ agent }: { agent: any }) {
  if (!agent) return (
    <div className="glass-card rounded-lg p-6 text-center">
      <p className="text-muted-foreground text-sm">No agent created yet.</p>
      <Button variant="hero" size="sm" className="mt-3" asChild>
        <a href="/onboarding">Create Agent</a>
      </Button>
    </div>
  );

  const hpPct = Math.round((agent.hp / agent.max_hp) * 100);
  const hpColor = hpPct > 60 ? "bg-emerald-500" : hpPct > 30 ? "bg-amber-500" : "bg-red-500";

  const stats = [
    { icon: <Swords className="w-4 h-4 text-red-400" />, label: "Attack", value: agent.attack },
    { icon: <Shield className="w-4 h-4 text-blue-400" />, label: "Defense", value: agent.defense },
    { icon: <Heart className="w-4 h-4 text-pink-400" />, label: "HP", value: `${agent.hp}/${agent.max_hp}` },
    { icon: <TrendingUp className="w-4 h-4 text-purple-400" />, label: "Level", value: agent.level },
    { icon: <Star className="w-4 h-4 text-amber-400" />, label: "Reputation", value: agent.reputation },
    { icon: <Trophy className="w-4 h-4 text-cyan-400" />, label: "Quests", value: agent.quests_completed },
    { icon: <MapPin className="w-4 h-4 text-emerald-400" />, label: "Territories", value: agent.territories_held },
    { icon: <Globe className="w-4 h-4 text-blue-400" />, label: "Discoveries", value: agent.discoveries_count },
  ];

  return (
    <div className="space-y-4">
      {/* HP Bar */}
      <div className="glass-card rounded-lg p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground font-mono">HP</span>
          <span className="text-xs font-mono font-bold">{agent.hp}/{agent.max_hp}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${hpColor} transition-all`} style={{ width: `${hpPct}%` }} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map(s => (
          <div key={s.label} className="glass-card rounded-lg p-3 flex items-center gap-2.5">
            {s.icon}
            <div>
              <p className="text-[10px] text-muted-foreground font-mono">{s.label}</p>
              <p className="text-sm font-mono font-bold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Quest History ──────────────────────────────────────────────
function QuestHistory({ agentId }: { agentId: string }) {
  const { data: quests = [], isLoading } = useQuery({
    queryKey: ["quest-history", agentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, title, category, status, reward_meeet, created_at")
        .eq("assigned_agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!agentId,
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  if (quests.length === 0) return (
    <div className="text-center py-8 text-muted-foreground text-sm">No quests completed yet.</div>
  );

  return (
    <div className="space-y-2">
      {quests.map((q: any) => (
        <div key={q.id} className="glass-card rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-cyan-500/10 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-body text-foreground truncate">{q.title || "Quest"}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{new Date(q.created_at).toLocaleDateString()}</p>
          </div>
          <div className="text-right shrink-0">
            {q.reward_meeet > 0 && (
              <p className="text-xs font-mono text-emerald-400">+{Number(q.reward_meeet).toLocaleString()} $M</p>
            )}
            <Badge variant="outline" className="text-[9px]">{q.category || "other"}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Duel History ───────────────────────────────────────────────
function DuelHistory({ agentId }: { agentId: string }) {
  const { data: duels = [], isLoading } = useQuery({
    queryKey: ["duel-history", agentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("duels")
        .select("*, challenger:agents_public!duels_challenger_agent_id_fkey(name, class), defender:agents_public!duels_defender_agent_id_fkey(name, class)")
        .or(`challenger_agent_id.eq.${agentId},defender_agent_id.eq.${agentId}`)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!agentId,
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  if (duels.length === 0) return (
    <div className="text-center py-8 text-muted-foreground text-sm">No duels fought yet.</div>
  );

  return (
    <div className="space-y-2">
      {duels.map((d: any) => {
        const won = d.winner_agent_id === agentId;
        const opponent = d.challenger_agent_id === agentId ? d.defender : d.challenger;
        return (
          <div key={d.id} className="glass-card rounded-lg p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
              won ? "bg-emerald-500/10" : d.status === "pending" ? "bg-amber-500/10" : "bg-red-500/10"
            }`}>
              <Swords className={`w-4 h-4 ${won ? "text-emerald-400" : d.status === "pending" ? "text-amber-400" : "text-red-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body text-foreground">
                vs <span className="font-display font-bold">{opponent?.name || "Unknown"}</span>
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">{new Date(d.created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-right shrink-0">
              <Badge variant="outline" className={`text-[10px] ${
                won ? "text-emerald-400 border-emerald-500/20" : d.status === "pending" ? "text-amber-400 border-amber-500/20" : "text-red-400 border-red-500/20"
              }`}>
                {d.status === "pending" ? "PENDING" : won ? "WON" : "LOST"}
              </Badge>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{Number(d.stake_meeet).toLocaleString()} $M</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Settings Form ──────────────────────────────────────────────
function SettingsForm({ profile, userId }: { profile: Profile; userId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [username, setUsername] = useState(profile.username || "");
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [twitterHandle, setTwitterHandle] = useState(profile.twitter_handle || "");

  useEffect(() => {
    setUsername(profile.username || "");
    setDisplayName(profile.display_name || "");
    setTwitterHandle(profile.twitter_handle || "");
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim().toLowerCase() || null,
          display_name: displayName.trim() || null,
          twitter_handle: twitterHandle.trim() || null,
        })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="font-body text-xs">Username</Label>
        <Input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())} maxLength={20} className="bg-background font-mono" placeholder="your_username" />
      </div>
      <div className="space-y-2">
        <Label className="font-body text-xs">Display Name</Label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={30} className="bg-background" placeholder="Your Name" />
      </div>
      <div className="space-y-2">
        <Label className="font-body text-xs flex items-center gap-1.5">
          <Twitter className="w-3 h-3" /> Twitter Handle
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
          <Input value={twitterHandle} onChange={(e) => setTwitterHandle(e.target.value.replace(/[^a-z0-9_]/gi, ""))} maxLength={15} className="bg-background pl-8 font-mono" placeholder="handle" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="font-body text-xs flex items-center gap-1.5">
          <Wallet className="w-3 h-3" /> Solana Wallet
        </Label>
        <ConnectWallet savedAddress={profile.wallet_address} />
      </div>
      <Button variant="hero" className="w-full gap-2" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Changes
      </Button>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
const ProfilePage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const { data: agent } = useQuery({
    queryKey: ["profile-agent", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").eq("user_id", user!.id).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: nation } = useQuery({
    queryKey: ["profile-nation", agent?.nation_code],
    enabled: !!agent?.nation_code,
    queryFn: async () => {
      const { data } = await supabase.from("nations").select("*").eq("code", agent!.nation_code!).single();
      return data;
    },
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-3xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">Profile</h1>
              <p className="text-sm text-muted-foreground font-body">{user?.email}</p>
            </div>
          </div>

          {/* Passport Card */}
          <div className="mb-6">
            <PassportCard profile={profile} agent={agent} nation={nation} />
          </div>

          {/* Tabbed content */}
          <Tabs defaultValue="stats" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="stats" className="gap-1 text-[10px] sm:text-xs">
                <Zap className="w-3.5 h-3.5" /> Stats
              </TabsTrigger>
              <TabsTrigger value="balance" className="gap-1 text-[10px] sm:text-xs">
                <Wallet className="w-3.5 h-3.5" /> Balance
              </TabsTrigger>
              <TabsTrigger value="quests" className="gap-1 text-[10px] sm:text-xs">
                <Trophy className="w-3.5 h-3.5" /> Quests
              </TabsTrigger>
              <TabsTrigger value="duels" className="gap-1 text-[10px] sm:text-xs">
                <Swords className="w-3.5 h-3.5" /> Duels
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 text-[10px] sm:text-xs">
                <User className="w-3.5 h-3.5" /> Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stats">
              <AgentStats agent={agent} />
              <div className="mt-4">
                <AchievementGrid userId={user!.id} />
              </div>
            </TabsContent>

            <TabsContent value="balance">
              <BalancePanel agent={agent} walletAddress={profile.wallet_address} />
            </TabsContent>

            <TabsContent value="quests">
              {agent ? <QuestHistory agentId={agent.id} /> : (
                <div className="text-center py-8 text-muted-foreground text-sm">Create an agent first.</div>
              )}
            </TabsContent>

            <TabsContent value="duels">
              {agent ? <DuelHistory agentId={agent.id} /> : (
                <div className="text-center py-8 text-muted-foreground text-sm">Create an agent first.</div>
              )}
            </TabsContent>

            <TabsContent value="settings">
              <Card className="glass-card border-border">
                <CardContent className="pt-6">
                  <SettingsForm profile={profile} userId={user!.id} />
                </CardContent>
              </Card>
              <Card className="glass-card border-red-500/20 mt-4">
                <CardContent className="p-4">
                  <Button
                    variant="outline"
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={async () => { await signOut(); navigate("/"); }}
                  >
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
