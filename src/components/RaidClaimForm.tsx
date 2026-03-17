import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Gift, CheckCircle, Clock, XCircle, Loader2, Twitter, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RaidClaimForm() {
  const [twitterHandle, setTwitterHandle] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: myStatus, isLoading } = useQuery({
    queryKey: ["raid-my-status"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("manage-raid-claims", {
        body: { action: "my_status" },
      });
      if (res.error) throw new Error(res.error.message);
      return res.data as {
        claim: { id: string; status: string; twitter_handle: string; created_at: string; rejection_reason: string | null } | null;
        spots_remaining: number;
      };
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("manage-raid-claims", {
        body: {
          action: "submit",
          twitter_handle: twitterHandle.trim(),
          proof_url: proofUrl.trim() || undefined,
          proof_text: proofText.trim() || undefined,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raid-my-status"] });
      toast({ title: "🎁 Claim submitted!", description: "Your raid reward claim is pending review by the President." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <Card className="glass-card border-primary/20">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Already claimed
  if (myStatus?.claim) {
    const claim = myStatus.claim;
    const statusConfig = {
      pending: { icon: <Clock className="w-4 h-4" />, color: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: "Pending Review" },
      approved: { icon: <CheckCircle className="w-4 h-4" />, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", label: "Approved ✓" },
      rejected: { icon: <XCircle className="w-4 h-4" />, color: "bg-red-500/15 text-red-400 border-red-500/20", label: "Rejected" },
    }[claim.status] || { icon: <Clock className="w-4 h-4" />, color: "bg-muted text-muted-foreground", label: claim.status };

    return (
      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            Twitter Raid Reward
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="glass-card rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-body">Your Claim</span>
              <Badge className={`text-[10px] ${statusConfig.color} gap-1`}>
                {statusConfig.icon} {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm font-mono text-foreground">@{claim.twitter_handle}</p>
            {claim.status === "approved" && (
              <p className="text-xs text-emerald-400 mt-2 font-body">🎁 1,000 $MEEET has been credited to your agent!</p>
            )}
            {claim.status === "rejected" && claim.rejection_reason && (
              <p className="text-xs text-red-400 mt-2 font-body">Reason: {claim.rejection_reason}</p>
            )}
            {claim.status === "pending" && (
              <p className="text-xs text-muted-foreground mt-2 font-body">The President will review your claim soon.</p>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Spots remaining</span>
            <span className="font-mono font-bold text-primary">{myStatus.spots_remaining} / 100</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No spots left
  if (myStatus && myStatus.spots_remaining <= 0) {
    return (
      <Card className="glass-card border-border">
        <CardContent className="p-6 text-center">
          <Gift className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-display font-semibold text-muted-foreground">All 100 raid reward slots have been claimed!</p>
        </CardContent>
      </Card>
    );
  }

  // Submit form
  return (
    <Card className="glass-card border-primary/20 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          Claim Twitter Raid Reward
        </CardTitle>
        <CardDescription className="font-body text-xs">
          Get <span className="text-primary font-bold">1,000 $MEEET</span> for joining via Twitter raid.
          <span className="text-muted-foreground"> ({myStatus?.spots_remaining ?? 100} spots left)</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="font-body text-xs flex items-center gap-1">
            <Twitter className="w-3 h-3" /> Twitter Handle
          </Label>
          <Input
            placeholder="@your_handle"
            value={twitterHandle}
            onChange={(e) => setTwitterHandle(e.target.value)}
            maxLength={30}
            className="bg-background font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-xs flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> Proof Link
          </Label>
          <Input
            placeholder="Link to your tweet or DM screenshot"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            className="bg-background text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-xs">Additional Proof / Notes</Label>
          <Textarea
            placeholder="Optional: describe how you found us"
            value={proofText}
            onChange={(e) => setProofText(e.target.value)}
            maxLength={500}
            className="bg-background text-sm min-h-[60px]"
          />
        </div>
        <Button
          variant="hero"
          className="w-full"
          disabled={!twitterHandle.trim() || (!proofUrl.trim() && !proofText.trim()) || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gift className="w-4 h-4 mr-2" />}
          Submit Claim
        </Button>
      </CardContent>
    </Card>
  );
}
