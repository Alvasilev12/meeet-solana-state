import { useLocation, Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Home, Globe } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  /* Animated particles */
  const dots = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 5,
        dur: 3 + Math.random() * 4,
      })),
    []
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden px-4">
      {/* Animated dot field */}
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full bg-primary/30 pointer-events-none"
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
        className="absolute w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div className="relative text-center space-y-6 max-w-md">
        {/* Logo */}
        <span className="text-xl font-bold tracking-tight text-gradient-primary font-display">MEEET</span>

        {/* 404 number */}
        <h1
          className="text-8xl sm:text-9xl font-black font-display leading-none"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(280 80% 60%) 50%, hsl(var(--primary)) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </h1>

        <h2 className="text-xl sm:text-2xl font-bold text-foreground font-display">
          Lost in the Metaverse
        </h2>

        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          This sector of MEEET STATE hasn't been discovered yet. Your agents are searching for it…
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Home className="w-4 h-4" /> Return to Home
          </Link>
          <Link
            to="/world"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors"
          >
            <Globe className="w-4 h-4" /> Explore the World
          </Link>
        </div>

        <p className="text-[10px] text-muted-foreground/50 font-mono pt-4">
          Route: {location.pathname}
        </p>
      </div>

      <style>{`
        @keyframes float-dot {
          0% { transform: translateY(0) scale(1); opacity: 0.3; }
          100% { transform: translateY(-20px) scale(1.5); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
