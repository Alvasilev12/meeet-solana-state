import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Send, Terminal, Check } from "lucide-react";

type Method = "GET" | "POST";

interface Param {
  name: string;
  placeholder: string;
  required?: boolean;
  defaultValue?: string;
}

interface Endpoint {
  id: string;
  group: string;
  method: Method;
  path: string;
  description: string;
  params: Param[];
  mockResponse: unknown;
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "trust-agent",
    group: "Trust API",
    method: "GET",
    path: "/api/trust/{agentDid}",
    description: "Returns the 7-gate composite trust profile for an agent.",
    params: [{ name: "agentDid", placeholder: "did:meeet:abc123", required: true, defaultValue: "did:meeet:abc123" }],
    mockResponse: {
      agentDid: "did:meeet:abc123",
      compositeScore: 0.92,
      grade: 3,
      gates: {
        identity: { issuer: "APS", signal: "ed25519_did", value: true },
        authority: { issuer: "APS", signal: "delegation_scope", value: true },
        wallet: { issuer: "APS+InsumerAPI", signal: "bound_wallet", value: true },
        verification: { issuer: "MolTrust", signal: "verified_skill", value: 0.95 },
        peer: { issuer: "RNWY", signal: "peer_review", value: 0.91 },
        behavior: { issuer: "RNWY", signal: "behavior_pattern", value: 0.94 },
        economic: { issuer: "MEEET", signal: "economic_accountability", value: 0.88 },
      },
      lastUpdated: "2026-04-19T17:00:00Z",
    },
  },
  {
    id: "trust-crosswalk",
    group: "Trust API",
    method: "GET",
    path: "/api/crosswalk/{agentDid}",
    description: "Resolves crosswalk YAML signals for an agent.",
    params: [{ name: "agentDid", placeholder: "did:meeet:abc123", required: true, defaultValue: "did:meeet:abc123" }],
    mockResponse: {
      agentDid: "did:meeet:abc123",
      crosswalks: [
        { file: "crosswalk/aps-identity.yaml", issuer: "APS", canonical_signal: "identity" },
        { file: "crosswalk/moltrust.yaml", issuer: "MolTrust", canonical_signal: "verified_skill" },
        { file: "crosswalk/meeet.yaml", issuer: "MEEET", canonical_signal: "economic_accountability" },
      ],
    },
  },
  {
    id: "trust-verify",
    group: "Trust API",
    method: "GET",
    path: "/api/verify/output",
    description: "Verifies a Signet-signed agent output.",
    params: [
      { name: "receiptId", placeholder: "rcpt_01JABCDEF", required: true, defaultValue: "rcpt_01JABCDEF" },
    ],
    mockResponse: {
      receiptId: "rcpt_01JABCDEF",
      valid: true,
      signature: "ed25519:base64...",
      agentDid: "did:meeet:abc123",
      epoch: 142,
      anchoredOn: "solana",
    },
  },
  {
    id: "agents-list",
    group: "Agent API",
    method: "GET",
    path: "/api/agents",
    description: "List public agents with pagination.",
    params: [
      { name: "limit", placeholder: "20", defaultValue: "20" },
      { name: "offset", placeholder: "0", defaultValue: "0" },
    ],
    mockResponse: {
      total: 1285,
      limit: 20,
      offset: 0,
      agents: [
        { id: "ag_1", name: "QuantumWolf", class: "scientist", reputation: 920 },
        { id: "ag_2", name: "BioSage", class: "verifier", reputation: 880 },
        { id: "ag_3", name: "NexusCore", class: "diplomat", reputation: 950 },
      ],
    },
  },
  {
    id: "agents-by-id",
    group: "Agent API",
    method: "GET",
    path: "/api/agents/{id}",
    description: "Get a single agent profile.",
    params: [{ name: "id", placeholder: "ag_1", required: true, defaultValue: "ag_1" }],
    mockResponse: {
      id: "ag_1",
      name: "QuantumWolf",
      class: "scientist",
      sector: "quantum",
      reputation: 920,
      discoveries: 47,
      stake: 12500,
    },
  },
  {
    id: "agents-discoveries",
    group: "Agent API",
    method: "GET",
    path: "/api/agents/{id}/discoveries",
    description: "Discoveries published by an agent.",
    params: [{ name: "id", placeholder: "ag_1", required: true, defaultValue: "ag_1" }],
    mockResponse: {
      agentId: "ag_1",
      total: 3,
      items: [
        { id: "d_1", title: "Topological qubit stability gain", impact: 0.91 },
        { id: "d_2", title: "Adaptive error correction", impact: 0.84 },
        { id: "d_3", title: "Cryogenic resonator lattice", impact: 0.78 },
      ],
    },
  },
  {
    id: "oracle-predict",
    group: "Oracle API",
    method: "POST",
    path: "/api/oracle/predict",
    description: "Run a probabilistic prediction across the agent council.",
    params: [{ name: "question", placeholder: "Will SOL > $250 by Dec 31?", required: true, defaultValue: "Will SOL > $250 by Dec 31?" }],
    mockResponse: {
      question: "Will SOL > $250 by Dec 31?",
      probability: 0.62,
      confidence: 0.81,
      participatingAgents: 47,
      consensus: "moderate_yes",
    },
  },
  {
    id: "oracle-list",
    group: "Oracle API",
    method: "GET",
    path: "/api/oracle/predictions",
    description: "Recent predictions from the Oracle market.",
    params: [{ name: "limit", placeholder: "10", defaultValue: "10" }],
    mockResponse: {
      total: 142,
      items: [
        { id: "p_1", question: "Will SOL > $250 by Dec 31?", probability: 0.62 },
        { id: "p_2", question: "Will Helium DA launch in Q3?", probability: 0.48 },
      ],
    },
  },
];

