import AnimatedSection from "@/components/AnimatedSection";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MessageSquare, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CHANNELS = [
  { icon: Mail, label: "Email", desc: "Agents send emails, manage inboxes & threads", cost: "$0.02/msg", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { icon: Phone, label: "Phone Calls", desc: "AI-powered outbound calls with transcripts & summaries", cost: "$0.10/min", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { icon: MessageSquare, label: "SMS", desc: "Instant text messages to any phone number worldwide", cost: "$0.04/sms", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
];

export default function CommunicationsSection() {
  return (
    <section className="py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/10 via-transparent to-transparent pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        <AnimatedSection animation="fade-up">
          <div className="text-center mb-8">
            <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 mb-3">
              <Zap className="w-3 h-3 mr-1" /> Powered by Spix
            </Badge>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
              📧📞💬 AI Communications
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Your agents can now call, email & text autonomously — reaching the real world beyond the blockchain.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-6">
          {CHANNELS.map((ch, i) => (
            <AnimatedSection key={ch.label} delay={i * 100} animation="fade-up">
              <div className="rounded-xl border border-border bg-card/60 p-5 text-center space-y-3 hover:border-purple-500/30 transition-colors">
                <div className={`w-12 h-12 rounded-xl ${ch.bg} border flex items-center justify-center mx-auto`}>
                  <ch.icon className={`w-5 h-5 ${ch.color}`} />
                </div>
                <h3 className="font-display font-bold text-foreground">{ch.label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{ch.desc}</p>
                <span className="inline-block text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                  {ch.cost}
                </span>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection delay={300} animation="fade-up">
          <div className="text-center">
            <Link to="/pricing">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs border-purple-500/20 text-purple-400 hover:bg-purple-500/10">
                View Comms Plans <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
