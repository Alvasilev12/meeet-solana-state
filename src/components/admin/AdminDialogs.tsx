import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Search, Bot, User, Clock, Activity, Zap, BarChart3 } from "lucide-react";

function useAllDialogs() {
  return useQuery({
    queryKey: ["admin-all-dialogs"],
    queryFn: async () => {
      // Get recent chat messages with agent info
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("id, sender_type, sender_id, message, room_id, created_at, agent_id")
        .order("created_at", { ascending: false })
        .limit(200);

      // Group by room_id
      const rooms: Record<string, { messages: any[]; lastMsg: string; lastAt: string; agentId: string | null; userId: string | null }> = {};
      for (const m of (messages || [])) {
        const rid = m.room_id || "unknown";
        if (!rooms[rid]) {
          rooms[rid] = { messages: [], lastMsg: "", lastAt: m.created_at, agentId: m.agent_id, userId: null };
        }
        rooms[rid].messages.push(m);
        if (m.sender_type === "user" && !rooms[rid].userId) rooms[rid].userId = m.sender_id;
        if (!rooms[rid].lastMsg) { rooms[rid].lastMsg = m.message; rooms[rid].lastAt = m.created_at; }
      }

      return { rooms, totalMessages: messages?.length ?? 0, roomCount: Object.keys(rooms).length };
    },
    refetchInterval: 15000,
  });
}

function useSystemLoadStats() {
  return useQuery({
    queryKey: ["admin-system-load"],
    queryFn: async () => {
      const now = new Date();
      const h1 = new Date(now.getTime() - 3600000).toISOString();
      const h24 = new Date(now.getTime() - 86400000).toISOString();

      // Messages last hour
      const { count: msgsHour } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .gte("created_at", h1);

      // Messages last 24h
      const { count: msgs24h } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .gte("created_at", h24);

      // Total messages
      const { count: msgsTotal } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true });

      // Usage logs last hour
      const { count: actionsHour } = await supabase
        .from("usage_logs" as any)
        .select("id", { count: "exact", head: true })
        .gte("created_at", h1);

      // Usage logs last 24h
      const { count: actions24h } = await supabase
        .from("usage_logs" as any)
        .select("id", { count: "exact", head: true })
        .gte("created_at", h24);

      // Active agents (with messages in last 24h)
      const { data: activeAgents } = await supabase
        .from("chat_messages")
        .select("agent_id")
        .eq("sender_type", "agent")
        .gte("created_at", h24);

      const uniqueAgents = new Set(activeAgents?.map(a => a.agent_id).filter(Boolean));

      // Revenue last 24h
      const { data: revenue } = await supabase
        .from("usage_logs" as any)
        .select("cost_user")
        .gte("created_at", h24);

      const rev24h = revenue?.reduce((s: number, r: any) => s + (r.cost_user || 0), 0) || 0;

      return {
        msgsHour: msgsHour ?? 0,
        msgs24h: msgs24h ?? 0,
        msgsTotal: msgsTotal ?? 0,
        actionsHour: actionsHour ?? 0,
        actions24h: actions24h ?? 0,
        activeAgents24h: uniqueAgents.size,
        revenue24h: rev24h,
      };
    },
    refetchInterval: 30000,
  });
}

export default function AdminDialogs() {
  const [search, setSearch] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const { data: dialogs } = useAllDialogs();
  const { data: load } = useSystemLoadStats();

  const filteredRooms = dialogs?.rooms
    ? Object.entries(dialogs.rooms)
        .filter(([rid, r]) => {
          if (!search.trim()) return true;
          const s = search.toLowerCase();
          return rid.toLowerCase().includes(s) || r.lastMsg.toLowerCase().includes(s);
        })
        .sort((a, b) => new Date(b[1].lastAt).getTime() - new Date(a[1].lastAt).getTime())
    : [];

  const selectedMessages = selectedRoom && dialogs?.rooms[selectedRoom]
    ? [...dialogs.rooms[selectedRoom].messages].reverse()
    : [];

  return (
    <div className="space-y-6">
      {/* System Load Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <LoadCard icon={<MessageSquare className="w-5 h-5 text-blue-400" />} label="Messages/hour" value={load?.msgsHour ?? 0} color="#3B82F6" />
        <LoadCard icon={<Activity className="w-5 h-5 text-emerald-400" />} label="Messages/24h" value={load?.msgs24h ?? 0} color="#10B981" />
        <LoadCard icon={<Bot className="w-5 h-5 text-purple-400" />} label="Active agents (24h)" value={load?.activeAgents24h ?? 0} color="#8B5CF6" />
        <LoadCard icon={<Zap className="w-5 h-5 text-amber-400" />} label="Revenue 24h" value={`$${(load?.revenue24h ?? 0).toFixed(2)}`} color="#F59E0B" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <LoadCard icon={<BarChart3 className="w-5 h-5 text-cyan-400" />} label="Total messages" value={load?.msgsTotal ?? 0} color="#06B6D4" />
        <LoadCard icon={<Zap className="w-5 h-5 text-orange-400" />} label="Actions/hour" value={load?.actionsHour ?? 0} color="#F97316" />
        <LoadCard icon={<Activity className="w-5 h-5 text-pink-400" />} label="Actions/24h" value={load?.actions24h ?? 0} color="#EC4899" />
      </div>

      {/* Dialogs Browser */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            All Dialogs ({dialogs?.roomCount ?? 0} rooms)
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[500px]">
            {/* Room list */}
            <ScrollArea className="h-full border border-border rounded-lg">
              <div className="space-y-1 p-2">
                {filteredRooms.map(([rid, room]) => (
                  <button
                    key={rid}
                    onClick={() => setSelectedRoom(rid)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedRoom === rid ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-muted-foreground truncate max-w-[70%]">{rid}</span>
                      <span className="text-[10px] text-muted-foreground">{room.messages.length} msgs</span>
                    </div>
                    <p className="text-xs text-foreground truncate">{room.lastMsg}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      {new Date(room.lastAt).toLocaleString()}
                    </p>
                  </button>
                ))}
                {filteredRooms.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No dialogs found</p>
                )}
              </div>
            </ScrollArea>

            {/* Message viewer */}
            <ScrollArea className="h-full border border-border rounded-lg">
              <div className="p-3 space-y-2">
                {!selectedRoom && (
                  <p className="text-xs text-muted-foreground text-center py-12">Select a dialog to view messages</p>
                )}
                {selectedMessages.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                      msg.sender_type === "user"
                        ? "bg-amber-500/10 text-amber-200 border border-amber-500/20"
                        : "bg-muted/60 text-foreground"
                    }`}>
                      <div className="flex items-center gap-1 mb-0.5">
                        {msg.sender_type === "user"
                          ? <User className="w-3 h-3 text-amber-400" />
                          : <Bot className="w-3 h-3 text-primary" />
                        }
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className="glass-card border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
          {icon}
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-lg font-display font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
