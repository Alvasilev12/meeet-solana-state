import { useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SHARE_TEXT = "Check out MEEET — the first AI Nation on Solana!";

const ShareEarnButton = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const refId =
    typeof window !== "undefined"
      ? localStorage.getItem("meeet_user_id") || "anon"
      : "anon";
  const shareUrl = `https://meeet.world?ref=${refId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const shareToX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer,width=600,height=400"
    );
  };

  const shareToTg = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(SHARE_TEXT)}`,
      "_blank",
      "noopener,noreferrer,width=600,height=400"
    );
  };

  return (
    <div className="fixed bottom-16 right-4 z-40">
      {open && (
        <div className="mb-2 bg-card border border-border rounded-xl p-4 shadow-2xl w-64 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold">Share & Earn</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Share your referral link and earn $MEEET for every signup!
          </p>
          <div className="flex gap-2 mb-3">
            <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={shareToX}>
              𝕏 Twitter
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={shareToTg}>
              ✈️ Telegram
            </Button>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="w-full text-xs gap-1.5"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      )}
      <Button
        size="icon"
        className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-purple-500 shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all"
        onClick={() => setOpen(!open)}
      >
        <Share2 className="w-5 h-5 text-white" />
      </Button>
    </div>
  );
};

export default ShareEarnButton;
