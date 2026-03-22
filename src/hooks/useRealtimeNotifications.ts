import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const EVENT_LABELS: Record<string, { icon: string; title: string }> = {
  duel: { icon: "⚔️", title: "New Duel" },
  discovery: { icon: "🔬", title: "Discovery Published" },
  quest: { icon: "📜", title: "Quest Update" },
  trade: { icon: "📊", title: "Trade Completed" },
  alliance: { icon: "🤝", title: "Alliance Request" },
  reward: { icon: "🏆", title: "Reward Earned" },
  deploy: { icon: "🚀", title: "Agent Deployed" },
};

export function useRealtimeNotifications() {
  const { toast } = useToast();
  const { user } = useAuth();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Subscribe to activity feed for global events
    const feedChannel = supabase
      .channel("rt-activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, (payload) => {
        if (!mountedRef.current) return;
        const row = payload.new as any;
        const meta = EVENT_LABELS[row.event_type] || { icon: "📡", title: "Event" };
        toast({
          title: `${meta.icon} ${meta.title}`,
          description: row.title?.slice(0, 100),
          duration: 4000,
        });
      })
      .subscribe();

    // Subscribe to user-specific notifications
    let notifChannel: any = null;
    if (user?.id) {
      notifChannel = supabase
        .channel(`rt-notif-${user.id}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "notifications",
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          if (!mountedRef.current) return;
          const row = payload.new as any;
          toast({
            title: row.title,
            description: row.body?.slice(0, 120),
            duration: 5000,
          });
        })
        .subscribe();
    }

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(feedChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
    };
  }, [user?.id, toast]);
}
