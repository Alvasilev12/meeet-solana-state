import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, Search, Bot, Wand2, CheckCircle2, ChevronRight, ChevronLeft,
  Sparkles, Brain, Palette, Zap, Send, User, ArrowRight, Rocket,
  Save, Globe, Code, BarChart3, Headphones, PenTool, Target, Scale,
  Megaphone, Users, MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import AgentCreationWizard from "@/components/AgentCreationWizard";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  base_system_prompt: string;
  default_personality: Record<string, number> | null;
  suggested_skills: string[];
  difficulty: string;
  popularity: number;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const ICON_MAP: Record<string, typeof Bot> = {
  bot: Bot, headphones: Headphones, "pen-tool": PenTool, target: Target,
  "bar-chart-3": BarChart3, scale: Scale, megaphone: Megaphone, users: Users,
  sparkles: Sparkles,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  advanced: "bg-red-500/15 text-red-400 border-red-500/30",
};

const SKILLS = [
  { key: "web-search", label: "Web Search", icon: Globe },
  { key: "data-analysis", label: "Data Analysis", icon: BarChart3 },
  { key: "code-generation", label: "Code Generation", icon: Code },
  { key: "image-analysis", label: "Image Analysis", icon: Palette },
  { key: "calendar-management", label: "Calendar", icon: CheckCircle2 },
  { key: "email-drafting", label: "Email Drafting", icon: Send },
  { key: "translation", label: "Translation", icon: Globe },
  { key: "document-summarization", label: "Summarization", icon: Brain },
  { key: "math-calculations", label: "Math", icon: Zap },
];

const AVATARS = [
  "🤖", "🧠", "⚡", "🔮", "🎯", "🛡️", "🚀", "💎", "🌟", "🦾",
];

const OCEAN_LABELS: { key: string; label: string; low: string; high: string }[] = [
  { key: "openness", label: "Openness", low: "Conservative", high: "Creative" },
  { key: "conscientiousness", label: "Conscientiousness", low: "Flexible", high: "Structured" },
  { key: "extraversion", label: "Extraversion", low: "Reserved", high: "Outgoing" },
  { key: "agreeableness", label: "Agreeableness", low: "Direct", high: "Diplomatic" },
  { key: "neuroticism", label: "Neuroticism", low: "Calm", high: "Sensitive" },
];

