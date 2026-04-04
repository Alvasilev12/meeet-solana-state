import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Globe, MessageSquare, Phone, Mail, Code, Copy, Check, Settings,
  Wifi, WifiOff, Zap, FileSpreadsheet, BookOpen, Calendar, Users,
  CreditCard, ExternalLink, Bell, Loader2, ChevronRight, Plug, Bot,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";

interface CustomAgent {
  id: string;
  name: string;
  status: string;
}

interface Channel {
  id: string;
  agent_id: string;
  channel_type: string;
  config: Record<string, unknown>;
  is_active: boolean;
  messages_count: number;
  last_message_at: string | null;
}

interface Connector {
  id: string;
  agent_id: string;
  connector_type: string;
  connector_name: string;
  config: Record<string, unknown>;
  is_active: boolean;
}

const CHANNEL_DEFS = [
  {
    type: "web_widget",
    name: "Web Widget",
    description: "Embeddable chat widget for your website. Just copy the code.",
    icon: Globe,
    available: true,
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
    iconColor: "text-blue-400",
  },
  {
    type: "telegram",
    name: "Telegram Bot",
    description: "Connect your agent as a Telegram bot. Requires a token from @BotFather.",
    icon: MessageSquare,
    available: true,
    color: "from-sky-500/20 to-blue-500/20 border-sky-500/30",
    iconColor: "text-sky-400",
  },
  {
    type: "whatsapp",
    name: "WhatsApp",
    description: "Automate customer communication via WhatsApp Business.",
    icon: Phone,
    available: false,
    color: "from-emerald-500/20 to-green-500/20 border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
  {
    type: "api",
    name: "REST API",
    description: "Integrate your agent into any service via API key and endpoint.",
    icon: Code,
    available: true,
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
    iconColor: "text-amber-400",
  },
  {
    type: "email",
    name: "Email",
    description: "Agent will automatically reply to incoming emails.",
    icon: Mail,
    available: false,
    color: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
    iconColor: "text-purple-400",
  },
];

const CONNECTOR_DEFS = [
  { type: "google_sheets", name: "Google Sheets", description: "Read and write data", icon: FileSpreadsheet, available: true },
  { type: "notion", name: "Notion", description: "Access pages and databases", icon: BookOpen, available: true },
  { type: "calendar", name: "Calendar", description: "Manage meetings", icon: Calendar, available: false },
  { type: "crm", name: "CRM", description: "Manage contacts", icon: Users, available: false },
  { type: "stripe", name: "Stripe", description: "Process payments", icon: CreditCard, available: false },
];

const ConnectorHub = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [widgetColor, setWidgetColor] = useState("#6366f1");
  const [widgetPosition, setWidgetPosition] = useState("bottom-right");
  const [widgetGreeting, setWidgetGreeting] = useState("Hi! How can I help?");

  useEffect(() => {
    if (!user) return;
    loadAgents();
  }, [user]);

  useEffect(() => {
    if (selectedAgentId) loadChannelsAndConnectors();
  }, [selectedAgentId]);

  const loadAgents = async () => {
    const { data } = await supabase
      .from("custom_agents")
      .select("id, name, status")
      .eq("creator_id", user!.id)
      .order("created_at", { ascending: false });
    if (data && data.length > 0) {
      setAgents(data);
      setSelectedAgentId(data[0].id);
    }
    setLoading(false);
  };

  const loadChannelsAndConnectors = async () => {
    const [chRes, coRes] = await Promise.all([
      supabase.from("agent_channels").select("*").eq("agent_id", selectedAgentId),
      supabase.from("agent_connectors").select("*").eq("agent_id", selectedAgentId),
    ]);
    if (chRes.data) setChannels(chRes.data as Channel[]);
    if (coRes.data) setConnectors(coRes.data as Connector[]);
  };

  const getChannel = (type: string) => channels.find((c) => c.channel_type === type);
  const getConnector = (type: string) => connectors.find((c) => c.connector_type === type);

  const toggleChannel = async (type: string) => {
    const existing = getChannel(type);
    if (existing) {
      await supabase
        .from("agent_channels")
        .update({ is_active: !existing.is_active })
        .eq("id", existing.id);
    } else {
      await supabase.from("agent_channels").insert({
        agent_id: selectedAgentId,
        channel_type: type,
        is_active: true,
        config: type === "web_widget"
          ? { color: widgetColor, position: widgetPosition, greeting: widgetGreeting }
          : type === "api"
          ? { api_key: `mst_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}` }
          : {},
      });
    }
    await loadChannelsAndConnectors();
    toast.success(existing ? "Канал обновлён" : "Канал подключён");
  };

  const toggleConnector = async (type: string, name: string) => {
    const existing = getConnector(type);
    if (existing) {
      await supabase
        .from("agent_connectors")
        .update({ is_active: !existing.is_active })
        .eq("id", existing.id);
    } else {
      await supabase.from("agent_connectors").insert({
        agent_id: selectedAgentId,
        connector_type: type,
        connector_name: name,
        is_active: true,
      });
    }
    await loadChannelsAndConnectors();
    toast.success(existing ? "Коннектор обновлён" : "Коннектор подключён");
  };

  const connectTelegram = async () => {
    if (!botToken.trim()) return toast.error("Введите токен бота");
    const existing = getChannel("telegram");
    if (existing) {
      await supabase
        .from("agent_channels")
        .update({ is_active: true, config: { bot_token: botToken.trim() } })
        .eq("id", existing.id);
    } else {
      await supabase.from("agent_channels").insert({
        agent_id: selectedAgentId,
        channel_type: "telegram",
        is_active: true,
        config: { bot_token: botToken.trim() },
      });
    }
    await loadChannelsAndConnectors();
    setTelegramModalOpen(false);
    setBotToken("");
    toast.success("Telegram бот подключён!");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Скопировано!");
  };

  const embedCode = `<script src="https://meeet.world/widget.js" data-agent-id="${selectedAgentId}" data-color="${widgetColor}" data-position="${widgetPosition}" data-greeting="${widgetGreeting}"></script>`;

  const apiChannel = getChannel("api");
  const apiKey = (apiChannel?.config as Record<string, string>)?.api_key || "—";
  const apiEndpoint = `https://zujrmifaabkletgnpoyw.supabase.co/functions/v1/agent-api`;

  const curlExample = `curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{"action":"chat","agent_id":"${selectedAgentId}","message":"Hello"}'`;

  if (loading) {
    return (
      <PageWrapper>
        <SEOHead title="Connector Hub — Meeet" description="Connect your AI agent to multiple channels" />
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  if (agents.length === 0) {
    return (
      <PageWrapper>
        <SEOHead title="Connector Hub — Meeet" description="Connect your AI agent to multiple channels" />
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
          <Plug className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-2xl font-bold text-foreground">No Agents</h2>
          <p className="text-muted-foreground text-center max-w-md">
            First create an agent in Agent Studio, then connect it to channels.
          </p>
          <Button onClick={() => window.location.href = "/agent-studio"} className="gap-2">
            <Bot className="w-4 h-4" /> Create Agent
          </Button>
        </div>
        <Footer />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <SEOHead title="Connector Hub — Meeet" description="Connect your AI agent to channels and integrations" />
      <Navbar />

      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Plug className="w-8 h-8 text-primary" />
                Connector Hub
              </h1>
              <p className="text-muted-foreground mt-1">
                Deploy your agent across multiple channels simultaneously
              </p>
            </div>

            {/* Agent Selector */}
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="w-64 bg-card border-border">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <Bot className="w-4 h-4" /> {a.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="channels" className="space-y-6">
            <TabsList className="bg-card/50 border border-border">
              <TabsTrigger value="channels" className="gap-2 data-[state=active]:bg-primary/10">
                <Wifi className="w-4 h-4" /> Channels
              </TabsTrigger>
              <TabsTrigger value="connectors" className="gap-2 data-[state=active]:bg-primary/10">
                <Zap className="w-4 h-4" /> Connectors
              </TabsTrigger>
            </TabsList>

            {/* === CHANNELS TAB === */}
            <TabsContent value="channels" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CHANNEL_DEFS.map((ch) => {
                  const Icon = ch.icon;
                  const active = getChannel(ch.type);
                  const isOn = active?.is_active ?? false;

                  return (
                    <Card
                      key={ch.type}
                      className={`relative overflow-hidden bg-gradient-to-br ${ch.color} border transition-all duration-300 hover:scale-[1.02] ${
                        !ch.available ? "opacity-50" : ""
                      }`}
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-background/30 flex items-center justify-center ${ch.iconColor}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground flex items-center gap-2">
                                {ch.name}
                                {!ch.available && (
                                  <Badge variant="outline" className="text-[10px] border-muted-foreground/30">
                                     Coming Soon
                                  </Badge>
                                )}
                              </h3>
                            </div>
                          </div>
                          {ch.available && (
                            <div className="flex items-center gap-2">
                              {isOn && (
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                </span>
                              )}
                              {!isOn && active && <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />}
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">{ch.description}</p>

                        {/* Stats row */}
                        {active && isOn && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{active.messages_count} msgs</span>
                            {active.last_message_at && (
                              <span>
                                Last: {new Date(active.last_message_at).toLocaleDateString("en-US")}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {ch.type === "web_widget" && ch.available && (
                            <>
                              <Switch
                                checked={isOn}
                                onCheckedChange={() => toggleChannel("web_widget")}
                              />
                              {isOn && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-xs"
                                  onClick={() => setWidgetModalOpen(true)}
                                >
                                  <Code className="w-3 h-3" /> Embed
                                </Button>
                              )}
                            </>
                          )}
                          {ch.type === "telegram" && ch.available && (
                            <>
                              {isOn ? (
                                <Switch checked onCheckedChange={() => toggleChannel("telegram")} />
                              ) : (
                                <Button
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => setTelegramModalOpen(true)}
                                >
                                  <MessageSquare className="w-3 h-3" /> Connect
                                </Button>
                              )}
                            </>
                          )}
                          {ch.type === "api" && ch.available && (
                            <>
                              <Switch
                                checked={isOn}
                                onCheckedChange={() => toggleChannel("api")}
                              />
                              {isOn && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-xs"
                                  onClick={() => setApiModalOpen(true)}
                                >
                                  <ExternalLink className="w-3 h-3" /> Docs
                                </Button>
                              )}
                            </>
                          )}
                          {!ch.available && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs">
                              <Bell className="w-3 h-3" /> Notify Me
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* === CONNECTORS TAB === */}
            <TabsContent value="connectors" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CONNECTOR_DEFS.map((co) => {
                  const Icon = co.icon;
                  const existing = getConnector(co.type);
                  const isOn = existing?.is_active ?? false;

                  return (
                    <Card
                      key={co.type}
                      className={`bg-card/50 border-border transition-all duration-300 hover:scale-[1.02] ${
                        !co.available ? "opacity-50" : ""
                      }`}
                    >
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground flex items-center gap-2">
                                {co.name}
                                {!co.available && (
                                  <Badge variant="outline" className="text-[10px] border-muted-foreground/30">
                                    Coming Soon
                                  </Badge>
                                )}
                              </h3>
                              <p className="text-xs text-muted-foreground">{co.description}</p>
                            </div>
                          </div>
                          {isOn && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                          )}
                        </div>

                        {co.available ? (
                          <Button
                            size="sm"
                            variant={isOn ? "outline" : "default"}
                            className="w-full gap-2"
                            onClick={() => toggleConnector(co.type, co.name)}
                          >
                            {isOn ? (
                              <>
                                <Check className="w-3 h-3" /> Connected
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3" /> Connect
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full gap-2 text-xs" disabled>
                            <Bell className="w-3 h-3" /> Coming Soon
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* === WEB WIDGET MODAL === */}
      <Dialog open={widgetModalOpen} onOpenChange={setWidgetModalOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" /> Web Widget — Embed Code
            </DialogTitle>
            <DialogDescription>
              Вставьте этот код перед &lt;/body&gt; на вашем сайте
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Основной цвет</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={widgetColor}
                  onChange={(e) => setWidgetColor(e.target.value)}
                  className="w-10 h-8 rounded border border-border cursor-pointer"
                />
                <Input value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Позиция</label>
              <Select value={widgetPosition} onValueChange={setWidgetPosition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Справа внизу</SelectItem>
                  <SelectItem value="bottom-left">Слева внизу</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Приветствие</label>
              <Input
                value={widgetGreeting}
                onChange={(e) => setWidgetGreeting(e.target.value)}
                placeholder="Привет! Чем могу помочь?"
              />
            </div>
            <div className="relative">
              <pre className="bg-background/50 border border-border rounded-lg p-3 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
                {embedCode}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 gap-1"
                onClick={() => copyToClipboard(embedCode)}
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* === TELEGRAM MODAL === */}
      <Dialog open={telegramModalOpen} onOpenChange={setTelegramModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-sky-400" /> Подключить Telegram
            </DialogTitle>
            <DialogDescription>
              Получите токен у{" "}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                @BotFather
              </a>{" "}
              и вставьте ниже
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyz"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Откройте @BotFather в Telegram</li>
              <li>Отправьте /newbot и следуйте инструкциям</li>
              <li>Скопируйте полученный токен сюда</li>
            </ol>
            <Button className="w-full gap-2" onClick={connectTelegram}>
              <MessageSquare className="w-4 h-4" /> Подключить бота
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === API DOCS MODAL === */}
      <Dialog open={apiModalOpen} onOpenChange={setApiModalOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="w-5 h-5 text-amber-400" /> REST API
            </DialogTitle>
            <DialogDescription>Используйте этот ключ и эндпоинт для интеграции</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">API Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background/50 border border-border rounded px-3 py-2 text-xs font-mono text-foreground break-all">
                  {apiKey}
                </code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(apiKey)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Endpoint</label>
              <code className="block bg-background/50 border border-border rounded px-3 py-2 text-xs font-mono text-foreground break-all">
                {apiEndpoint}
              </code>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Пример cURL</label>
              <div className="relative">
                <pre className="bg-background/50 border border-border rounded-lg p-3 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
                  {curlExample}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(curlExample)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </PageWrapper>
  );
};

export default ConnectorHub;
