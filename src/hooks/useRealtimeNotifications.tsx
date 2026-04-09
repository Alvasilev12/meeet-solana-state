import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { toast } from "sonner";
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

function getAgentInitials(name: string) {
  return name?.slice(0, 2).toUpperCase() || "AG";
}

function getAgentColor(name: string) {
  const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#ef4444", "#6366f1"];
  let hash = 0;
  for (const c of (name || "")) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function spawnConfetti() {
  const colors = ["#fbbf24", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#3b82f6"];
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden";
  document.body.appendChild(container);

  for (let i = 0; i < 40; i++) {
    const piece = document.createElement("div");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const size = 6 + Math.random() * 6;
    const rotation = Math.random() * 360;
    piece.style.cssText = `
      position:absolute;top:-10px;left:${left}%;width:${size}px;height:${size}px;
      background:${color};border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
      transform:rotate(${rotation}deg);
      animation:confetti-fall ${1.5 + Math.random()}s ease-out ${delay}s forwards;
    `;
    container.appendChild(piece);
  }

  if (!document.getElementById("confetti-style")) {
    const style = document.createElement("style");
    style.id = "confetti-style";
    style.textContent = `
      @keyframes confetti-fall {
        0% { opacity:1; transform:translateY(0) rotate(0deg); }
        100% { opacity:0; transform:translateY(100vh) rotate(720deg); }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => container.remove(), 3000);
}

/** Render a notification with an agent avatar circle */
function notifyWithAvatar(title: string, description: string, agentName?: string) {
  const name = agentName || title.split(" ")[0] || "Agent";
  const initials = getAgentInitials(name);
  const color = getAgentColor(name);

  toast(title, {
    description,
    duration: 5000,
    icon: (
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    ),
  });
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const mountedRef = useRef(true);

  const handleAchievement = useCallback(async (achievementId: string | null) => {
    if (!achievementId) return;
    const { data } = await supabase
      .from("achievements")
      .select("name, description, icon")
      .eq("id", achievementId)
      .maybeSingle();

    const name = (data as any)?.name || "Achievement Unlocked";
    const desc = (data as any)?.description || "You earned a new achievement!";
    const icon = (data as any)?.icon || "🏅";

    spawnConfetti();

    toast.success(`🏆 ${icon} ${name}`, {
      description: desc,
      duration: 6000,
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const feedChannel = supabase
      .channel("rt-activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" }, (payload) => {
        if (!mountedRef.current) return;
        const row = payload.new as any;
        const meta = EVENT_LABELS[row.event_type] || { icon: "📡", title: "Event" };
        notifyWithAvatar(
          `${meta.icon} ${meta.title}`,
          row.title?.slice(0, 100) || "",
          row.title?.split(" ")[0],
        );
      })
      .subscribe();

    let notifChannel: any = null;
    let achieveChannel: any = null;

    if (user?.id) {
      notifChannel = supabase
        .channel(`rt-notif-${user.id}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "notifications",
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          if (!mountedRef.current) return;
          const row = payload.new as any;
          notifyWithAvatar(
            row.title || "Notification",
            row.body?.slice(0, 120) || "",
          );
        })
        .subscribe();

      achieveChannel = supabase
        .channel(`rt-achievements-${user.id}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "user_achievements",
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          if (!mountedRef.current) return;
          const row = payload.new as any;
          handleAchievement(row.achievement_id);
        })
        .subscribe();
    }

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(feedChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (achieveChannel) supabase.removeChannel(achieveChannel);
    };
  }, [user?.id, handleAchievement]);
}
