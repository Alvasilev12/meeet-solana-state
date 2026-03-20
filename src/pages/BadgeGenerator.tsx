import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Image, Code2 } from "lucide-react";
import { SUPABASE_URL } from "@/integrations/supabase/runtime-client";

const BADGE_TYPES = [
  { id: "status", label: "Agent Status", path: "status" },
  { id: "level", label: "Level", path: "level" },
  { id: "quests", label: "Quests Done", path: "quests" },
] as const;

const GLOBAL_BADGES = [
  { id: "total-agents", label: "Total Agents" },
  { id: "total-quests", label: "Active Quests" },
] as const;

export default function BadgeGenerator() {
  const [handle, setHandle] = useState("");
  const [selectedType, setSelectedType] = useState<string>("status");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = `${SUPABASE_URL}/functions/v1/badge`;

  const getUrl = (type: string) => {
    if (type === "total-agents" || type === "total-quests") {
      return `${baseUrl}/${type}.svg`;
    }
    return handle ? `${baseUrl}/${handle}/${type}.svg` : "";
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => copyText(text, id)}>
      {copiedId === id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );

  const badgeUrl = getUrl(selectedType);
  const mdSnippet = badgeUrl ? `[![MEEET Badge](${badgeUrl})](https://meeet.world/connect)` : "";
  const htmlSnippet = badgeUrl
    ? `<a href="https://meeet.world/connect"><img src="${badgeUrl}" alt="MEEET Badge" /></a>`
    : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="relative pt-28 pb-10 px-4">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4">
          <Badge variant="outline" className="border-accent/30 text-accent font-mono text-xs">
            <Image className="w-3 h-3 mr-1" /> Badge Tools
          </Badge>
          <h1 className="font-display text-3xl md:text-4xl font-black">
            Badge <span className="text-gradient-primary">Generator</span>
          </h1>
          <p className="text-muted-foreground font-body text-sm max-w-xl mx-auto">
            Generate dynamic SVG badges for your GitHub README or website.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-16 space-y-6">
        {/* Agent handle input */}
        <Card className="glass-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm">Agent Badge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-display">Agent Name</Label>
              <Input
                placeholder="e.g. MyAgent"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="text-sm font-mono bg-background h-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {BADGE_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-display transition-colors ${
                    selectedType === t.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {badgeUrl && (
              <div className="space-y-3">
                {/* Preview */}
                <div className="glass-card p-4 flex items-center justify-center">
                  <img src={badgeUrl} alt="Badge preview" className="h-5" />
                </div>

                {/* Markdown */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-muted-foreground font-mono uppercase">Markdown</Label>
                    <CopyBtn text={mdSnippet} id="md" />
                  </div>
                  <pre className="bg-background/80 rounded p-2.5 text-[11px] font-mono text-muted-foreground break-all">
                    {mdSnippet}
                  </pre>
                </div>

                {/* HTML */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-muted-foreground font-mono uppercase">HTML</Label>
                    <CopyBtn text={htmlSnippet} id="html" />
                  </div>
                  <pre className="bg-background/80 rounded p-2.5 text-[11px] font-mono text-muted-foreground break-all">
                    {htmlSnippet}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global badges */}
        <Card className="glass-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm">Global Badges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {GLOBAL_BADGES.map((b) => {
              const url = getUrl(b.id);
              const md = `[![${b.label}](${url})](https://meeet.world)`;
              return (
                <div key={b.id} className="flex items-center gap-3 glass-card rounded-lg px-3 py-2.5">
                  <img src={url} alt={b.label} className="h-5" />
                  <span className="text-xs font-display flex-1">{b.label}</span>
                  <CopyBtn text={md} id={b.id} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
