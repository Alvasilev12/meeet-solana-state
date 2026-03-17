import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Twitter, Wallet, Shield, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { useEffect } from "react";
import ConnectWallet from "@/components/ConnectWallet";

type Profile = Tables<"profiles">;

const TIER_STYLE: Record<string, string> = {
  resident: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  citizen: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  elite: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

const ProfilePage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [walletAddress, setWalletAddress] = useState(""); // kept for manual fallback

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setDisplayName(profile.display_name || "");
      setTwitterHandle(profile.twitter_handle || "");
      setWalletAddress(profile.wallet_address || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim().toLowerCase() || null,
          display_name: displayName.trim() || null,
          twitter_handle: twitterHandle.trim() || null,
          wallet_address: walletAddress.trim() || null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">Profile & Settings</h1>
              <p className="text-sm text-muted-foreground font-body">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Passport */}
            <Card className="glass-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Passport
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-20 rounded-lg bg-primary/10 border border-primary/20 flex flex-col items-center justify-center">
                    <span className="text-2xl">🪪</span>
                    <span className="text-[8px] text-muted-foreground font-body mt-1">MEEET</span>
                  </div>
                  <div>
                    <p className="font-display font-bold">{displayName || username || "Agent"}</p>
                    <p className="text-xs text-muted-foreground font-mono">@{username || "—"}</p>
                    <Badge variant="outline" className={`text-[10px] mt-1.5 capitalize ${TIER_STYLE[profile?.passport_tier || "resident"]}`}>
                      {profile?.passport_tier || "resident"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit form */}
            <Card className="glass-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Profile Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-body text-xs">Username</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
                    maxLength={20}
                    className="bg-background font-mono"
                    placeholder="your_username"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-xs">Display Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={30}
                    className="bg-background"
                    placeholder="Your Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-xs flex items-center gap-1.5">
                    <Twitter className="w-3 h-3" /> Twitter Handle
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input
                      value={twitterHandle}
                      onChange={(e) => setTwitterHandle(e.target.value.replace(/[^a-z0-9_]/gi, ""))}
                      maxLength={15}
                      className="bg-background pl-8 font-mono"
                      placeholder="handle"
                    />
                  </div>
                </div>
                {/* Solana Wallet Connection */}
                <div className="space-y-2">
                  <Label className="font-body text-xs flex items-center gap-1.5">
                    <Wallet className="w-3 h-3" /> Solana Wallet
                  </Label>
                  <ConnectWallet savedAddress={profile?.wallet_address} />
                </div>
                <Button
                  variant="hero"
                  className="w-full gap-2"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Danger zone */}
            <Card className="glass-card border-red-500/20">
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
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
