import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2, ChevronLeft, ChevronRight, Rocket, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

/* ── data ── */
const SPECIALIZATIONS = [
  { id: "researcher", icon: "🔬", name: "Researcher", desc: "Scientific discovery & paper analysis" },
  { id: "trader", icon: "📈", name: "Trader", desc: "Market analysis & economic modeling" },
  { id: "guardian", icon: "🛡️", name: "Guardian", desc: "Security, threat detection & auditing" },
  { id: "explorer", icon: "🚀", name: "Explorer", desc: "Space, climate & frontier sciences" },
  { id: "healer", icon: "💊", name: "Healer", desc: "Pharma economics & health research" },
  { id: "builder", icon: "🔧", name: "Builder", desc: "Infrastructure & engineering tasks" },
];

const FACTIONS = [
  { id: "ai_core", name: "AI CORE", icon: "🤖", color: "#3b82f6", desc: "Artificial intelligence & deep learning", members: 412 },
  { id: "biotech", name: "BIOTECH", icon: "🧬", color: "#22c55e", desc: "Gene editing, drug discovery & biology", members: 287 },
  { id: "energy", name: "ENERGY", icon: "⚡", color: "#eab308", desc: "Fusion, renewables & climate tech", members: 198 },
  { id: "quantum", name: "QUANTUM", icon: "💜", color: "#a855f7", desc: "Quantum computing & cryptography", members: 156 },
  { id: "space", name: "SPACE", icon: "🛸", color: "#ef4444", desc: "Aerospace, colonization & satellites", members: 134 },
];

const SKILLS = [
  { id: "data_analysis", icon: "📊", name: "Data Analysis" },
  { id: "prediction", icon: "🔮", name: "Prediction" },
  { id: "debate", icon: "⚔️", name: "Debate" },
  { id: "research", icon: "🔬", name: "Research" },
  { id: "trading", icon: "💹", name: "Trading" },
  { id: "governance", icon: "🏛️", name: "Governance" },
  { id: "security", icon: "🔒", name: "Security" },
  { id: "innovation", icon: "💡", name: "Innovation" },
];

const STEP_LABELS = ["Identity", "Specialization", "Faction", "Skills", "Review & Deploy"];

const avatarBg = (name: string) => {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 70%, 45%)`;
};

interface Props { onClose?: () => void }

const AgentCreationWizard = ({ onClose }: Props) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [spec, setSpec] = useState("");
  const [faction, setFaction] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  const toggleSkill = (id: string) => {
    setSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return !!spec;
    if (step === 2) return !!faction;
    if (step === 3) return skills.length >= 1;
    return true;
  };

  const deploy = () => {
    toast.success("Agent deployed successfully! 🚀 (Connect wallet to save)");
  };

  const reset = () => { setStep(0); setName(""); setBio(""); setSpec(""); setFaction(""); setSkills([]); };

  const factionData = FACTIONS.find((f) => f.id === faction);
  const specData = SPECIALIZATIONS.find((s) => s.id === spec);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 md:gap-2">
        {STEP_LABELS.map((label, i) => {
          const active = step === i;
          const done = step > i;
          return (
            <div key={label} className="flex items-center gap-1 md:gap-2 flex-1">
              <button
                onClick={() => { if (done) setStep(i); }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  active ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" :
                  done ? "bg-emerald-500/20 text-emerald-400 cursor-pointer" :
                  "bg-muted/30 text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </button>
              <span className={`text-[10px] hidden lg:inline whitespace-nowrap ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
              {i < 4 && <div className={`flex-1 h-0.5 ${done ? "bg-emerald-500/40" : "bg-border/40"}`} />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>

          {/* ── Step 1: Identity ── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-foreground">Name Your Agent</h2>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Agent Name <span className="text-muted-foreground text-xs">({name.length}/20)</span></label>
                    <Input placeholder="e.g. NeuroScout" value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} maxLength={20} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Agent Bio <span className="text-muted-foreground text-xs">({bio.length}/200)</span></label>
                    <Textarea placeholder="Describe what your agent does..." value={bio} onChange={(e) => setBio(e.target.value.slice(0, 200))} maxLength={200} rows={3} />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <label className="text-sm font-medium">Preview</label>
                  <div
                    className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-lg"
                    style={{ backgroundColor: name.trim() ? avatarBg(name) : "hsl(var(--muted))" }}
                  >
                    {name.trim() ? name[0].toUpperCase() : "?"}
                  </div>
                  <span className="text-sm font-medium text-foreground">{name || "Agent Name"}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Specialization ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-foreground">Choose Specialization</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SPECIALIZATIONS.map((s) => {
                  const active = spec === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSpec(s.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        active
                          ? "ring-2 ring-purple-500 border-purple-500/50 bg-purple-500/10 scale-[1.03]"
                          : "border-border/50 bg-card/40 hover:border-border"
                      }`}
                    >
                      <div className="text-3xl mb-2">{s.icon}</div>
                      <h3 className="font-semibold text-foreground text-sm">{s.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Faction ── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-foreground">Join a Faction</h2>
              <div className="space-y-3">
                {FACTIONS.map((f) => {
                  const active = faction === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFaction(f.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${
                        active
                          ? "border-opacity-60 bg-opacity-10"
                          : "border-border/50 bg-card/40 hover:border-border"
                      }`}
                      style={active ? { borderColor: f.color, backgroundColor: `${f.color}15`, boxShadow: `0 0 20px ${f.color}20` } : {}}
                    >
                      <div className="text-3xl">{f.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-sm" style={active ? { color: f.color } : {}}>{f.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{f.members} members</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 4: Skills ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Select Skills</h2>
                <span className="text-sm text-muted-foreground">Selected: <span className="font-bold text-foreground">{skills.length}/3</span></span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SKILLS.map((s) => {
                  const active = skills.includes(s.id);
                  const disabled = !active && skills.length >= 3;
                  return (
                    <button
                      key={s.id}
                      onClick={() => !disabled && toggleSkill(s.id)}
                      disabled={disabled}
                      className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                        active
                          ? "border-purple-500/50 bg-purple-500/10"
                          : disabled
                          ? "border-border/30 bg-muted/10 opacity-40 cursor-not-allowed"
                          : "border-border/50 bg-card/40 hover:border-border"
                      }`}
                    >
                      <Checkbox checked={active} className="pointer-events-none" />
                      <span className="text-lg">{s.icon}</span>
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 5: Review ── */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-foreground">Review & Deploy</h2>
              <div className="bg-card/60 border border-border/50 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                    style={{ backgroundColor: avatarBg(name) }}
                  >
                    {name[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{name}</h3>
                    {bio && <p className="text-sm text-muted-foreground mt-0.5">{bio}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Specialization</span>
                    <p className="font-medium text-foreground mt-0.5">{specData?.icon} {specData?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Faction</span>
                    <p className="font-medium mt-0.5" style={{ color: factionData?.color }}>{factionData?.icon} {factionData?.name}</p>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Skills</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {skills.map((id) => {
                      const s = SKILLS.find((sk) => sk.id === id);
                      return s ? (
                        <Badge key={id} variant="secondary" className="text-xs">{s.icon} {s.name}</Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white border-0 text-base animate-pulse hover:animate-none"
                  onClick={deploy}
                >
                  <Rocket className="w-5 h-5 mr-2" /> Deploy Agent
                </Button>
                <Button variant="outline" onClick={() => { reset(); onClose?.(); }}>
                  <RotateCcw className="w-4 h-4 mr-1" /> New Agent
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Nav buttons (not on review step) */}
      {step < 4 && (
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onClose?.()} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-1">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AgentCreationWizard;
