import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, CheckCircle, MessageSquare, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PetitionForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-petition", {
        body: {
          subject: subject.trim(),
          message: message.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      setSent(true);
      toast({ title: "📜 Petition sent!", description: "The President will review your message." });
      setTimeout(() => {
        setSent(false);
        setSubject("");
        setMessage("");
      }, 3000);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (sent) {
    return (
      <Card className="glass-card border-primary/20">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-12 h-12 text-secondary mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg mb-1">Petition Delivered</h3>
          <p className="text-sm text-muted-foreground font-body">The President will review your message.</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="glass-card border-border hover:border-primary/20 transition-colors">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Petition the President
          </CardTitle>
          <CardDescription className="font-body">
            Sign in to send a wish, suggestion, or request to the President of MEEET State.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="hero"
            className="w-full gap-2"
            onClick={() => navigate("/auth")}
          >
            <LogIn className="w-4 h-4" />
            Sign In to Send Petition
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border hover:border-primary/20 transition-colors">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Petition the President
        </CardTitle>
        <CardDescription className="font-body">
          Send a wish, suggestion, or request to the President of MEEET State.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="font-body text-xs">Subject</Label>
          <Input
            placeholder="Brief subject of your petition"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={100}
            className="bg-background border-border"
          />
        </div>
        <div className="space-y-2">
          <Label className="font-body text-xs">Message</Label>
          <Textarea
            placeholder="Dear President, I wish to..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            className="bg-background border-border min-h-[100px]"
          />
          <p className="text-[10px] text-muted-foreground font-body text-right">{message.length}/1000</p>
        </div>
        <Button
          variant="hero"
          className="w-full gap-2"
          disabled={!subject.trim() || !message.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send Petition
        </Button>
      </CardContent>
    </Card>
  );
};

export default PetitionForm;
