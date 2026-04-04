import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/runtime-client";
import { toast } from "sonner";

type PostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions<T> {
  table: string;
  event?: PostgresEvent;
  filter?: string;
  schema?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: T) => void;
  onChange?: (payload: T, eventType: PostgresEvent) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription<T = any>({
  table,
  event = "*",
  filter,
  schema = "public",
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeOptions<T>) {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${filter || "all"}-${Date.now()}`;
    const channelConfig: any = {
      event,
      schema,
      table,
    };
    if (filter) channelConfig.filter = filter;

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", channelConfig, (payload: any) => {
        const data = payload.new as T;
        const eventType = payload.eventType as PostgresEvent;

        if (eventType === "INSERT" && onInsert) onInsert(data);
        if (eventType === "UPDATE" && onUpdate) onUpdate(data);
        if (eventType === "DELETE" && onDelete) onDelete(payload.old as T);
        if (onChange) onChange(data, eventType);
      })
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          toast.warning("Live connection interrupted. Reconnecting...", { duration: 3000, id: `rt-${table}` });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [table, event, filter, schema, enabled]);

  return { isConnected };
}
