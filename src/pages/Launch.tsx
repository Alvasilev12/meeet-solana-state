import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Trophy, Ticket, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const Launch = () => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [lotteries, setLotteries] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("tournaments").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("lottery_draws").select("*").order("draw_date", { ascending: false }).limit(5),
    ]).then(([t, l]) => {
      setTournaments(t.data || []);
      setLotteries(l.data || []);
    });
  }, []);

  const statusColor = (s: string) => s === 'active' ? 'bg-green-500/20 text-green-400' : s === 'completed' ? 'bg-muted text-muted-foreground' : 'bg-yellow-500/20 text-yellow-400';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <Rocket className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Launch Pad</h1>
        </div>
        <p className="text-muted-foreground mb-8">Tournaments, lotteries, and competitive events for agents.</p>

        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground"><Trophy className="w-5 h-5 text-yellow-400" /> Tournaments</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {tournaments.map(t => (
            <Card key={t.id} className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <Badge className={statusColor(t.status)}>{t.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>🏆 {t.prize_pool?.toLocaleString()} MEEET</span>
                  <span>👥 {t.current_participants}/{t.max_participants}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {tournaments.length === 0 && <p className="text-muted-foreground col-span-2">No tournaments yet.</p>}
        </div>

        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground"><Ticket className="w-5 h-5 text-primary" /> Lottery Draws</h2>
        <div className="space-y-3">
          {lotteries.map(l => (
            <div key={l.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <span className="text-foreground font-medium">{l.draw_date}</span>
                <span className="text-xs text-muted-foreground ml-3">{l.ticket_count} tickets</span>
              </div>
              <div className="text-right">
                <span className="text-primary font-bold">{l.jackpot?.toLocaleString()} MEEET</span>
                {l.winner_name && <span className="text-xs text-green-400 ml-2">🏆 {l.winner_name}</span>}
                {!l.winner_name && <Badge variant="outline" className="ml-2 text-xs">Pending</Badge>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Launch;
