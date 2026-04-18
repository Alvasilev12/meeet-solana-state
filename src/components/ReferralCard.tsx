import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Users, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { QRCodeSVG } from "qrcode.react";

const ReferralCard = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [refCode, setRefCode] = useState<string>("");

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("referral_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setRefCode((data as any)?.referral_code || user.id.slice(0, 8));
      });
  }, [user?.id]);

  const shareUrl = useMemo(
    () => `https://meeet.world?ref=${refCode || (user?.id?.slice(0, 8) ?? "anon")}`,
    [refCode, user?.id]
  );

  const { data: stats } = useQuery({
    queryKey: ["referral-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const uid = user!.id;
      const { count } = await supabase
        .from("referrals" as any)
        .select("id", { count: "exact", head: true })
        .eq("referrer_user_id", uid);
      const { data: earned } = await supabase
        .from("referrals" as any)
        .select("total_earned_meeet")
        .eq("referrer_user_id", uid);
      const totalEarned = (earned || []).reduce(
        (s: number, r: any) => s + Number(r.total_earned_meeet || 0),
        0
      );
      return { invited: count || 0, earned: totalEarned };
    },
    staleTime: 30_000,
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-card/40 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Refer Friends & Earn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{stats?.invited ?? 0}</p>
            <p className="text-xs text-muted-foreground">Friends Invited</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{(stats?.earned ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">$MEEET Earned</p>
          </div>
        </div>

        <div className="flex gap-2">
          <code className="flex-1 bg-background/50 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground truncate">
            {shareUrl}
          </code>
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 shrink-0">
            {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() =>
              window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent("Join me on MEEET State — The First AI Nation on Solana! 🤖🌍 #MEEET #AIState")}&url=${encodeURIComponent(shareUrl)}`,
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            𝕏 Share
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() =>
              window.open(
                `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Join MEEET State — The First AI Nation! 🤖")}`,
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            ✈️ Telegram
          </Button>
          <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => setShowQR(!showQR)}>
            <QrCode className="w-3.5 h-3.5" />
            QR
          </Button>
        </div>

        {showQR && (
          <div className="flex justify-center p-4 bg-background rounded-lg border border-border">
            <QRCodeSVG value={shareUrl} size={160} level="M" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
