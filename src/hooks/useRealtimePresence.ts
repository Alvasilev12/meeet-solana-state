import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PresenceState {
  onlineCitizens: number;
  activeAgents: number;
  currentPageViewers: string[];
}

const SIMULATED_BASE_CITIZENS = 127;
const SIMULATED_BASE_AGENTS = 686;

export function useRealtimePresence(currentPage?: string) {
  const { user } = useAuth();
  const [state, setState] = useState<PresenceState>({
    onlineCitizens: SIMULATED_BASE_CITIZENS,
    activeAgents: SIMULATED_BASE_AGENTS,
    currentPageViewers: [],
  });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectToastShown = useRef(false);

  useEffect(() => {
    const channel = supabase.channel("global-presence", {
      config: { presence: { key: user?.id || `anon-${Math.random().toString(36).slice(2, 8)}` } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        const realUsers = Object.keys(presenceState).length;
        const pageViewers: string[] = [];

        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (currentPage && p.page === currentPage && p.userId !== user?.id) {
              pageViewers.push(p.displayName || "Citizen");
            }
          });
        });

        setState({
          onlineCitizens: SIMULATED_BASE_CITIZENS + realUsers,
          activeAgents: SIMULATED_BASE_AGENTS + Math.floor(realUsers * 2.3),
          currentPageViewers: pageViewers.slice(0, 5),
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          reconnectToastShown.current = false;
          await channel.track({
            userId: user?.id || "anonymous",
            page: currentPage || "/",
            displayName: user?.email?.split("@")[0] || "Citizen",
            joinedAt: new Date().toISOString(),
          });
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (!reconnectToastShown.current) {
            reconnectToastShown.current = true;
            toast.warning("Reconnecting to live feed...", { duration: 3000 });
          }
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, currentPage]);

  // Update page when it changes
  const updatePage = useCallback((page: string) => {
    if (channelRef.current) {
      channelRef.current.track({
        userId: user?.id || "anonymous",
        page,
        displayName: user?.email?.split("@")[0] || "Citizen",
        joinedAt: new Date().toISOString(),
      });
    }
  }, [user]);

  return { ...state, updatePage };
}
