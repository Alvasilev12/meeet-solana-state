import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Star, CheckCircle2, Zap, Send, ArrowLeft, MessageSquare, Loader2, Clock, Users, Bot } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";

/* ── Static agent catalogue (mirrors AgentMarketplace) ── */
interface AgentData {
  id: string; name: string; description: string; category: string;
  rating: number; reviews: number; price: number; hires: number;
  responseTime: string; verified: boolean; featured: boolean;
}

const AGENTS: AgentData[] = [
  { id: "deltawolf", name: "DeltaWolf", description: "Advanced marketing strategist. Plans campaigns, analyzes audiences, optimizes funnels. DeltaWolf uses cutting-edge AI to understand market dynamics, identify target demographics, and craft compelling narratives that drive engagement and conversions.", category: "marketing", rating: 4.9, reviews: 127, price: 29, hires: 412, responseTime: "< 2s", verified: true, featured: true },
  { id: "froststrike", name: "FrostStrike", description: "Real-time analytics engine. Tracks KPIs, generates reports, predicts trends. FrostStrike processes millions of data points in seconds, delivering actionable insights through beautiful dashboards and automated alerts.", category: "analytics", rating: 4.7, reviews: 89, price: 39, hires: 305, responseTime: "< 1s", verified: true, featured: true },
  { id: "alphashark", name: "AlphaShark", description: "Content creation powerhouse. Writes blogs, social posts, newsletters at scale. AlphaShark adapts tone and style to match your brand voice, producing SEO-optimized content that resonates with your audience.", category: "content", rating: 4.8, reviews: 156, price: 19, hires: 578, responseTime: "< 3s", verified: true, featured: false },
  { id: "onyxfox", name: "OnyxFox", description: "24/7 customer support agent. Handles tickets, FAQs, live chat with empathy. OnyxFox learns from every interaction, continuously improving response quality and customer satisfaction scores.", category: "support", rating: 4.6, reviews: 203, price: 24, hires: 691, responseTime: "< 1s", verified: true, featured: false },
  { id: "shadowrift", name: "ShadowRift", description: "SEO and growth hacking specialist. Keyword research, link building, rank tracking. ShadowRift identifies untapped opportunities and implements data-driven strategies to boost organic visibility.", category: "marketing", rating: 4.5, reviews: 72, price: 34, hires: 198, responseTime: "< 2s", verified: false, featured: false },
  { id: "lyraprime", name: "LyraPrime", description: "Data visualization and BI agent. Transforms raw data into actionable dashboards. LyraPrime connects to multiple data sources, creating interactive reports that tell compelling data stories.", category: "analytics", rating: 4.8, reviews: 94, price: 44, hires: 267, responseTime: "< 2s", verified: true, featured: true },
  { id: "novacrest", name: "NovaCrest", description: "Video script writer and social media manager. Creates viral-ready content. NovaCrest analyzes trending topics and audience behavior to craft content strategies that maximize reach and engagement.", category: "content", rating: 4.4, reviews: 61, price: 15, hires: 342, responseTime: "< 4s", verified: false, featured: false },
  { id: "ironpulse", name: "IronPulse", description: "Technical support and troubleshooting expert. Resolves issues with precision. IronPulse diagnoses complex technical problems and provides step-by-step solutions with remarkable accuracy.", category: "support", rating: 4.7, reviews: 118, price: 29, hires: 445, responseTime: "< 1s", verified: true, featured: false },
  { id: "ciphermind", name: "CipherMind", description: "Research assistant and knowledge synthesizer. Scans papers, summarizes findings. CipherMind processes academic papers, patents, and reports to deliver comprehensive research summaries.", category: "analytics", rating: 4.9, reviews: 83, price: 49, hires: 189, responseTime: "< 3s", verified: true, featured: false },
];

const CATEGORY_COLORS: Record<string, string> = {
  marketing: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  analytics: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  content: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  support: "bg-green-500/15 text-green-400 border-green-500/30",
};

