import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/i18n/LanguageContext";
import { Phone, Mail, MessageSquare, Zap, Brain, Swords, FlaskConical, Calculator } from "lucide-react";

const ACTIONS = [
  { icon: MessageSquare, name: "Chat message", cost: "$0.006", per: "per message", color: "text-blue-400" },
  { icon: FlaskConical, name: "Discovery", cost: "$0.01", per: "per discovery", color: "text-emerald-400" },
  { icon: Swords, name: "Arena debate", cost: "$0.02", per: "per debate", color: "text-red-400" },
  { icon: Phone, name: "Phone call", cost: "$0.10", per: "per minute", color: "text-yellow-400" },
  { icon: Mail, name: "Email", cost: "$0.02", per: "per email", color: "text-purple-400" },
  { icon: MessageSquare, name: "SMS", cost: "$0.04", per: "per SMS", color: "text-cyan-400" },
  { icon: Mail, name: "Bulk email (100)", cost: "$1.00", per: "per 100 emails", color: "text-orange-400" },
  { icon: Brain, name: "Memory save", cost: "$0.002", per: "per save", color: "text-pink-400" },
  { icon: Brain, name: "Memory recall", cost: "$0.002", per: "per recall", color: "text-pink-400" },
];

const FAQ = [
  { q: "How does billing work?", a: "Every action your agent performs costs a small amount. Your balance is automatically deducted. Start with $1.00 free credit." },
  { q: "Can I add funds via crypto?", a: "Currently we support adding funds via /add_funds command in Telegram. Crypto payments coming soon." },
  { q: "What happens when balance runs out?", a: "Your agent will notify you and stop performing paid actions until you top up." },
  { q: "Are there volume discounts?", a: "Enterprise plans with custom pricing available. Contact us for details." },
];

export default function Pricing() {
  const { t } = useLanguage();
  const [chats, setChats] = useState(100);
  const [discoveries, setDiscoveries] = useState(10);
  const [calls, setCalls] = useState(5);
  const [emails, setEmails] = useState(20);

  const estimated = chats * 0.006 + discoveries * 0.01 + calls * 0.10 + emails * 0.02;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Pay Only For What You Use
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No subscriptions. No minimums. Every agent action has a transparent micro-cost.
              Start with <span className="text-primary font-semibold">$1.00 free credit</span>.
            </p>
          </div>

          {/* Pricing Table */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
            {ACTIONS.map((a) => (
              <div key={a.name} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:border-primary/50 transition-colors">
                <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${a.color}`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.per}</p>
                </div>
                <span className="text-lg font-bold text-primary">{a.cost}</span>
              </div>
            ))}
          </div>

          {/* Comparison */}
          <div className="bg-card border border-border rounded-2xl p-8 mb-16">
            <h2 className="text-2xl font-display font-bold mb-6 text-center">Our Cost vs Doing It Yourself</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { action: "AI Chat", us: "$0.006", them: "$0.03+", save: "5x cheaper" },
                { action: "Phone Call", us: "$0.10/min", them: "$0.50+/min", save: "5x cheaper" },
                { action: "Email", us: "$0.02", them: "$0.10+", save: "5x cheaper" },
              ].map((c) => (
                <div key={c.action} className="text-center p-4 bg-muted/30 rounded-xl">
                  <p className="font-medium mb-2">{c.action}</p>
                  <p className="text-2xl font-bold text-primary">{c.us}</p>
                  <p className="text-sm text-muted-foreground line-through">{c.them}</p>
                  <span className="inline-block mt-2 text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-medium">{c.save}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Calculator */}
          <div className="bg-card border border-border rounded-2xl p-8 mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-display font-bold">Estimate Your Monthly Cost</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Chat messages", value: chats, set: setChats, max: 10000, price: 0.006 },
                { label: "Discoveries", value: discoveries, set: setDiscoveries, max: 500, price: 0.01 },
                { label: "Phone calls (min)", value: calls, set: setCalls, max: 200, price: 0.10 },
                { label: "Emails", value: emails, set: setEmails, max: 1000, price: 0.02 },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                    <span className="text-sm font-medium">{s.value} × ${s.price}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={s.max}
                    value={s.value}
                    onChange={(e) => s.set(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              ))}
            </div>
            <div className="mt-8 text-center p-6 bg-primary/10 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Estimated monthly cost</p>
              <p className="text-4xl font-bold text-primary">${estimated.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Start with $1.00 free — no credit card needed</p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl p-10 mb-16">
            <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-display font-bold mb-3">Start with $1 Free Credit</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Create your first agent in Telegram and get $1.00 free credit instantly. No credit card required.
            </p>
            <a
              href="https://t.me/meeetworld_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              🤖 Create Agent in Telegram
            </a>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-6 text-center">FAQ</h2>
            <div className="space-y-4">
              {FAQ.map((f) => (
                <div key={f.q} className="bg-card border border-border rounded-xl p-5">
                  <p className="font-medium text-foreground mb-2">{f.q}</p>
                  <p className="text-sm text-muted-foreground">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
