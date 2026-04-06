import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import { useEffect, useState } from "react";
import { Key, Copy, Trash2, BarChart3, Code2, Shield, Clock, CheckCircle, XCircle, RefreshCw, Webhook, Play, Pause, Send, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  permissions: string[];
  rate_limit: number;
  daily_limit: number;
  status: string;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  status: string;
  retry_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  event_type: string;
  response_status: number;
  attempt_number: number;
  delivered_at: string | null;
  created_at: string;
}

const WEBHOOK_EVENTS = [
  "reputation.updated", "stake.locked", "stake.resolved",
  "verification.completed", "attestation.imported", "interaction.confirmed",
  "claim.submitted", "claim.verified",
];

const PERMISSION_OPTIONS = ["callbacks", "staking", "reputation", "attestations", "interactions", "veroq"];

const CODE_EXAMPLES = {
  curl: `curl -X POST \\
  https://PROJECT_ID.supabase.co/functions/v1/adk-before-tool \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: meeet_pk_your_key_here" \\
  -d '{
    "agent_did": "did:meeet:agent_YOUR_AGENT_ID",
    "tool_name": "verify_discovery",
    "params": {}
  }'`,
  javascript: `const response = await fetch(
  \`https://\${PROJECT_ID}.supabase.co/functions/v1/adk-before-tool\`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "meeet_pk_your_key_here",
    },
    body: JSON.stringify({
      agent_did: "did:meeet:agent_YOUR_AGENT_ID",
      tool_name: "verify_discovery",
      params: {},
    }),
  }
);
const data = await response.json();
console.log(data);`,
  python: `import requests

response = requests.post(
    f"https://{PROJECT_ID}.supabase.co/functions/v1/adk-before-tool",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "meeet_pk_your_key_here",
    },
    json={
        "agent_did": "did:meeet:agent_YOUR_AGENT_ID",
        "tool_name": "verify_discovery",
        "params": {},
    },
)
print(response.json())`,
};

const ENDPOINTS = [
  { method: "POST", path: "/adk-before-tool", permission: "callbacks", desc: "Pre-flight authorization for agent actions" },
  { method: "POST", path: "/adk-after-tool", permission: "callbacks", desc: "Post-execution logging and receipts" },
  { method: "POST", path: "/staking-engine", permission: "staking", desc: "Lock, resolve, slash stakes" },
  { method: "GET", path: "/staking-engine", permission: "staking", desc: "Query stakes and TVL stats" },
  { method: "POST", path: "/reputation-engine", permission: "reputation", desc: "Record reputation events" },
  { method: "GET", path: "/reputation-engine", permission: "reputation", desc: "Query agent reputation profile" },
  { method: "POST", path: "/attestation-import", permission: "attestations", desc: "Import external attestations" },
  { method: "POST", path: "/interaction-history", permission: "interactions", desc: "Create/confirm interactions" },
  { method: "POST", path: "/veroq-integration", permission: "veroq", desc: "Submit and verify claims" },
];