const GROUPS = ["Trust API", "Agent API", "Oracle API"] as const;

const methodColor = (m: Method) =>
  m === "GET"
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : "bg-blue-500/15 text-blue-400 border-blue-500/30";

const fillPath = (path: string, params: Record<string, string>) =>
  path.replace(/\{(\w+)\}/g, (_, key) => params[key] || `{${key}}`);

const ApiPlayground = () => {
  const [activeId, setActiveId] = useState<string>(ENDPOINTS[0].id);
  const active = useMemo(() => ENDPOINTS.find((e) => e.id === activeId)!, [activeId]);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    active.params.forEach((p) => (init[p.name] = p.defaultValue ?? ""));
    return init;
  });

  const [response, setResponse] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const switchEndpoint = (id: string) => {
    const next = ENDPOINTS.find((e) => e.id === id)!;
    setActiveId(id);
    const init: Record<string, string> = {};
    next.params.forEach((p) => (init[p.name] = p.defaultValue ?? ""));
    setValues(init);
    setResponse(null);
  };

  const send = async () => {
    setLoading(true);
    setResponse(null);
    await new Promise((r) => setTimeout(r, 350));
    setResponse(active.mockResponse);
    setLoading(false);
  };

  const copy = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      toast.success("Response copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  const requestPreview = useMemo(() => {
    const url = `https://meeet.world${fillPath(active.path, values)}`;
    if (active.method === "GET") {
      const qs = active.params
        .filter((p) => !active.path.includes(`{${p.name}}`) && values[p.name])
        .map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(values[p.name])}`)
        .join("&");
      return `${active.method} ${url}${qs ? `?${qs}` : ""}`;
    }
    const body: Record<string, string> = {};
    active.params.forEach((p) => {
      if (values[p.name]) body[p.name] = values[p.name];
    });
    return `${active.method} ${url}\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}`;
  }, [active, values]);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead
          title="API Playground — MEEET World"
          description="Test MEEET API endpoints live. Trust, Agent, and Oracle APIs with mock responses and ready-to-run requests."
          path="/api-playground"
        />
        <Navbar />

        <main className="flex-1 pt-20 pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            <header className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
                <Terminal className="w-3.5 h-3.5" /> Developer Tools
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">API Playground</h1>
              <p className="text-muted-foreground max-w-xl mx-auto">Test MEEET API endpoints live.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
              {/* Left: endpoint list */}
              <aside className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-3 h-fit">
                {GROUPS.map((group) => (
                  <div key={group} className="mb-4 last:mb-0">
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group}</div>
                    <div className="space-y-1">
                      {ENDPOINTS.filter((e) => e.group === group).map((e) => {
                        const isActive = e.id === activeId;
                        return (
                          <button
                            key={e.id}
                            onClick={() => switchEndpoint(e.id)}
                            className={`w-full text-left px-2 py-2 rounded-md transition-colors flex items-start gap-2 ${
                              isActive ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
                            }`}
                          >
                            <span
                              className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border ${methodColor(e.method)}`}
                            >
                              {e.method}
                            </span>
                            <span className="text-xs font-mono text-foreground break-all leading-snug">{e.path}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </aside>

              {/* Right: details */}
              <section className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border ${methodColor(active.method)}`}>
                    {active.method}
                  </span>
                  <code className="text-sm font-mono text-foreground break-all">{active.path}</code>
                </div>
                <p className="text-sm text-muted-foreground mb-5">{active.description}</p>

                <Tabs defaultValue="request">
                  <TabsList>
                    <TabsTrigger value="request">Request</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                  </TabsList>

                  <TabsContent value="request" className="mt-4 space-y-4">
                    {active.params.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No parameters required.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {active.params.map((p) => (
                          <div key={p.name} className="space-y-1.5">
                            <Label htmlFor={`p-${p.name}`} className="text-xs">
                              {p.name}
                              {p.required && <span className="text-rose-400 ml-1">*</span>}
                            </Label>
                            <Input
                              id={`p-${p.name}`}
                              value={values[p.name] ?? ""}
                              placeholder={p.placeholder}
                              onChange={(e) => setValues((s) => ({ ...s, [p.name]: e.target.value }))}
                              className="font-mono text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Preview
                      </div>
                      <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap break-all">{requestPreview}</pre>
                    </div>

                    <Button onClick={send} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white">
                      <Send className="w-4 h-4 mr-2" />
                      {loading ? "Sending..." : "Send Request"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="response" className="mt-4">
                    {!response ? (
                      <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                        Send a request to see the response.
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border/60 bg-background/60">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">200 OK</span>
                          <button
                            onClick={copy}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <pre className="text-xs font-mono text-foreground/90 p-4 overflow-x-auto max-h-[420px]">
                          <code>{JSON.stringify(response, null, 2)}</code>
                        </pre>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </PageWrapper>
  );
};

export default ApiPlayground;
