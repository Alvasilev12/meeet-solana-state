import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageSquare, Loader2, Lock, Send, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SpixPanel({ userId, agentId, tier }: { userId: string; agentId?: string; tier: string }) {
  const isEnterprise = tier === "enterprise";
  const isPro = tier === "pro" || isEnterprise;
  const { toast } = useToast();

  const { data: balance } = useQuery({
    queryKey: ["user-balance", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_balance")
        .select("*")
        .eq("user_id", userId)
        .limit(1);
      return (data && data.length > 0) ? data[0] : null;
    },
  });

  const usdBalance = Number((balance as any)?.balance ?? 0);

  // Call state
  const [phone, setPhone] = useState("");
  const [callMsg, setCallMsg] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [smsPhone, setSmsPhone] = useState("");
  const [smsMsg, setSmsMsg] = useState("");

  const spixAction = useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload: any }) => {
      const res = await supabase.functions.invoke("agent-spix", {
        body: { action, agent_id: agentId, user_id: userId, ...payload },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast({ title: "✅ Action completed", description: data?.message || "Success" });
    },
    onError: (e: any) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  if (!isEnterprise) {
    return (
      <Card className="glass-card border-border overflow-hidden relative opacity-75">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted" />
        <CardContent className="p-5 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto">
            <Phone className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-display font-bold text-foreground">Communications Hub</p>
            <p className="text-xs text-muted-foreground font-body mt-1">
              🔒 Enterprise plan required for calls, email & SMS
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href="/pricing">Upgrade to Enterprise →</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-primary to-violet-500" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Phone className="w-4 h-4 text-violet-400" />
            Communications
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            <DollarSign className="w-3 h-3 mr-0.5" />${usdBalance.toFixed(2)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="call" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-3">
            <TabsTrigger value="call" className="text-xs gap-1"><Phone className="w-3 h-3" /> Call</TabsTrigger>
            <TabsTrigger value="email" className="text-xs gap-1"><Mail className="w-3 h-3" /> Email</TabsTrigger>
            <TabsTrigger value="sms" className="text-xs gap-1"><MessageSquare className="w-3 h-3" /> SMS</TabsTrigger>
          </TabsList>

          <TabsContent value="call" className="space-y-2">
            <Input placeholder="+1 555 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className="text-xs" />
            <Input placeholder="Message for the call" value={callMsg} onChange={(e) => setCallMsg(e.target.value)} className="text-xs" />
            <Button
              variant="hero" size="sm" className="w-full text-xs gap-1"
              disabled={!phone || !callMsg || spixAction.isPending}
              onClick={() => spixAction.mutate({ action: "call", payload: { phone, message: callMsg } })}
            >
              {spixAction.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" />}
              Call — $0.10/min
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-2">
            <Input placeholder="recipient@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="text-xs" />
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="text-xs" />
            <textarea
              placeholder="Email body..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              variant="hero" size="sm" className="w-full text-xs gap-1"
              disabled={!email || !subject || !body || spixAction.isPending}
              onClick={() => spixAction.mutate({ action: "email", payload: { to: email, subject, body } })}
            >
              {spixAction.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Send Email — $0.02
            </Button>
          </TabsContent>

          <TabsContent value="sms" className="space-y-2">
            <Input placeholder="+1 555 123 4567" value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} className="text-xs" />
            <Input placeholder="SMS message" value={smsMsg} onChange={(e) => setSmsMsg(e.target.value)} className="text-xs" />
            <Button
              variant="hero" size="sm" className="w-full text-xs gap-1"
              disabled={!smsPhone || !smsMsg || spixAction.isPending}
              onClick={() => spixAction.mutate({ action: "sms", payload: { phone: smsPhone, message: smsMsg } })}
            >
              {spixAction.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
              Send SMS — $0.04
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
