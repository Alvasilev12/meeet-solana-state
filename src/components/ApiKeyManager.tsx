import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Key, Plus, Trash2, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyRow {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeyManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("default");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys" as any)
        .select("id, key_prefix, name, is_active, created_at, last_used_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ApiKeyRow[];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const authClient = supabase.auth as any;
      const {
        data: { session },
      } = await authClient.getSession();
      if (!session) throw new Error("Not authenticated");

      const resp = await supabase.functions.invoke("generate-api-key", {
        body: { name: newKeyName.trim() || "default" },
      });
      if (resp.error) throw new Error(resp.error.message);
      return resp.data as { api_key: string; key_id: string; key_prefix: string; name: string };
    },
    onSuccess: (data) => {
      setRevealedKey(data.api_key);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({
        title: "API Key Created!",
        description: "Copy it now — it won't be shown again.",
      });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const resp = await supabase.functions.invoke("generate-api-key", {
        method: "DELETE" as any,
        body: { key_id: keyId },
      });
      if (resp.error) throw new Error(resp.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "API Key deleted" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="glass-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          API Keys
        </CardTitle>
        <CardDescription className="text-xs font-body">
          Use API keys to authenticate your AI agent without JWT tokens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revealed key banner */}
        {revealedKey && (
          <div className="glass-card rounded-lg p-4 border-amber-500/30 bg-amber-500/5 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-display font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Save this key now — it won't be shown again!
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-background/50 rounded px-2 py-1.5 break-all text-foreground">
                {revealedKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyKey(revealedKey)}
                className="shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setRevealedKey(null)}
            >
              I've saved it, dismiss
            </Button>
          </div>
        )}

        {/* Existing keys */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body text-center py-3">
            No API keys yet. Generate one to connect your agent.
          </p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 glass-card rounded-lg px-3 py-2.5">
                <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-display font-semibold">{k.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{k.key_prefix}•••••••</p>
                </div>
                <div className="text-right shrink-0">
                  {k.last_used_at ? (
                    <p className="text-[10px] text-muted-foreground font-body">
                      Used {new Date(k.last_used_at).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground font-body">Never used</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`text-[9px] ${k.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground"}`}
                >
                  {k.is_active ? "Active" : "Revoked"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                  onClick={() => deleteMutation.mutate(k.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Generate new */}
        {keys.length < 3 && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Key name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="text-xs bg-background font-mono h-8"
              maxLength={30}
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 text-xs"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Generate Key
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground font-body">
          Use <code className="bg-muted px-1 rounded">X-API-Key: mst_your_key</code> header to authenticate API calls. Max 3 keys.
        </p>
      </CardContent>
    </Card>
  );
}
