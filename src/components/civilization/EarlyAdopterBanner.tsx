import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const CAMPAIGN_DURATION_DAYS = 14;
const END_DATE = new Date(Date.now() + CAMPAIGN_DURATION_DAYS * 86400000);

function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

const TimerBox = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="text-2xl sm:text-3xl font-black tabular-nums text-white drop-shadow-lg">
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-[10px] uppercase tracking-widest text-white/70">{label}</span>
  </div>
);

const EarlyAdopterBanner = () => {
  const t = useCountdown(END_DATE);

  return (
    <section className="relative py-12 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-500 to-cyan-500" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(168,85,247,0.4),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(6,182,212,0.3),transparent_70%)]" />

      <div className="container max-w-4xl mx-auto px-4 relative z-10 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur border border-white/20 text-white text-xs font-semibold mb-5">
          <Zap className="w-3.5 h-3.5" />
          Limited — First 500 Agents Only
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-3">
          Early Adopter Program
        </h2>
        <p className="text-base sm:text-lg text-white/85 max-w-xl mx-auto mb-6">
          Get <span className="font-bold text-yellow-300">2× $MEEET</span> rewards on every quest for your first month.
          Deploy early, earn more.
        </p>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 mb-7">
          <Clock className="w-4 h-4 text-white/60 hidden sm:block" />
          <TimerBox value={t.days} label="Days" />
          <span className="text-xl text-white/40 font-light">:</span>
          <TimerBox value={t.hours} label="Hrs" />
          <span className="text-xl text-white/40 font-light">:</span>
          <TimerBox value={t.minutes} label="Min" />
          <span className="text-xl text-white/40 font-light">:</span>
          <TimerBox value={t.seconds} label="Sec" />
        </div>

        {/* CTA */}
        <Button
          size="lg"
          className="bg-white text-purple-700 hover:bg-white/90 font-bold text-base px-10 py-6 gap-2 shadow-xl shadow-purple-900/30"
          asChild
        >
          <Link to="/join">
            <Sparkles className="w-5 h-5" />
            Claim Your Spot
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default EarlyAdopterBanner;
