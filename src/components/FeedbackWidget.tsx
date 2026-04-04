import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/runtime-client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Star, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeedbackWidgetProps {
  contextType?: string;
  contextId?: string;
  agentId?: string;
  compact?: boolean;
}

export default function FeedbackWidget({ contextType, contextId, agentId, compact }: FeedbackWidgetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("user_feedback" as any).insert({
        user_id: user.id,
        agent_id: agentId || null,
        feedback_type: contextType || "general",
        rating,
        message: message.trim() || null,
        context_type: contextType || null,
        context_id: contextId || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Thanks for your feedback! 🙏" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!user) return null;

  if (submitted) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "py-2" : "glass-card rounded-xl p-4"} text-emerald-400`}>
        <Check className="w-4 h-4" />
        <span className="text-xs font-body">Thanks for your feedback!</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`w-4 h-4 ${s <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
              />
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Your feedback..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="bg-background/50 text-xs h-8 min-h-0 resize-none py-1.5"
          maxLength={500}
        />
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 text-xs h-8"
          disabled={rating === 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Submit"}
        </Button>
      </div>
    );
  }

  return (
    <Card className="glass-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground font-body mr-2">Rating:</span>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              className="transition-transform hover:scale-125 active:scale-95"
            >
              <Star
                className={`w-5 h-5 ${s <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
              />
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Что можно улучшить? Поделитесь мнением..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="bg-background/50 text-xs min-h-[60px]"
          maxLength={500}
        />
        <Button
          size="sm"
          className="w-full text-xs"
          disabled={rating === 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <MessageSquare className="w-3.5 h-3.5 mr-1" />}
          Submit отзыв
        </Button>
      </CardContent>
    </Card>
  );
}