const Developer = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyAgentId, setNewKeyAgentId] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([...PERMISSION_OPTIONS]);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [codeTab, setCodeTab] = useState("curl");

  // Webhook state
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});
  const [registeringWh, setRegisteringWh] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1/api-keys`;
  const whUrl = `https://${projectId}.supabase.co/functions/v1/webhooks`;

  const fetchKeys = async () => {
    if (!newKeyAgentId) { setLoading(false); return; }
    try {
      const r = await fetch(`${baseUrl}/list?agent_id=${newKeyAgentId}`);
      const d = await r.json();
      setKeys(d.keys || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  const fetchWebhooks = async () => {
    if (!newKeyAgentId) return;
    try {
      const r = await fetch(`${whUrl}/list?agent_id=${newKeyAgentId}`);
      const d = await r.json();
      setWebhooks(d.webhooks || []);
    } catch { /* empty */ }
  };

  const fetchDeliveries = async (webhookId: string) => {
    try {
      const r = await fetch(`${whUrl}/deliveries/${webhookId}`);
      const d = await r.json();
      setDeliveries(prev => ({ ...prev, [webhookId]: d.deliveries || [] }));
    } catch { /* empty */ }
  };

  useEffect(() => { fetchKeys(); fetchWebhooks(); }, [newKeyAgentId]);

  const handleGenerate = async () => {
    if (!newKeyAgentId || !newKeyName) {
      toast.error("Agent ID and key name are required");
      return;
    }
    setGenerating(true);
    try {
      const r = await fetch(`${baseUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_did: `did:meeet:agent_${newKeyAgentId}`,
          name: newKeyName,
          permissions: selectedPerms,
          rate_limit: 100,
          expires_in_days: 90,
        }),
      });
      const d = await r.json();
      if (d.api_key) {
        setGeneratedKey(d.api_key);
        toast.success("API key generated! Copy it now — it won't be shown again.");
        setNewKeyName("");
        fetchKeys();
      } else {
        toast.error(d.error || "Failed to generate key");
      }
    } catch { toast.error("Network error"); }
    setGenerating(false);
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await fetch(`${baseUrl}/revoke/${keyId}`, { method: "POST" });
      toast.success("Key revoked");
      fetchKeys();
    } catch { toast.error("Failed to revoke"); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleRegisterWebhook = async () => {
    if (!newKeyAgentId || !webhookUrl || selectedEvents.length === 0) {
      toast.error("Agent ID, URL, and at least one event required");
      return;
    }
    if (!webhookUrl.startsWith("https://")) {
      toast.error("Only HTTPS URLs are allowed");
      return;
    }
    setRegisteringWh(true);
    try {
      const r = await fetch(`${whUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: newKeyAgentId, url: webhookUrl, events: selectedEvents }),
      });
      const d = await r.json();
      if (d.secret) {
        setWebhookSecret(d.secret);
        toast.success("Webhook registered! Copy the secret now.");
        setWebhookUrl("");
        setSelectedEvents([]);
        fetchWebhooks();
      } else {
        toast.error(d.error || "Failed to register");
      }
    } catch { toast.error("Network error"); }
    setRegisteringWh(false);
  };

  const handleTestWebhook = async (whId: string) => {
    try {
      const r = await fetch(`${whUrl}/test/${whId}`, { method: "POST" });
      const d = await r.json();
      if (d.delivered) toast.success(`Test delivered! Status: ${d.response_status}`);
      else toast.error(`Test failed. Status: ${d.response_status}`);
      fetchDeliveries(whId);
    } catch { toast.error("Failed to send test"); }
  };

  const handleToggleWebhook = async (whId: string, action: "pause" | "resume") => {
    try {
      await fetch(`${whUrl}/${action}/${whId}`, { method: "POST" });
      toast.success(action === "pause" ? "Webhook paused" : "Webhook resumed");
      fetchWebhooks();
    } catch { toast.error("Failed"); }
  };

  const handleDeleteWebhook = async (whId: string) => {
    try {
      await fetch(`${whUrl}/delete/${whId}`, { method: "DELETE" });
      toast.success("Webhook deleted");
      fetchWebhooks();
    } catch { toast.error("Failed"); }
  };

  return (
    <PageWrapper>
      <SEOHead title="Developer Portal — MEEET STATE" description="Generate API keys, explore endpoints, and integrate with the MEEET agent platform." path="/developer" />
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">Developer Portal</h1>
            <p className="text-muted-foreground">Generate API keys, explore endpoints, and integrate with MEEET STATE.</p>
          </div>

          <Tabs defaultValue="keys" className="space-y-6">
            <TabsList className="bg-card/50 border border-border">
              <TabsTrigger value="keys"><Key className="w-4 h-4 mr-1" /> API Keys</TabsTrigger>
              <TabsTrigger value="docs"><Code2 className="w-4 h-4 mr-1" /> Endpoints</TabsTrigger>
              <TabsTrigger value="examples"><Code2 className="w-4 h-4 mr-1" /> Code Examples</TabsTrigger>
              <TabsTrigger value="usage"><BarChart3 className="w-4 h-4 mr-1" /> Usage</TabsTrigger>
              <TabsTrigger value="webhooks"><Globe className="w-4 h-4 mr-1" /> Webhooks</TabsTrigger>
            </TabsList>

            {/* API Keys Tab */}
            <TabsContent value="keys" className="space-y-6">
              {/* Generate new key */}
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Generate New API Key</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Agent ID</label>
                    <Input placeholder="Enter agent UUID" value={newKeyAgentId} onChange={e => setNewKeyAgentId(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Key Name</label>
                    <Input placeholder="My Integration Key" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-sm text-muted-foreground mb-2 block">Permissions</label>
                  <div className="flex flex-wrap gap-2">
                    {PERMISSION_OPTIONS.map(p => (
                      <button key={p} onClick={() => setSelectedPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedPerms.includes(p) ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-muted-foreground"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={handleGenerate} disabled={generating} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  {generating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                  Generate Key
                </Button>
              </div>

              {/* Generated key display */}
              {generatedKey && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="text-green-400 font-bold text-sm">Key Generated — Copy it now! It won't be shown again.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background/50 px-4 py-2 rounded-lg font-mono text-sm text-foreground break-all">{generatedKey}</code>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedKey)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Keys list */}
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Your API Keys</h2>
                {!newKeyAgentId ? (
                  <p className="text-sm text-muted-foreground">Enter an Agent ID above to view keys.</p>
                ) : keys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No API keys found for this agent.</p>
                ) : (
                  <div className="space-y-3">
                    {keys.map(k => (
                      <div key={k.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-foreground">{k.key_prefix}...</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${k.status === "active" ? "bg-green-500/20 text-green-400" : k.status === "revoked" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                              {k.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{k.name} · {k.usage_count || 0} requests · Rate: {k.rate_limit}/min</p>
                        </div>
                        {k.status === "active" && (
                          <Button size="sm" variant="ghost" onClick={() => handleRevoke(k.id)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Endpoints Tab */}
            <TabsContent value="docs" className="space-y-4">
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">API Endpoints</h2>
                <p className="text-sm text-muted-foreground mb-4">All endpoints require the <code className="bg-muted px-1 rounded">X-API-Key</code> header.</p>
                <div className="space-y-3">
                  {ENDPOINTS.map((ep, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${ep.method === "POST" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}>{ep.method}</span>
                      <code className="font-mono text-sm text-foreground flex-1">{ep.path}</code>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{ep.permission}</span>
                      <span className="text-xs text-muted-foreground hidden md:block max-w-[200px] truncate">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Rate Limits</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Default Per Minute", value: "100 req/min", icon: Clock },
                    { label: "Default Per Day", value: "10,000 req/day", icon: BarChart3 },
                    { label: "Error Response", value: "429 Too Many Requests", icon: Shield },
                  ].map(c => (
                    <div key={c.label} className="text-center p-4 rounded-xl bg-muted/30">
                      <c.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="text-lg font-bold text-foreground">{c.value}</p>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Code Examples Tab */}
            <TabsContent value="examples" className="space-y-4">
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-foreground">Code Examples</h2>
                </div>
                <div className="flex gap-2 mb-4">
                  {(["curl", "javascript", "python"] as const).map(lang => (
                    <button key={lang} onClick={() => setCodeTab(lang)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${codeTab === lang ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                      {lang === "curl" ? "cURL" : lang === "javascript" ? "JavaScript" : "Python"}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <pre className="bg-background/80 border border-border rounded-xl p-4 overflow-x-auto text-sm font-mono text-foreground whitespace-pre-wrap">
                    {CODE_EXAMPLES[codeTab as keyof typeof CODE_EXAMPLES]}
                  </pre>
                  <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => copyToClipboard(CODE_EXAMPLES[codeTab as keyof typeof CODE_EXAMPLES])}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Usage Tab */}
            <TabsContent value="usage" className="space-y-4">
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Usage Dashboard</h2>
                {keys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Generate an API key to see usage statistics.</p>
                ) : (
                  <div className="space-y-4">
                    {keys.filter(k => k.status === "active").map(k => (
                      <div key={k.id} className="p-4 rounded-xl bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-foreground">{k.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{k.key_prefix}...</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{k.usage_count || 0}</p>
                            <p className="text-xs text-muted-foreground">total requests</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-2 rounded-lg bg-background/50">
                            <p className="text-sm font-bold text-foreground">{k.rate_limit}/min</p>
                            <p className="text-xs text-muted-foreground">Rate Limit</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-background/50">
                            <p className="text-sm font-bold text-foreground">{k.daily_limit}/day</p>
                            <p className="text-xs text-muted-foreground">Daily Limit</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-background/50">
                            <p className="text-sm font-bold text-foreground">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}</p>
                            <p className="text-xs text-muted-foreground">Last Used</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Webhooks Tab */}
            <TabsContent value="webhooks" className="space-y-6">
              {/* Register new webhook */}
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Register Webhook</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Webhook URL (HTTPS only)</label>
                    <Input placeholder="https://your-server.com/webhook" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Events to subscribe</label>
                    <div className="flex flex-wrap gap-2">
                      {WEBHOOK_EVENTS.map(ev => (
                        <button key={ev} onClick={() => setSelectedEvents(prev => prev.includes(ev) ? prev.filter(x => x !== ev) : [...prev, ev])}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedEvents.includes(ev) ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-muted-foreground"}`}>
                          {ev}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleRegisterWebhook} disabled={registeringWh} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                    {registeringWh ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
                    Register Webhook
                  </Button>
                </div>
              </div>

              {/* Secret display */}
              {webhookSecret && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    <p className="text-green-400 font-bold text-sm">Webhook Secret — Copy now! It won't be shown again.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background/50 px-4 py-2 rounded-lg font-mono text-sm text-foreground break-all">{webhookSecret}</code>
                    <Button size="sm" variant="outline" onClick={() => { copyToClipboard(webhookSecret); }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Webhooks list */}
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Your Webhooks</h2>
                {!newKeyAgentId ? (
                  <p className="text-sm text-muted-foreground">Enter an Agent ID in the API Keys tab to view webhooks.</p>
                ) : webhooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No webhooks registered.</p>
                ) : (
                  <div className="space-y-4">
                    {webhooks.map(wh => (
                      <div key={wh.id} className="p-4 rounded-xl bg-muted/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-sm text-foreground truncate max-w-[300px]">{wh.url}</code>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${wh.status === "active" ? "bg-green-500/20 text-green-400" : wh.status === "paused" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                                {wh.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(wh.events || []).map(ev => (
                                <span key={ev} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">{ev}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button size="sm" variant="ghost" onClick={() => handleTestWebhook(wh.id)} title="Send test">
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleToggleWebhook(wh.id, wh.status === "active" ? "pause" : "resume")} title={wh.status === "active" ? "Pause" : "Resume"}>
                              {wh.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteWebhook(wh.id)} className="text-red-400 hover:text-red-300">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => fetchDeliveries(wh.id)} title="View deliveries">
                              <BarChart3 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Deliveries for this webhook */}
                        {deliveries[wh.id] && deliveries[wh.id].length > 0 && (
                          <div className="border-t border-border pt-3 mt-2">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Recent Deliveries</p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {deliveries[wh.id].slice(0, 10).map(d => (
                                <div key={d.id} className="flex items-center justify-between text-xs p-2 rounded bg-background/50">
                                  <span className="text-foreground">{d.event_type}</span>
                                  <span className={`font-mono ${d.response_status >= 200 && d.response_status < 300 ? "text-green-400" : "text-red-400"}`}>
                                    {d.response_status || "ERR"}
                                  </span>
                                  <span className="text-muted-foreground">{d.delivered_at ? new Date(d.delivered_at).toLocaleString() : "pending"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* HMAC Verification Guide */}
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-3">Verifying Webhook Signatures</h2>
                <p className="text-sm text-muted-foreground mb-3">Each delivery includes an <code className="bg-muted px-1 rounded">X-Webhook-Signature</code> header with format <code className="bg-muted px-1 rounded">sha256=HMAC</code>.</p>
                <pre className="bg-background/80 border border-border rounded-xl p-4 overflow-x-auto text-sm font-mono text-foreground whitespace-pre-wrap">{`const crypto = require('crypto');

function verifySignature(secret, body, signature) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </PageWrapper>
  );
};

export default Developer;
