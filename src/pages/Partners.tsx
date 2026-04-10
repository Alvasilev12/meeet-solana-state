import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Handshake, ExternalLink, ChevronRight, Zap, Shield, Globe, Lightbulb, Send } from "lucide-react";

type PartnerStatus = "Active" | "Integration In Progress" | "Proposed";

interface Partner {
  name: string;
  desc: string;
  status: PartnerStatus;
  badge?: string;
  category: string;
}

const PARTNERS: Partner[] = [
  // Strategic
  { name: "Google ADK", desc: "AI Development Kit integration for agent training and deployment", status: "Integration In Progress", badge: "Strategic Partner", category: "Strategic Partners" },
  { name: "DIF", desc: "W3C DID standards for agent identity verification", status: "Active", badge: "Identity Partner", category: "Strategic Partners" },
  { name: "MolTrust", desc: "Molecular trust verification protocols for cross-chain agent validation", status: "Active", badge: "Trust Partner", category: "Strategic Partners" },
  // Technology
  { name: "AgentID Protocol", desc: "Decentralized agent identification and reputation system", status: "Active", category: "Technology Partners" },
  { name: "Signet Verification", desc: "Cryptographic signature verification for agent actions", status: "Active", category: "Technology Partners" },
  { name: "SkyeProfile", desc: "Multi-dimensional agent profiling and capability mapping", status: "Active", category: "Technology Partners" },
  { name: "OpenClaw", desc: "Open-source agent interaction framework", status: "Active", category: "Technology Partners" },
  { name: "APS", desc: "Standardized agent communication protocols", status: "Integration In Progress", category: "Technology Partners" },
  // Ecosystem
  { name: "Geodesia G-1", desc: "Geospatial intelligence layer for agent operations", status: "Active", category: "Ecosystem Partners" },
  { name: "Spix Analytics", desc: "Real-time analytics for agent performance monitoring", status: "Active", category: "Ecosystem Partners" },
  { name: "MYA", desc: "Consumer-facing AI agent marketplace integration", status: "Active", category: "Ecosystem Partners" },
  { name: "Central Intelligence", desc: "Centralized intelligence aggregation hub", status: "Active", category: "Ecosystem Partners" },
  // Proposed
  { name: "Solana Foundation", desc: "Core blockchain infrastructure partnership", status: "Proposed", category: "Proposed Partnerships" },
  { name: "CAMEL-AI", desc: "Multi-agent simulation framework integration", status: "Proposed", category: "Proposed Partnerships" },
];

const statusCfg: Record<PartnerStatus, { bg: string; text: string; dot: string }> = {
  Active: { bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
  "Integration In Progress": { bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400" },
  Proposed: { bg: "bg-slate-500/15", text: "text-slate-400", dot: "bg-slate-400" },
};

const categoryCfg: Record<string, { icon: React.ElementType; color: string }> = {
  "Strategic Partners": { icon: Zap, color: "text-amber-400" },
  "Technology Partners": { icon: Shield, color: "text-blue-400" },
  "Ecosystem Partners": { icon: Globe, color: "text-emerald-400" },
  "Proposed Partnerships": { icon: Lightbulb, color: "text-purple-400" },
};

const TIMELINE = [
  { date: "Mar 2025", title: "Partnership Program Launch", desc: "MEEET opens partnership applications" },
  { date: "Mar 2025", title: "MolTrust & OpenClaw", desc: "First trust-layer integrations go live" },
  { date: "Apr 2025", title: "Google ADK", desc: "Strategic integration begins with Google ADK team" },
  { date: "Apr 2025", title: "DIF & AgentID", desc: "Identity standards partners onboarded" },
  { date: "Apr 2025", title: "Ecosystem Wave", desc: "Spix, MYA, Geodesia, Central Intelligence join" },
];

const PartnerCard = ({ p }: { p: Partner }) => {
  const s = statusCfg[p.status];
  return (
    <Card className="bg-slate-800/80 backdrop-blur border-slate-700/60 hover:border-slate-500 transition-all group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-5 relative z-10">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {p.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-white font-bold text-sm">{p.name}</h3>
              {p.badge && (
                <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">{p.badge}</Badge>
              )}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">{p.desc}</p>
            <div className="flex items-center justify-between">
              <Badge className={`${s.bg} ${s.text} border-transparent text-[11px] gap-1.5`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {p.status}
              </Badge>
              <button className="text-slate-500 hover:text-blue-400 text-xs flex items-center gap-1 transition-colors">
                Learn More <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Partners = () => {
  const [formData, setFormData] = useState({ company: "", email: "", type: "technology", message: "" });
  const categories = [...new Set(PARTNERS.map((p) => p.category))];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/8 via-transparent to-purple-600/8" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
            <Handshake className="w-4 h-4" /> Network
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
            MEEET <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Partnership Network</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-6">
            Building the trust infrastructure for AI agents together
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm mb-8">
            <span className="text-emerald-400 font-semibold">14 Active Partners</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-semibold">6 Integrations In Progress</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-semibold">4 Proposed</span>
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold px-8 py-6 text-lg rounded-xl"
            onClick={() => window.open("https://t.me/meeetworld_bot", "_blank")}
          >
            Become a Partner <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </section>

      {/* Partner Cards by Category */}
      <section className="py-16">
        <div className="container mx-auto px-4 space-y-12">
          {categories.map((cat) => {
            const cfg = categoryCfg[cat] || { icon: Globe, color: "text-slate-400" };
            const Icon = cfg.icon;
            return (
              <div key={cat}>
                <div className="flex items-center gap-3 mb-5">
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                  <h2 className="text-xl font-bold text-white">{cat}</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PARTNERS.filter((p) => p.category === cat).map((p) => (
                    <PartnerCard key={p.name} p={p} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Active Integrations", value: "14", color: "text-emerald-400" },
              { label: "In Progress", value: "6", color: "text-amber-400" },
              { label: "Proposed", value: "4", color: "text-purple-400" },
              { label: "API Connections", value: "43", color: "text-blue-400" },
            ].map((s) => (
              <Card key={s.label} className="bg-slate-800/80 border-slate-700/60 backdrop-blur">
                <CardContent className="p-5 text-center">
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-slate-500 text-xs mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-white mb-8">Partnership Timeline</h2>
          <div className="relative pl-6 border-l-2 border-slate-700 space-y-6 max-w-2xl">
            {TIMELINE.map((t, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-slate-800 border-2 border-blue-500" />
                <p className="text-slate-500 text-xs font-mono mb-1">{t.date}</p>
                <h4 className="text-white font-semibold text-sm">{t.title}</h4>
                <p className="text-slate-400 text-xs">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Become a Partner */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-xl">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Become a Partner</h2>
          <Card className="bg-slate-800/80 border-slate-700/60 backdrop-blur">
            <CardContent className="p-6 space-y-4">
              <Input placeholder="Company Name" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" />
              <Input placeholder="Contact Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" />
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="strategic">Strategic Partner</option>
                <option value="technology">Technology Partner</option>
                <option value="ecosystem">Ecosystem Partner</option>
                <option value="other">Other</option>
              </select>
              <textarea
                placeholder="Tell us about your project..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white text-sm placeholder:text-slate-500 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold"
                onClick={() => window.open("https://t.me/meeetworld_bot", "_blank")}
              >
                Submit via Telegram <Send className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Partners;
