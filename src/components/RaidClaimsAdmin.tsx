import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Gift, CheckCircle, XCircle, Loader2, ExternalLink,
  Users, Flame, Clock, Twitter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RaidClaim {
  id: string;
  user_id: string;
  agent_id: string | null;
  twitter_handle: string;
  proof_url: string | null;
  proof_text: string | null;
  status: string;
  reward_meeet: number;
  created_at: string;
}

interface CampaignStats {
  total_claims: number;
  approved_claims: number;
  pending_claims: number;
  total_rewarded: number;
}

export default function RaidClaimsAdmin() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [hasSession, setHasSession] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const authClient = supabase.auth as any;
    let isMounted = true;

    const checkSession = async () => {
      const { data, error } = await authClient.getUser();
      if (!isMounted) return;
      setHasSession(!error && !!data?.user?.id);
    };

    void checkSession();

    const {
      data: { subscription },
    } = authClient.onAuthStateChange(() => {
      void checkSession();
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["raid-claims-admin", statusFilter],
    queryFn: async () => {
      const res = await supabase.functions.invoke("manage-raid-claims", {
        body: { action: "list", status_filter: statusFilter },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data as {
        claims: RaidClaim[];
        stats: CampaignStats;
        max_approved: number;
      };
    },
    enabled: hasSession,
    refetchInterval: 15000,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ claimId, decision, rejectionReason }: {
      claimId: string; decision: "approved" | "rejected"; rejectionReason?: string;
    }) => {
      const res = await supabase.functions.invoke("manage-raid-claims", {
        body: { action: "review", claim_id: claimId, decision, rejection_reason: rejectionReason },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["raid-claims-admin"] });
      toast({ title: data.status === "approved" ? "✅ Approved" : "❌ Rejected", description: data.message });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const stats = data?.stats;
  const claims = data?.claims || [];

  return (
    <Card className="glass-card border-amber-500/15 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-600" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" />
            Twitter Raid Claims
          </CardTitle>
          {stats && (
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">
                ✅ {stats.approved_claims} / {data?.max_approved}
              </Badge>
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px]">
                ⏳ {stats.pending_claims}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card rounded-lg p-2 text-center">
              <Users className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
              <p className="text-lg font-display font-bold">{stats.total_claims}</p>
              <p className="text-[9px] text-muted-foreground">Total</p>
            </div>
            <div className="glass-card rounded-lg p-2 text-center">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-0.5" />
              <p className="text-lg font-display font-bold text-emerald-400">{stats.approved_claims}</p>
              <p className="text-[9px] text-muted-foreground">Approved</p>
            </div>
            <div className="glass-card rounded-lg p-2 text-center">
              <Flame className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
              <p className="text-lg font-display font-bold text-amber-400">{Number(stats.total_rewarded).toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground">$MEEET Paid</p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1.5">
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="text-[10px] capitalize h-7 px-3"
              onClick={() => setStatusFilter(s)}
            >
              {s === "pending" && <Clock className="w-3 h-3 mr-1" />}
              {s === "approved" && <CheckCircle className="w-3 h-3 mr-1" />}
              {s === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
              {s}
            </Button>
          ))}
        </div>

        {/* Claims list */}
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <p className="text-xs text-red-400 text-center py-4">{(error as Error).message}</p>
        ) : claims.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 font-body">No {statusFilter} claims</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {claims.map((claim) => (
              <div key={claim.id} className="glass-card rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Twitter className="w-3.5 h-3.5 text-blue-400" />
                    <a
                      href={`https://x.com/${claim.twitter_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-blue-400 hover:underline"
                    >
                      @{claim.twitter_handle}
                    </a>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-body">
                    {new Date(claim.created_at).toLocaleDateString()}
                  </span>
                </div>

                {claim.proof_url && (
                  <a
                    href={claim.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 truncate"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    {claim.proof_url}
                  </a>
                )}

                {claim.proof_text && (
                  <p className="text-[11px] text-muted-foreground font-body line-clamp-2">{claim.proof_text}</p>
                )}

                {statusFilter === "pending" && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ claimId: claim.id, decision: "approved" })}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        placeholder="Reason"
                        className="h-7 text-[10px] bg-background"
                        value={rejectionReasons[claim.id] || ""}
                        onChange={(e) => setRejectionReasons(prev => ({ ...prev, [claim.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-[11px] px-2"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate({
                          claimId: claim.id,
                          decision: "rejected",
                          rejectionReason: rejectionReasons[claim.id],
                        })}
                      >
                        <XCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
