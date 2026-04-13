import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Check, Loader2, Unplug, X, MessageSquare, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

export default function TelegramBotWizard({ userId, agentId, tier }: { userId: string; agentId?: string; tier: string }) {
  const { t } = useLanguage();
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"intro" | "input" | "connected">("intro");
  const { toast } = useToast();
  const qc = useQueryClient();

  const isPro = tier === "pro" || tier === "enterprise";

  const { data: botData, isLoading: botLoading } = useQuery({
    queryKey: ["my-telegram-bot", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_bots_safe" as any)
        .select("*")
        .eq("user_id", userId)
        .limit(1);
      return (data && data.length > 0) ? data[0] : null;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!token.trim()) throw new Error("Token required");
      const res = await supabase.functions.invoke("agent-telegram-bot", {
        body: { action: "connect", bot_token: token.trim(), agent_id: agentId },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["my-telegram-bot"] });
      toast({ title: "✅", description: `@${data?.bot_username || "bot"} online` });
      setStep("connected");
      setToken("");
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("agent-telegram-bot", {
        body: { action: "disconnect", user_id: userId },
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-telegram-bot"] });
      toast({ title: t("tgBot.disconnect") });
      setStep("intro");
    },
    onError: (e: any) => toast({ title: t("common.error"), description: e.message, variant: "destructive" }),
  });

  if (botLoading) return null;

  // Already connected
  if (botData) {
    return (
      <Card className="glass-card border-border overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 via-primary to-sky-500" />
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Bot className="w-4 h-4 text-sky-400" />
            {t("tgBot.telegramBot")}
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">{t("tgBot.online")}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="glass-card rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-display font-bold text-foreground">@{(botData as any).bot_username || "connected"}</p>
              <p className="text-[10px] text-muted-foreground font-body flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {(botData as any).total_messages ?? 0} {t("tgBot.messages")}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <a href={`https://t.me/${(botData as any).bot_username}`} target="_blank" rel="noopener">
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <ExternalLink className="w-3 h-3" /> {t("tgBot.open")}
                </Button>
              </a>
              <Button
                variant="outline" size="sm"
                className="text-xs gap-1 text-red-400 border-red-500/20 hover:bg-red-500/10"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unplug className="w-3 h-3" />}
                {t("tgBot.disconnect")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not Pro — locked
  if (!isPro) {
    return (
      <Card className="glass-card border-border overflow-hidden relative opacity-75">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-muted via-muted-foreground/20 to-muted" />
        <CardContent className="p-5 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto">
            <Bot className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-display font-bold text-foreground">{t("tgBot.connectBot")}</p>
            <p className="text-xs text-muted-foreground font-body mt-1">{t("tgBot.proRequired")}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href="/pricing">{t("tgBot.upgradePro")}</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Intro
  if (step === "intro") {
    return (
      <Card className="glass-card border-border overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 via-primary to-sky-500" />
        <CardContent className="p-5 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto">
            <Bot className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <p className="font-display font-bold text-foreground">{t("tgBot.giveAgentBot")}</p>
            <p className="text-xs text-muted-foreground font-body mt-1">{t("tgBot.agentResponds")}</p>
          </div>
          <Button variant="hero" size="sm" className="gap-1.5" onClick={() => setStep("input")}>
            <Bot className="w-3.5 h-3.5" /> {t("tgBot.connectBotBtn")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Token input
  return (
    <Card className="glass-card border-border overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 via-primary to-sky-500" />
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <Bot className="w-4 h-4 text-sky-400" /> {t("tgBot.connectBot")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="glass-card rounded-lg p-3 space-y-2 text-xs text-muted-foreground font-body">
          <p>1. {t("tgBot.step1")} <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t("tgBot.step1Link")}</a> {t("tgBot.step1Desc")}</p>
          <p>2. {t("tgBot.step2")} <code className="bg-muted px-1 rounded">{t("tgBot.step2Cmd")}</code> {t("tgBot.step2Desc")}</p>
          <p>3. {t("tgBot.step3")}</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="123456:ABC-DEF..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="font-mono text-xs"
          />
          <Button
            variant="hero" size="sm"
            disabled={!token.trim() || connectMutation.isPending}
            onClick={() => connectMutation.mutate()}
          >
            {connectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStep("intro")}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}