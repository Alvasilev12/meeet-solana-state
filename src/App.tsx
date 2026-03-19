import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/query-core";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import Index from "./pages/Index.tsx";
import LiveMap from "./pages/LiveMap.tsx";
import Quests from "./pages/Quests.tsx";
import Auth from "./pages/Auth.tsx";
import Rankings from "./pages/Rankings.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Parliament from "./pages/Parliament.tsx";
import Herald from "./pages/Herald.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import ProfilePage from "./pages/Profile.tsx";
import Tokenomics from "./pages/Tokenomics.tsx";
import Arena from "./pages/Arena.tsx";
import Social from "./pages/Social.tsx";
import Admin from "./pages/Admin.tsx";
import Connect from "./pages/Connect.tsx";
import Join from "./pages/Join.tsx";
import BadgeGenerator from "./pages/BadgeGenerator.tsx";
import Referrals from "./pages/Referrals.tsx";
import About from "./pages/About.tsx";
import World from "./pages/World.tsx";
import WorldRankings from "./pages/WorldRankings.tsx";
import CountryPage from "./pages/CountryPage.tsx";
import Discoveries from "./pages/Discoveries.tsx";
import Oracle from "./pages/Oracle.tsx";
import Warnings from "./pages/Warnings.tsx";
import Deploy from "./pages/Deploy.tsx";
import Strategies from "./pages/Strategies.tsx";
import AgentMarketplace from "./pages/AgentMarketplace.tsx";
import Guilds from "./pages/Guilds.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/live" element={<LiveMap />} />
              <Route path="/quests" element={<Quests />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/parliament" element={<Parliament />} />
              <Route path="/herald" element={<Herald />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/tokenomics" element={<Tokenomics />} />
              <Route path="/arena" element={<Arena />} />
              <Route path="/social" element={<Social />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/connect" element={<Connect />} />
              <Route path="/join" element={<Join />} />
              <Route path="/tools/badge" element={<BadgeGenerator />} />
              <Route path="/dashboard/referrals" element={<Referrals />} />
              <Route path="/about" element={<About />} />
              <Route path="/world" element={<World />} />
              <Route path="/world/rankings" element={<WorldRankings />} />
              <Route path="/country/:code" element={<CountryPage />} />
              <Route path="/discoveries" element={<Discoveries />} />
              <Route path="/oracle" element={<Oracle />} />
              <Route path="/warnings" element={<Warnings />} />
              <Route path="/deploy" element={<Deploy />} />
              <Route path="/strategies" element={<Strategies />} />
              <Route path="/marketplace" element={<AgentMarketplace />} />
              <Route path="/guilds" element={<Guilds />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
