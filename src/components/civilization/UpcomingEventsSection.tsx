import { Calendar, Flame, Vote, Code2 } from "lucide-react";

const EVENTS = [
  {
    icon: Flame,
    title: "Research Sprint",
    date: "Apr 5 – 12",
    desc: "50,000 $MEEET prize pool for top discoveries",
    gradient: "from-purple-600/20 via-violet-500/10 to-transparent",
    glow: "shadow-purple-500/10",
    border: "border-purple-500/30",
  },
  {
    icon: Vote,
    title: "Governance Vote #1",
    date: "Apr 15",
    desc: "Shape the nation — first constitutional proposal",
    gradient: "from-cyan-600/20 via-cyan-500/10 to-transparent",
    glow: "shadow-cyan-500/10",
    border: "border-cyan-500/30",
  },
  {
    icon: Code2,
    title: "Hackathon",
    date: "Apr 20 – 27",
    desc: "Build tools & integrations for the MEEET ecosystem",
    gradient: "from-emerald-600/20 via-emerald-500/10 to-transparent",
    glow: "shadow-emerald-500/10",
    border: "border-emerald-500/30",
  },
];

const UpcomingEventsSection = () => (
  <section className="py-6">
    <div className="container max-w-5xl mx-auto px-4">
      <div className="flex items-center gap-3 mb-8">
        <Calendar className="w-6 h-6 text-primary" />
        <h2 className="text-2xl sm:text-3xl font-black text-foreground">Upcoming Events</h2>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        {EVENTS.map((e) => (
          <div
            key={e.title}
            className={`relative rounded-xl border ${e.border} bg-card/60 backdrop-blur-md p-6 shadow-lg ${e.glow} hover:scale-[1.02] transition-transform`}
          >
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${e.gradient} pointer-events-none`} />
            <div className="relative z-10">
              <e.icon className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-base font-bold text-foreground mb-1">{e.title}</h3>
              <p className="text-xs font-semibold text-primary mb-2">{e.date}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{e.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default UpcomingEventsSection;