const AgentStudio = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Step
  const [step, setStep] = useState(1);

  // Step 1
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateSearch, setTemplateSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Step 2 - Identity
  const [agentName, setAgentName] = useState("");
  const [agentAvatar, setAgentAvatar] = useState("🤖");
  const [agentDescription, setAgentDescription] = useState("");

  // Step 2 - Brain
  const [systemPrompt, setSystemPrompt] = useState("");
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);

  // Step 2 - Personality
  const [personality, setPersonality] = useState<Record<string, number>>({
    openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5,
  });
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("ru");

  // Step 2 - Skills
  const [skills, setSkills] = useState<string[]>([]);

  // Step 3 - Chat
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("agent_templates").select("*").order("popularity", { ascending: false }).then(({ data }) => {
      if (data) setTemplates(data as unknown as Template[]);
      setLoadingTemplates(false);
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const filteredTemplates = templateSearch.trim()
    ? templates.filter((t) => t.name.toLowerCase().includes(templateSearch.toLowerCase()) || t.description.toLowerCase().includes(templateSearch.toLowerCase()))
    : templates;

  const selectTemplate = (t: Template | null) => {
    setSelectedTemplate(t);
    if (t) {
      setAgentName(t.name);
      setSystemPrompt(t.base_system_prompt);
      setSkills(t.suggested_skills || []);
      if (t.default_personality) setPersonality(t.default_personality as Record<string, number>);
    } else {
      setAgentName("");
      setSystemPrompt("");
      setSkills([]);
      setPersonality({ openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 });
    }
    setStep(2);
  };

  const toggleSkill = (key: string) => {
    setSkills((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]);
  };

  const buildFullPrompt = () => {
    let prompt = systemPrompt;
    if (knowledgeBase.trim()) prompt += `\n\nKnowledge Base:\n${knowledgeBase}`;
    const toneMap: Record<string, string> = {
      professional: "Maintain a professional and polished tone.",
      friendly: "Be warm, friendly, and approachable.",
      casual: "Use casual, conversational language.",
      formal: "Use formal, business-appropriate language.",
      witty: "Be clever and witty while remaining helpful.",
    };
    prompt += `\n\nTone: ${toneMap[tone] || ""}`;
    prompt += `\nRespond in ${language === "ru" ? "Russian" : "English"}.`;
    return prompt;
  };

  const sendTestMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    if (!user) { toast.error("Sign in to test your agent"); navigate("/auth"); return; }

    const userMsg: ChatMsg = { role: "user", content: chatInput.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    let assistantContent = "";
    const allMessages = [...chatMessages, userMsg];

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-custom-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            system_prompt: buildFullPrompt(),
            temperature,
            max_tokens: maxTokens,
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";

      const upsert = (chunk: string) => {
        assistantContent += chunk;
        const content = assistantContent;
        setChatMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { role: "assistant", content }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to get response");
      setChatMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Error: " + (e.message || "Unknown error") }]);
    } finally {
      setChatLoading(false);
    }
  };

  const saveAgent = async (status: "draft" | "active") => {
    if (!user) { navigate("/auth"); return; }
    if (!agentName.trim()) { toast.error("Give your agent a name"); return; }
    if (!systemPrompt.trim()) { toast.error("Add a system prompt"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("custom_agents").insert({
        creator_id: user.id,
        template_id: selectedTemplate?.id || null,
        name: agentName,
        avatar_url: agentAvatar,
        system_prompt: buildFullPrompt(),
        personality,
        skills,
        knowledge_base: knowledgeBase || null,
        tone,
        language,
        max_tokens: maxTokens,
        temperature,
        status,
        is_published: status === "active",
      });
      if (error) throw error;
      toast.success(status === "draft" ? "Agent saved as draft!" : "Agent deployed! 🚀");
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const [showWizard, setShowWizard] = useState(false);
  const stepLabels = ["Choose Template", "Configure", "Test & Deploy"];

  return (
    <PageWrapper>
      <SEOHead title="Agent Studio — No-Code AI Builder | MEEET STATE" description="Create custom AI agents without code. Choose a template, configure personality and skills, then deploy." path="/agent-studio" />
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Wand2 className="w-7 h-7 text-purple-400" />
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Agent Studio</h1>
            </div>
            <Button
              onClick={() => setShowWizard(!showWizard)}
              className={showWizard ? "bg-muted text-muted-foreground" : "bg-gradient-to-r from-purple-600 to-pink-500 text-white border-0"}
            >
              {showWizard ? "Advanced Builder" : "✨ Quick Create"}
            </Button>
          </div>

          {showWizard ? (
            <div className="max-w-3xl mx-auto">
              <AgentCreationWizard onClose={() => setShowWizard(false)} />
            </div>
          ) : (
          <>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 mb-8 max-w-lg">
            {stepLabels.map((label, i) => {
              const num = i + 1;
              const active = step === num;
              const done = step > num;
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => { if (done) setStep(num); }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" :
                      done ? "bg-emerald-500/20 text-emerald-400 cursor-pointer" :
                      "bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : num}
                  </button>
                  <span className={`text-xs hidden sm:inline ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
                  {i < 2 && <div className={`flex-1 h-0.5 ${done ? "bg-emerald-500/40" : "bg-border/50"}`} />}
                </div>
              );
            })}
          </div>

          {/* ═══ STEP 1: Templates ═══ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search templates..." className="pl-10" value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} />
              </div>

              {loadingTemplates ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Start from Scratch */}
                  <Card
                    className="border-dashed border-2 border-primary/30 hover:border-primary/60 transition-all cursor-pointer group bg-primary/5"
                    onClick={() => selectTemplate(null)}
                  >
                    <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full min-h-[180px] gap-3">
                      <Sparkles className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                      <div>
                        <h3 className="font-semibold text-foreground">Start from Scratch</h3>
                        <p className="text-xs text-muted-foreground mt-1">Build a fully custom agent</p>
                      </div>
                    </CardContent>
                  </Card>

                  {filteredTemplates.map((t) => {
                    const IconComp = ICON_MAP[t.icon] || Bot;
                    return (
                      <Card
                        key={t.id}
                        className="border-border/50 hover:border-primary/40 transition-all cursor-pointer group hover:shadow-lg hover:shadow-primary/5"
                        onClick={() => selectTemplate(t)}
                      >
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <IconComp className="w-5 h-5 text-primary" />
                            </div>
                            <Badge className={`text-[10px] border ${DIFFICULTY_COLORS[t.difficulty] || ""}`}>
                              {t.difficulty}
                            </Badge>
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground text-sm">{t.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{t.popularity.toLocaleString()} uses</span>
                            <span className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform">
                              Use template <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2: Configure ═══ */}
          {step === 2 && (
            <div className="space-y-4">
              <Tabs defaultValue="identity" className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-lg">
                  <TabsTrigger value="identity" className="gap-1 text-xs"><User className="w-3.5 h-3.5" />Identity</TabsTrigger>
                  <TabsTrigger value="brain" className="gap-1 text-xs"><Brain className="w-3.5 h-3.5" />Brain</TabsTrigger>
                  <TabsTrigger value="personality" className="gap-1 text-xs"><Palette className="w-3.5 h-3.5" />Personality</TabsTrigger>
                  <TabsTrigger value="skills" className="gap-1 text-xs"><Zap className="w-3.5 h-3.5" />Skills</TabsTrigger>
                </TabsList>

                {/* Identity Tab */}
                <TabsContent value="identity" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Agent Name</label>
                        <Input placeholder="e.g. Support Bot, Marketing Guru..." value={agentName} onChange={(e) => setAgentName(e.target.value)} maxLength={60} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Short Description</label>
                        <Textarea placeholder="What does your agent do? (1-2 sentences)" value={agentDescription} onChange={(e) => setAgentDescription(e.target.value)} maxLength={200} rows={3} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Avatar</label>
                      <div className="grid grid-cols-5 gap-2">
                        {AVATARS.map((av) => (
                          <button
                            key={av}
                            onClick={() => setAgentAvatar(av)}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all border ${
                              agentAvatar === av ? "border-primary bg-primary/10 scale-110 shadow-lg shadow-primary/20" : "border-border/50 bg-muted/20 hover:border-border"
                            }`}
                          >
                            {av}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Brain Tab */}
                <TabsContent value="brain" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">System Prompt</label>
                    <Textarea
                      placeholder="Define your agent's behavior, expertise, and rules. E.g.: 'You are a customer support agent for an e-commerce store. Answer questions about orders, returns, and products...'"
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Knowledge Base</label>
                    <Textarea
                      placeholder="Paste your company info, FAQ, product details, policies here. The agent will use this as context."
                      value={knowledgeBase}
                      onChange={(e) => setKnowledgeBase(e.target.value)}
                      rows={4}
                      className="text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Temperature</span>
                        <span className="text-muted-foreground">{temperature.toFixed(1)}</span>
                      </div>
                      <Slider value={[temperature * 100]} onValueChange={([v]) => setTemperature(v / 100)} min={10} max={100} step={5} />
                      <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                        <span>🎯 Precise</span><span>🎨 Creative</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Max Response Length</span>
                        <span className="text-muted-foreground">{maxTokens}</span>
                      </div>
                      <Slider value={[maxTokens]} onValueChange={([v]) => setMaxTokens(v)} min={100} max={8000} step={100} />
                      <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                        <span>Short</span><span>Long</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Personality Tab */}
                <TabsContent value="personality" className="space-y-5 mt-4">
                  {OCEAN_LABELS.map((trait) => (
                    <div key={trait.key}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium">{trait.label}</span>
                        <span className="text-muted-foreground">{((personality[trait.key] ?? 0.5) * 100).toFixed(0)}%</span>
                      </div>
                      <Slider
                        value={[(personality[trait.key] ?? 0.5) * 100]}
                        onValueChange={([v]) => setPersonality((p) => ({ ...p, [trait.key]: v / 100 }))}
                        min={0} max={100} step={5}
                      />
                      <div className="flex justify-between text-[11px] text-muted-foreground mt-0.5">
                        <span>{trait.low}</span><span>{trait.high}</span>
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Tone</label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                          <SelectItem value="witty">Witty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Language</label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ru">🇷🇺 Russian</SelectItem>
                          <SelectItem value="en">🇺🇸 English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Skills Tab */}
                <TabsContent value="skills" className="mt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SKILLS.map((skill) => {
                      const active = skills.includes(skill.key);
                      const Icon = skill.icon;
                      return (
                        <button
                          key={skill.key}
                          onClick={() => toggleSkill(skill.key)}
                          className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                            active
                              ? "border-primary/50 bg-primary/10 text-foreground"
                              : "border-border/50 bg-muted/10 text-muted-foreground hover:border-border hover:text-foreground"
                          }`}
                        >
                          <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary" : ""}`} />
                          <span className="text-sm font-medium">{skill.label}</span>
                          {active && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
                <Button onClick={() => { if (!agentName.trim()) { toast.error("Name your agent first"); return; } setStep(3); }} className="ml-auto">
                  Test & Deploy <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Test & Deploy ═══ */}
          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chat Preview */}
              <div className="order-2 lg:order-1">
                <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/40">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border/30 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">{agentAvatar}</div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{agentName || "Your Agent"}</h3>
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Online
                      </span>
                    </div>
                    <Badge className="ml-auto text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/30">Test Mode</Badge>
                  </div>

                  {/* Chat Messages */}
                  <div className="h-[400px] overflow-y-auto p-4 space-y-3">
                    {chatMessages.length === 0 && (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        <div className="text-center space-y-2">
                          <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
                          <p>Send a message to test your agent</p>
                        </div>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted/40 text-foreground rounded-bl-md"
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted/40 rounded-2xl rounded-bl-md px-4 py-2.5">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="p-3 border-t border-border/30">
                    <form onSubmit={(e) => { e.preventDefault(); sendTestMessage(); }} className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={chatLoading}
                      />
                      <Button type="submit" size="icon" disabled={chatLoading || !chatInput.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Deploy Panel */}
              <div className="order-1 lg:order-2 space-y-4">
                <Card className="bg-card/60 border-border/50">
                  <CardContent className="p-5 space-y-4">
                    <h3 className="font-semibold text-lg text-foreground">Agent Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{agentName}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Template</span><span>{selectedTemplate?.name || "Custom"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tone</span><span className="capitalize">{tone}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Language</span><span>{language === "ru" ? "Russian" : "English"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Temperature</span><span>{temperature.toFixed(1)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Skills</span><span>{skills.length} selected</span></div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <Button
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 h-12 text-base"
                    onClick={() => saveAgent("active")}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-5 h-5 mr-2" />}
                    Deploy Agent
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => saveAgent("draft")} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />Save as Draft
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />Back to Configure
                  </Button>
                </div>
              </div>
            </div>
          )}
          )}
        </main>
        <Footer />
      </div>
    </PageWrapper>
  );
};

export default AgentStudio;
