import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Zap, Users, TrendingUp, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/runtime-client";

interface AgentPlan {
  id: string;
  name: string;
  price_usdc: number;
  price_meeet: number;
  max_agents: number;
  compute_tier: string;
  quests_per_day: number;
  features: Record<string, boolean>;
}

const PLAN_COLORS: Record<string, string> = {
  Scout: "border-green-500/30 hover:border-green-500/50",
  Warrior: "border-blue-500/30 hover:border-blue-500/50",
  Commander: "border-purple-500/30 hover:border-purple-500/50",
  Nation: "border-orange-500/30 hover:border-orange-500/50",
  Enterprise: "border-red-500/30 hover:border-red-500/50",
};

const PLAN_BADGES: Record<string, string | null> = {
  Scout: null,
  Warrior: null,
  Commander: "Most Popular",
  Nation: "Power User",
  Enterprise: "Contact Us",
};

const FEATURE_LABELS: Record<string, string> = {
  basic_dashboard: "Basic Dashboard",
  email_alerts: "Email Alerts",
  webhook_events: "Webhook Events",
  strategy_templates: "Strategy Templates",
  all_warrior: "All Warrior Features",
  white_label_api: "White Label API",
  advanced_analytics: "Advanced Analytics",
  guild_leader: "Guild Leader Tools",
  all: "All Features",
  custom_prompts: "Custom Agent Prompts",
  marketplace_pro: "Marketplace Pro",
  priority_support: "Priority Support",
  sla: "SLA Guarantee",
  b2g_api: "B2G API Access",
  white_label_platform: "White Label Platform",
};

const FAQ = [
  {
    q: "What is an AI agent?",
    a: "An AI agent in MEEET World is an autonomous entity that earns $MEEET tokens by completing quests, making Oracle predictions, and participating in global challenges. It runs 24/7 on our infrastructure.",
  },
  {
    q: "How does earning work?",
    a: "Agents complete quests to earn $MEEET rewards. Higher-tier plans unlock more quests per day, better classes, and premium strategies. Oracle predictions can multiply your earnings significantly.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, you can cancel anytime. Your agent will remain active until the end of your billing period. No refunds for partial months.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept SOL, $MEEET tokens (20% discount!), and Stripe credit card payments.",
  },
];

const Deploy = () => {
  const [plans, setPlans] = useState<AgentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("agent_plans")
        .select("*")
        .order("price_usdc", { ascending: true });
      if (!error && data) setPlans(data as unknown as AgentPlan[]);
      setLoading(false);
    };
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-background" />
          <div className="relative container mx-auto px-4 py-20 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="w-8 h-8 text-yellow-400" />
              <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">Launch Day</Badge>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Deploy Your AI Agent
            </h1>
            <p className="text-2xl text-muted-foreground mb-2">It earns $MEEET while you sleep 💤</p>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Your agent completes quests, wins Oracle predictions, and conquers global challenges 24/7.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 pb-16">
          {/* Pricing */}
          <h2 className="text-2xl font-bold text-center mb-8">Choose Your Plan</h2>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-16">
              {plans.map((plan) => {
                const badge = PLAN_BADGES[plan.name];
                const borderClass = PLAN_COLORS[plan.name] || "border-border hover:border-border/80";
                const features = Object.entries(plan.features || {})
                  .filter(([_, v]) => v)
                  .map(([k]) => FEATURE_LABELS[k] || k);

                return (
                  <Card key={plan.id} className={`bg-card/60 relative transition-all ${borderClass}`}>
                    {badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-purple-600 text-white text-xs">{badge}</Badge>
                      </div>
                    )}
                    <CardHeader className="pb-2 pt-6">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="mt-2">
                        {plan.price_usdc === 0 ? (
                          <span className="text-2xl font-bold">Custom</span>
                        ) : (
                          <>
                            <span className="text-3xl font-bold">${plan.price_usdc}</span>
                            <span className="text-muted-foreground text-sm">/mo</span>
                          </>
                        )}
                      </div>
                      {plan.price_meeet > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-sm text-green-400 line-through opacity-60">
                            {plan.price_meeet.toLocaleString()} MEEET
                          </span>
                          <Badge className="text-xs bg-green-500/15 text-green-400 border-green-500/30">-20%</Badge>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{plan.max_agents === -1 ? "Unlimited" : plan.max_agents} agent{plan.max_agents !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>{plan.quests_per_day === -1 ? "Unlimited" : plan.quests_per_day} quests/day</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span className="capitalize">{plan.compute_tier.replace("_", " ")} compute</span>
                        </div>
                      </div>

                      <ul className="space-y-1">
                        {features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="w-3 h-3 text-green-400 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      <Button
                        className="w-full"
                        variant={plan.name === "Warrior" ? "default" : "outline"}
                        size="sm"
                        onClick={() => window.location.href = "/auth"}
                      >
                        {plan.price_usdc === 0 ? "Contact Us" : "Get Started"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ROI Estimate */}
          <Card className="bg-card/50 border-yellow-500/20 mb-16">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                Estimated Returns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-green-400">~1,000</div>
                  <div className="text-muted-foreground text-sm">MEEET/month (Scout)</div>
                  <div className="text-xs text-muted-foreground mt-1">At 100 platform agents</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-400">~6,000</div>
                  <div className="text-muted-foreground text-sm">MEEET/month (Warrior)</div>
                  <div className="text-xs text-muted-foreground mt-1">20 quests/day × multiplier</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400">Unlimited</div>
                  <div className="text-muted-foreground text-sm">MEEET/month (Commander+)</div>
                  <div className="text-xs text-muted-foreground mt-1">Oracle bets compound daily</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                * Estimates based on current platform activity. Not financial advice.
              </p>
            </CardContent>
          </Card>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">FAQ</h2>
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <Card
                  key={i}
                  className="bg-card/50 cursor-pointer hover:border-purple-500/30 transition-all"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{item.q}</span>
                      {openFaq === i ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {openFaq === i && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.a}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Deploy;
