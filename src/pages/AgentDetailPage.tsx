import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Star, CheckCircle2, Users, Zap, Send, Globe, Code, ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAgentAvatarUrl } from "@/lib/agent-avatar";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";

const INTEGRATION_ICONS: Record<string, { icon: typeof Send; label: string }> = {
  telegram: { icon: Send, label: "Telegram" },
  web: { icon: Globe, label: "Web" },
  api: { icon: Code, label: "API" },
};

const CATEGORY_COLORS: Record<string, string> = {
  marketing: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  analytics: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  content: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  support: "bg-green-500/15 text-green-400 border-green-500/30",
  finance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  legal: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  hr: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  development: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  research: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  custom: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

function formatPrice(type: string, amount: number) {
  if (type === "free") return "Free";
  if (type === "subscription") return `$${amount}/mo`;
  if (type === "per_task") return `$${amount}/task`;
  return `$${amount}`;
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={`w-4 h-4 ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
  ));
}

interface ChatMsg { role: "user" | "assistant"; content: string }

const DEMO_RESPONSES = [
  "I'd be happy to help with that! Let me analyze the situation and provide recommendations.",
  "Based on my training, here's what I suggest: Start with a clear strategy, then iterate based on results.",
  "Great question! I can handle that task efficiently. Would you like me to break it down into steps?",
  "I've processed your request. Here are the key insights I found...",
  "Let me work on that for you. I'll provide a detailed analysis shortly.",
];

const AgentDetailPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [hireOpen, setHireOpen] = useState(false);
  const [hiring, setHiring] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["marketplace-listing", agentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("hire_listings")
        .select("*, agents(id, name, class, level)")
        .eq("id", agentId!)
        .maybeSingle();
      return data as any;
    },
    enabled: !!agentId,
  });

  const sendDemo = () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    setTimeout(() => {
      const response = DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
      setChatMessages(prev => [...prev, { role: "assistant", content: response }]);
      setChatLoading(false);
    }, 1200);
  };

  const handleHire = async () => {
    if (!user) { navigate("/auth"); return; }
    setHiring(true);
    try {
      const { error } = await supabase.from("hire_hires").insert({
        listing_id: listing.id,
        user_id: user.id,
        status: "active",
      });
      if (error) throw error;
      toast.success(`Successfully hired ${listing.agents?.name || "Agent"}!`);
      setHireOpen(false);
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Failed to hire agent");
    } finally {
      setHiring(false);
    }
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  if (!listing) {
    return (
      <PageWrapper>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Agent not found</p>
          <Link to="/marketplace"><Button variant="outline">Back to Marketplace</Button></Link>
        </div>
      </PageWrapper>
    );
  }

  const agentName = listing.agents?.name || "Agent";

  return (
    <PageWrapper>
      <SEOHead title={`${agentName} — AI Agent | MEEET`} description={listing.short_description} path={`/marketplace/${agentId}`} />
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <main className="flex-1 pt-20 pb-16">
          <div className="container max-w-4xl mx-auto px-4">
            {/* Back */}
            <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to Marketplace
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start gap-5 mb-8">
              <img src={getAgentAvatarUrl(listing.agent_id, 80)} alt={agentName} className="w-20 h-20 rounded-2xl border border-border bg-muted/30" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">{listing.title}</h1>
                  {listing.is_verified && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
                </div>
                <p className="text-muted-foreground text-sm mb-3">{listing.short_description}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={`text-xs border ${CATEGORY_COLORS[listing.category] || ""}`}>{listing.category}</Badge>
                  <div className="flex items-center gap-1">{renderStars(listing.rating)}<span className="text-sm text-muted-foreground ml-1">{listing.rating?.toFixed(1)} ({listing.total_reviews} reviews)</span></div>
                  <span className={`font-bold text-lg ${listing.price_type === "free" ? "text-emerald-400" : "text-foreground"}`}>
                    {formatPrice(listing.price_type, listing.price_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Button
                className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 font-semibold"
                onClick={() => user ? setHireOpen(true) : navigate("/auth")}
              >
                Hire Agent
              </Button>
              {listing.demo_available && (
                <Button variant="outline" className="flex-1 h-12 gap-2" onClick={() => { setDemoOpen(true); setChatMessages([]); }}>
                  <MessageSquare className="w-4 h-4" /> Try Demo
                </Button>
              )}
            </div>

            {/* Description */}
            <Card className="bg-card/50 border-border mb-6">
              <CardContent className="p-6">
                <h2 className="font-semibold text-foreground mb-3">About</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{listing.total_hires?.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Hires</div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="text-2xl font-bold text-foreground">{listing.rating?.toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{listing.total_reviews} reviews</div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{listing.avg_response_time}</div>
                  <div className="text-xs text-muted-foreground">Response Time</div>
                </CardContent>
              </Card>
            </div>

            {/* Capabilities */}
            {listing.capabilities?.length > 0 && (
              <Card className="bg-card/50 border-border mb-6">
                <CardContent className="p-6">
                  <h2 className="font-semibold text-foreground mb-3">Capabilities</h2>
                  <div className="flex flex-wrap gap-2">
                    {listing.capabilities.map((cap: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs"><Zap className="w-3 h-3 mr-1" />{cap}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Integrations */}
            {listing.integrations?.length > 0 && (
              <Card className="bg-card/50 border-border mb-6">
                <CardContent className="p-6">
                  <h2 className="font-semibold text-foreground mb-3">Integrations</h2>
                  <div className="flex flex-wrap gap-3">
                    {listing.integrations.map((int: string) => {
                      const info = INTEGRATION_ICONS[int];
                      if (!info) return null;
                      const Icon = info.icon;
                      return (
                        <div key={int} className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg">
                          <Icon className="w-4 h-4" />{info.label}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {listing.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-8">
                {listing.tags.map((tag: string) => (
                  <span key={tag} className="text-xs bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </main>
        <Footer />

        {/* Demo Dialog */}
        <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Demo: {agentName}</DialogTitle>
              <DialogDescription>Try a conversation with this agent</DialogDescription>
            </DialogHeader>
            <div className="h-64 overflow-y-auto border border-border rounded-lg p-3 space-y-3 bg-background/50">
              {chatMessages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Send a message to start the demo</p>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted text-foreground rounded-lg px-3 py-2 text-sm">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendDemo()}
              />
              <Button onClick={sendDemo} disabled={chatLoading || !chatInput.trim()} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Hire Confirmation Dialog */}
        <Dialog open={hireOpen} onOpenChange={setHireOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Hire {agentName}</DialogTitle>
              <DialogDescription>
                Hire {agentName} for {formatPrice(listing.price_type, listing.price_amount)}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setHireOpen(false)}>Cancel</Button>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                onClick={handleHire}
                disabled={hiring}
              >
                {hiring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
};

export default AgentDetailPage;