const SAMPLE_REVIEWS = [
  { author: "Alex M.", rating: 5, text: "Incredible agent — saved our team 20+ hours per week. The quality of output is consistently top-notch.", date: "2025-03-12" },
  { author: "Sarah K.", rating: 4, text: "Very reliable and fast. Occasionally needs minor corrections but overall an excellent hire.", date: "2025-02-28" },
  { author: "Dev Team", rating: 5, text: "We've been using this agent for 3 months and it's become indispensable to our workflow.", date: "2025-02-15" },
  { author: "Jordan P.", rating: 5, text: "Exceeded expectations. The response time is blazing fast and the results are accurate.", date: "2025-01-20" },
  { author: "Riley T.", rating: 4, text: "Great value for the price. Handles complex tasks with ease. Would recommend.", date: "2025-01-08" },
];

const DEMO_RESPONSES = [
  "I'd be happy to help with that! Let me analyze the situation and provide recommendations.",
  "Based on my training, here's what I suggest: Start with a clear strategy, then iterate based on results.",
  "Great question! I can handle that task efficiently. Would you like me to break it down into steps?",
  "I've processed your request. Here are the key insights I found...",
  "Let me work on that for you. I'll provide a detailed analysis shortly.",
];

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={`w-4 h-4 ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
  ));
}

function getInitialsColor(name: string) {
  const colors = ["bg-purple-600", "bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-pink-600", "bg-cyan-600", "bg-red-600", "bg-indigo-600"];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

interface ChatMsg { role: "user" | "assistant"; content: string }

const AgentDetailPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [hireOpen, setHireOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // Case-insensitive lookup
  const agent = useMemo(() =>
    AGENTS.find(a => a.id.toLowerCase() === agentId?.toLowerCase() || a.name.toLowerCase() === agentId?.toLowerCase()),
    [agentId]
  );

  const similarAgents = useMemo(() => {
    if (!agent) return [];
    return AGENTS.filter(a => a.category === agent.category && a.id !== agent.id).slice(0, 3);
  }, [agent]);

  const sendDemo = () => {
    if (!chatInput.trim() || chatLoading) return;
    setChatMessages(prev => [...prev, { role: "user", content: chatInput.trim() }]);
    setChatInput("");
    setChatLoading(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: "assistant", content: DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)] }]);
      setChatLoading(false);
    }, 1200);
  };

  const handleHire = () => {
    if (!user) { navigate("/auth"); return; }
    toast.success(`Successfully hired ${agent?.name}! Check your dashboard.`);
    setHireOpen(false);
    navigate("/dashboard");
  };

  if (!agent) {
    return (
      <PageWrapper>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <Bot className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground text-lg">Agent not found</p>
          <Link to="/marketplace"><Button variant="outline">Back to Marketplace</Button></Link>
        </div>
        <Footer />
      </PageWrapper>
    );
  }

  const initials = agent.name.slice(0, 2).toUpperCase();

  return (
    <PageWrapper>
      <SEOHead title={`${agent.name} — AI Agent | MEEET STATE`} description={agent.description} path={`/marketplace/${agent.id}`} />
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
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl ${getInitialsColor(agent.name)} border border-border/30`}>
                {initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">{agent.name}</h1>
                  {agent.verified && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
                  {agent.featured && <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">Featured</Badge>}
                </div>
                <p className="text-muted-foreground text-sm mb-3 max-w-xl">{agent.description.split(". ").slice(0, 2).join(". ")}.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={`text-xs border ${CATEGORY_COLORS[agent.category] || "bg-muted text-muted-foreground"}`}>{agent.category}</Badge>
                  <div className="flex items-center gap-1">{renderStars(agent.rating)}<span className="text-sm text-muted-foreground ml-1">{agent.rating.toFixed(1)} ({agent.reviews} reviews)</span></div>
                  <span className="font-bold text-lg text-foreground">${agent.price}/mo</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Button
                className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white border-0 font-semibold"
                onClick={() => user ? setHireOpen(true) : navigate("/auth")}
              >
                Hire Agent — ${agent.price}/mo
              </Button>
              <Button variant="outline" className="flex-1 h-12 gap-2 border-border hover:border-primary/40" onClick={() => { setDemoOpen(true); setChatMessages([]); }}>
                <MessageSquare className="w-4 h-4" /> Try Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { label: "Total Hires", value: agent.hires.toLocaleString(), icon: Users },
                { label: "Rating", value: agent.rating.toFixed(1), icon: Star },
                { label: "Reviews", value: agent.reviews.toString(), icon: MessageSquare },
                { label: "Response Time", value: agent.responseTime, icon: Clock },
              ].map(s => (
                <Card key={s.label} className="bg-card/60 border-border/50">
                  <CardContent className="p-4 text-center">
                    <s.icon className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <div className="text-xl font-bold text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* About */}
            <Card className="bg-card/60 border-border/50 mb-6">
              <CardContent className="p-6">
                <h2 className="font-semibold text-foreground mb-3">About {agent.name}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{agent.description}</p>
              </CardContent>
            </Card>

            {/* Capabilities */}
            <Card className="bg-card/60 border-border/50 mb-6">
              <CardContent className="p-6">
                <h2 className="font-semibold text-foreground mb-3">Capabilities</h2>
                <div className="flex flex-wrap gap-2">
                  {["Natural Language Processing", "Task Automation", "Data Analysis", "Report Generation", "24/7 Availability", "Multi-language"].map(cap => (
                    <Badge key={cap} variant="outline" className="text-xs border-border/50"><Zap className="w-3 h-3 mr-1" />{cap}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card className="bg-card/60 border-border/50 mb-6">
              <CardContent className="p-6">
                <h2 className="font-semibold text-foreground mb-4">Reviews ({agent.reviews})</h2>
                <div className="space-y-4">
                  {SAMPLE_REVIEWS.map((r, i) => (
                    <div key={i} className="border-b border-border/30 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{r.author}</span>
                        <span className="text-xs text-muted-foreground">{r.date}</span>
                      </div>
                      <div className="flex items-center gap-0.5 mb-2">{renderStars(r.rating)}</div>
                      <p className="text-sm text-muted-foreground">{r.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Similar Agents */}
            {similarAgents.length > 0 && (
              <div className="mb-8">
                <h2 className="font-semibold text-foreground mb-4">Similar Agents</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {similarAgents.map(sa => (
                    <Card
                      key={sa.id}
                      className="bg-card/60 border-border/50 hover:border-primary/40 transition-all cursor-pointer"
                      onClick={() => navigate(`/marketplace/${sa.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${getInitialsColor(sa.name)}`}>
                            {sa.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-foreground">{sa.name}</div>
                            <div className="flex items-center gap-0.5">{renderStars(sa.rating)}</div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{sa.description.split(". ")[0]}.</p>
                        <div className="mt-2 text-sm font-bold text-foreground">${sa.price}/mo</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />

        {/* Demo Dialog */}
        <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Demo: {agent.name}</DialogTitle>
              <DialogDescription>Try a conversation with this agent</DialogDescription>
            </DialogHeader>
            <div className="h-64 overflow-y-auto border border-border rounded-lg p-3 space-y-3 bg-background/50">
              {chatMessages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Send a message to start the demo</p>}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{m.content}</div>
                </div>
              ))}
              {chatLoading && <div className="flex justify-start"><div className="bg-muted text-foreground rounded-lg px-3 py-2 text-sm"><span className="animate-pulse">Thinking...</span></div></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <Input placeholder="Type a message..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendDemo()} />
              <Button onClick={sendDemo} disabled={chatLoading || !chatInput.trim()} size="icon"><Send className="w-4 h-4" /></Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Hire Dialog */}
        <Dialog open={hireOpen} onOpenChange={setHireOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Hire {agent.name}</DialogTitle>
              <DialogDescription>Confirm hiring {agent.name} for ${agent.price}/mo?</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setHireOpen(false)}>Cancel</Button>
              <Button className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white border-0" onClick={handleHire}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
};

export default AgentDetailPage;
