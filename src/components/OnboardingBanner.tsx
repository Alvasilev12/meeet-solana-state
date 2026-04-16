import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Sparkles } from "lucide-react";

const OnboardingBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem("meeet_onboarding_completed");
    const dismissed = localStorage.getItem("meeet_onboarding_banner_dismissed");
    if (!done && !dismissed) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="mx-4 mt-2 pointer-events-auto bg-gradient-to-r from-[#9b87f5]/15 via-[#7c3aed]/10 to-[#9b87f5]/15 backdrop-blur-xl border border-[#9b87f5]/30 rounded-full px-4 py-2 flex items-center gap-3 shadow-lg shadow-[#9b87f5]/10 animate-fade-in">
        <Sparkles className="w-4 h-4 text-[#9b87f5] shrink-0" />
        <span className="text-sm text-foreground">
          New here?{" "}
          <Link to="/onboarding" className="font-semibold text-[#9b87f5] hover:underline">
            Start the guided tour →
          </Link>
        </span>
        <button
          onClick={() => {
            setVisible(false);
            localStorage.setItem("meeet_onboarding_banner_dismissed", "1");
          }}
          className="p-1 text-muted-foreground hover:text-foreground rounded-full"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default OnboardingBanner;
