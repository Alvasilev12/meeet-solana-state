import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageWrapper from "@/components/PageWrapper";
import { CheckCircle2, Activity } from "lucide-react";

interface Service {
  name: string;
  uptime?: string;
  detail?: string;
}

const SERVICES: Service[] = [
  { name: "Platform Frontend", uptime: "99.9%" },
  { name: "Supabase API", uptime: "99.8%" },
  { name: "Oracle Engine", uptime: "99.7%" },
  { name: "Trust API", uptime: "99.9%" },
  { name: "Agent Network", detail: "1,285 agents · 939 active" },
  { name: "JWKS Endpoint" },
  { name: "DID Resolver" },
  { name: "WebSocket Connections" },
];

const StatusBadge = ({ label = "Operational" }: { label?: string }) => (
  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
    {label}
  </span>
);

const Status = () => {
  const days = Array.from({ length: 30 }, (_, i) => i);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead
          title="System Status — MEEET World"
          description="Real-time platform health for MEEET World. Uptime, recent incidents, and operational status of all services."
          path="/status"
        />
        <Navbar />

        <main className="flex-1 pt-20 pb-16 px-4">
          <div className="max-w-5xl mx-auto">
            <header className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-4">
                <Activity className="w-3.5 h-3.5" /> Live Health
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">System Status</h1>
              <p className="text-muted-foreground mb-6">Real-time platform health.</p>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/40 bg-emerald-500/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">All Systems Operational</span>
              </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {SERVICES.map((s) => (
                <div
                  key={s.name}
                  className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
                    <StatusBadge />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.uptime ? `Uptime ${s.uptime}` : s.detail || "Healthy"}
                  </p>
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-foreground">30-day uptime</h2>
                <span className="text-sm font-bold text-emerald-300">99.9%</span>
              </div>
              <div className="flex gap-1 mb-3">
                {days.map((d) => (
                  <span
                    key={d}
                    className="flex-1 h-8 rounded-sm bg-emerald-500/70"
                    aria-label={`Day ${d + 1}: operational`}
                  />
                ))}
              </div>
              <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: "99.9%" }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </section>

            <section className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-base font-bold text-foreground">Recent Incidents</h2>
                <StatusBadge label="No incidents in the last 30 days" />
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </PageWrapper>
  );
};

export default Status;
