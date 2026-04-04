import { useMemo } from "react";

interface PersonalityRadarProps {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  accentColor?: string;
  size?: number;
}

const TRAITS = [
  { key: "O", label: "Openness", angle: -90 },
  { key: "C", label: "Conscientiousness", angle: -18 },
  { key: "E", label: "Extraversion", angle: 54 },
  { key: "A", label: "Agreeableness", angle: 126 },
  { key: "N", label: "Neuroticism", angle: 198 },
];

function getPersonalitySummary(o: number, c: number, e: number, a: number, n: number): string {
  const scores = [
    { trait: "openness", val: o },
    { trait: "conscientiousness", val: c },
    { trait: "extraversion", val: e },
    { trait: "agreeableness", val: a },
    { trait: "neuroticism", val: n },
  ].sort((a, b) => b.val - a.val);

  const top = scores[0].trait;
  const second = scores[1].trait;
  const lowest = scores[scores.length - 1].trait;

  const archetypes: Record<string, Record<string, [string, string]>> = {
    openness: {
      conscientiousness: ["Visionary Architect", "imaginative and methodical"],
      extraversion: ["Charismatic Explorer", "curious and outgoing"],
      agreeableness: ["Empathic Innovator", "creative and cooperative"],
      neuroticism: ["Intense Dreamer", "imaginative and deeply reflective"],
    },
    conscientiousness: {
      openness: ["Strategic Thinker", "disciplined and inventive"],
      extraversion: ["Natural Leader", "organized and commanding"],
      agreeableness: ["Reliable Diplomat", "methodical and cooperative"],
      neuroticism: ["Cautious Planner", "meticulous and risk-aware"],
    },
    extraversion: {
      openness: ["Bold Visionary", "outspoken and curious"],
      conscientiousness: ["Driven Commander", "assertive and disciplined"],
      agreeableness: ["Social Catalyst", "energetic and harmonious"],
      neuroticism: ["Passionate Advocate", "expressive and intense"],
    },
    agreeableness: {
      openness: ["Compassionate Scholar", "kind and open-minded"],
      conscientiousness: ["Trusted Guardian", "supportive and reliable"],
      extraversion: ["Community Builder", "warm and sociable"],
      neuroticism: ["Sensitive Healer", "empathetic and reflective"],
    },
    neuroticism: {
      openness: ["Restless Genius", "intense and creative"],
      conscientiousness: ["Anxious Perfectionist", "vigilant and precise"],
      extraversion: ["Volatile Performer", "dramatic and engaging"],
      agreeableness: ["Emotional Diplomat", "sensitive and caring"],
    },
  };

  const pair = archetypes[top]?.[second] || ["Balanced Agent", "adaptive and versatile"];

  // Add contrast from lowest trait
  const lowLabels: Record<string, string> = {
    openness: "pragmatic",
    conscientiousness: "spontaneous",
    extraversion: "introspective",
    agreeableness: "independent",
    neuroticism: "resilient",
  };

  return `${pair[0]} — ${pair[1]}, ${lowLabels[lowest] || "balanced"}`;
}

function polarToXY(angle: number, radius: number, cx: number, cy: number): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

const PersonalityRadar = ({
  openness,
  conscientiousness,
  extraversion,
  agreeableness,
  neuroticism,
  accentColor = "hsl(var(--primary))",
  size = 150,
}: PersonalityRadarProps) => {
  const values = [openness, conscientiousness, extraversion, agreeableness, neuroticism];
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const dataPoints = useMemo(() => {
    return TRAITS.map((t, i) => {
      const r = values[i] * maxR;
      return polarToXY(t.angle, r, cx, cy);
    });
  }, [values, maxR, cx, cy]);

  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + "Z";

  const summary = getPersonalitySummary(openness, conscientiousness, extraversion, agreeableness, neuroticism);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        <defs>
          <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Grid pentagons */}
        {gridLevels.map((level) => {
          const pts = TRAITS.map((t) => polarToXY(t.angle, level * maxR, cx, cy));
          const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + "Z";
          return (
            <path
              key={level}
              d={path}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={level === 1 ? 1 : 0.5}
              opacity={level === 1 ? 0.6 : 0.3}
            />
          );
        })}

        {/* Axis lines */}
        {TRAITS.map((t) => {
          const [ex, ey] = polarToXY(t.angle, maxR, cx, cy);
          return (
            <line key={t.key} x1={cx} y1={cy} x2={ex} y2={ey} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
          );
        })}

        {/* Data polygon */}
        <path d={polygonPath} fill="url(#radarFill)" stroke={accentColor} strokeWidth="1.5" strokeLinejoin="round" />

        {/* Data points */}
        {dataPoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill={accentColor} stroke="hsl(var(--background))" strokeWidth="1" />
        ))}

        {/* Labels */}
        {TRAITS.map((t, i) => {
          const labelR = maxR + 14;
          const [lx, ly] = polarToXY(t.angle, labelR, cx, cy);
          return (
            <text
              key={t.key}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-muted-foreground"
              fontSize="10"
              fontWeight="600"
            >
              {t.key}
            </text>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground text-center italic max-w-[200px] leading-tight">{summary}</p>
    </div>
  );
};

export default PersonalityRadar;
