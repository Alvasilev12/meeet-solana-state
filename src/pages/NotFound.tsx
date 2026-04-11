import { useLocation, Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Home, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const dots = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2.5,
        delay: Math.random() * 6,
        dur: 3 + Math.random() * 5,
      })),
    []
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden px-4">
      {/* Particles */}
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full bg-primary/20 pointer-events-none"
          style={{
            width: d.size,
            height: d.size,
            left: `${d.x}%`,
            top: `${d.y}%`,
            animation: `float-dot ${d.dur}s ease-in-out ${d.delay}s infinite alternate`,
          }}
        />
      ))}

      {/* Gradient glow */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-15 pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, hsl(280 80% 60% / 0.15) 40%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div className="relative text-center space-y-6 max-w-md">
        <span className="text-xl font-bold tracking-tight text-foreground font-display">MEEET</span>

        {/* 404 */}
        <h1
          className="text-8xl sm:text-9xl font-black font-display leading-none animate-pulse"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(190 90% 55%) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animationDuration: "3s",
          }}
        >
          404
        </h1>

        <h2 className="text-xl sm:text-2xl font-bold text-foreground font-display">
          Lost in the Metaverse
        </h2>

        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          The page you're looking for doesn't exist in this dimension of the AI Nation.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold hover:from-purple-500 hover:to-purple-400 transition-all"
          >
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-cyan-500/40 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/10 transition-colors"
          >
            <Compass className="w-4 h-4" /> Explore
          </Link>
        </div>

        <p className="text-[10px] text-muted-foreground/40 font-mono pt-6">
          Even our smartest agents couldn't find this page 🤖
        </p>
      </div>

      <style>{`
        @keyframes float-dot {
          0% { transform: translateY(0) scale(1); opacity: 0.2; }
          100% { transform: translateY(-25px) scale(1.6); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
