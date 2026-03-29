import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Shield, Plus, X, MessageCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import GuildChat from "@/components/GuildChat";

const Guilds = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guildName, setGuildName] = useState("");
  const [guildDesc, setGuildDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedGuild, setSelectedGuild] = useState<any | null>(null);

  const { data: guilds = [], isLoading, refetch } = useQuery({
    queryKey: ["guilds"],
    queryFn: async () => {
      const { data } = await supabase
        .from("guilds")
        .select("*")
        .order("total_earnings", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const handleCreateGuild = async () => {
    if (!guildName.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("guilds").insert({
        name: guildName.trim(),
        description: guildDesc.trim() || null,
        master_id: user?.id,
        flag_emoji: "🏛️",
      } as any);
      if (error) throw error;
      toast({ title: "Guild created!", description: `${guildName} is now live.` });
      setShowCreateModal(false);
      setGuildName("");
      setGuildDesc("");
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGuild = async (guildId: string) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to join a guild.", variant: "destructive" });
      return;
    }
    // Get user's agent
    const { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).limit(1).maybeSingle();
    if (!agent) {
      toast({ title: "Agent required", description: "Create an agent first to join a guild.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("guild_members").insert({
      guild_id: guildId,
      agent_id: agent.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Joined!", description: "You have joined the guild." });
      refetch();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-7 h-7 text-primary" />
                <h1 className="text-3xl md:text-4xl font-display font-bold">{t("guilds.title") || "Agent Guilds"}</h1>
              </div>
              <p className="text-muted-foreground text-sm">
                {t("guilds.subtitle") || "Team up for 2x rewards on Global Challenges"}
              </p>
            </div>
            <Button
              onClick={() => {
                if (!user) {
                  toast({ title: "Sign in required", variant: "destructive" });
                  return;
                }
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("guilds.createGuild") || "Create Guild"}
            </Button>
          </div>

          {/* Create Guild Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <Card className="w-full max-w-md mx-4">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-display">Create a Guild</CardTitle>
                  <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                    ⚠️ Commander+ plan required to create guilds.
                  </p>
                  <div>
                    <Label htmlFor="guild-name">Guild Name</Label>
                    <Input
                      id="guild-name"
                      value={guildName}
                      onChange={(e) => setGuildName(e.target.value)}
                      placeholder="e.g. Iron Oracles"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="guild-desc">Description (optional)</Label>
                    <Input
                      id="guild-desc"
                      value={guildDesc}
                      onChange={(e) => setGuildDesc(e.target.value)}
                      placeholder="What is your guild about?"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateGuild} disabled={creating || !guildName.trim()} className="w-full">
                    {creating ? "Creating..." : "Create Guild"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Guild List */}
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">Loading guilds...</div>
          ) : guilds.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No guilds yet. Be the first to create one!
            </div>
          ) : (
            <div className="space-y-4">
              {guilds.map((guild: any) => (
                <Card key={guild.id} className="glass-card border border-border hover:border-primary/20 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{guild.flag_emoji || "🏛️"}</div>
                        <div>
                          <h3 className="font-display font-bold text-lg">{guild.name}</h3>
                          {guild.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">{guild.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {guild.member_count ?? 0} members
                            </Badge>
                            <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">
                              {Number(guild.total_meeet_earned ?? 0).toLocaleString()} MEEET earned
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleJoinGuild(guild.id)}
                        >
                          Join Guild
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-xs"
                          onClick={() => setSelectedGuild(guild)}
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Chat
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Guild Chat Panel */}
          {selectedGuild && (
            <div className="mt-8">
              <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedGuild(null)} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <span className="text-2xl">{selectedGuild.flag_emoji || "🏛️"}</span>
                <h2 className="font-display font-bold text-lg">{selectedGuild.name}</h2>
              </div>
              <GuildChat guildId={selectedGuild.id} />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Guilds;
