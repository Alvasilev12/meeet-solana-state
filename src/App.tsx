import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/query-core";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import MobileBottomNav from "@/components/MobileBottomNav";
import React, { Suspense } from "react";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { AnimatePresence, motion } from "framer-motion";

// Lazy load all pages for code splitting
const Index = React.lazy(() => import("./pages/Index.tsx"));
const LiveMap = React.lazy(() => import("./pages/LiveMap.tsx"));
const Quests = React.lazy(() => import("./pages/Quests.tsx"));
const DailyQuests = React.lazy(() => import("./pages/DailyQuests.tsx"));
const Achievements = React.lazy(() => import("./pages/Achievements.tsx"));
const Auth = React.lazy(() => import("./pages/Auth.tsx"));
const Rankings = React.lazy(() => import("./pages/Rankings.tsx"));
const Dashboard = React.lazy(() => import("./pages/Dashboard.tsx"));
const AgentDashboard = React.lazy(() => import("./pages/AgentDashboard.tsx"));
const Parliament = React.lazy(() => import("./pages/Parliament.tsx"));
const Herald = React.lazy(() => import("./pages/Herald.tsx"));
const Onboarding = React.lazy(() => import("./pages/Onboarding.tsx"));
const ProfilePage = React.lazy(() => import("./pages/Profile.tsx"));
const Tokenomics = React.lazy(() => import("./pages/Tokenomics.tsx"));
const Arena = React.lazy(() => import("./pages/Arena.tsx"));
const Social = React.lazy(() => import("./pages/Social.tsx"));
const Admin = React.lazy(() => import("./pages/Admin.tsx"));
const Connect = React.lazy(() => import("./pages/Connect.tsx"));
const Join = React.lazy(() => import("./pages/Join.tsx"));
const BadgeGenerator = React.lazy(() => import("./pages/BadgeGenerator.tsx"));
const Referrals = React.lazy(() => import("./pages/Referrals.tsx"));
const About = React.lazy(() => import("./pages/About.tsx"));
const World = React.lazy(() => import("./pages/World.tsx"));
const WorldRankings = React.lazy(() => import("./pages/WorldRankings.tsx"));
const CountryPage = React.lazy(() => import("./pages/CountryPage.tsx"));
const Discoveries = React.lazy(() => import("./pages/Discoveries.tsx"));
const Oracle = React.lazy(() => import("./pages/Oracle.tsx"));
const Warnings = React.lazy(() => import("./pages/Warnings.tsx"));
const Deploy = React.lazy(() => import("./pages/Deploy.tsx"));
const Strategies = React.lazy(() => import("./pages/Strategies.tsx"));
const AgentMarketplace = React.lazy(() => import("./pages/AgentMarketplace.tsx"));
const Guilds = React.lazy(() => import("./pages/Guilds.tsx"));
const OracleConsensus = React.lazy(() => import("./pages/OracleConsensus.tsx"));
const AgentProfile = React.lazy(() => import("./pages/AgentProfile.tsx"));
const AgentById = React.lazy(() => import("./pages/AgentById.tsx"));
const TelegramApp = React.lazy(() => import("./pages/TelegramApp.tsx"));
const BreedingLab = React.lazy(() => import("./pages/BreedingLab.tsx"));
const Guide = React.lazy(() => import("./pages/Guide.tsx"));
const Pricing = React.lazy(() => import("./pages/Pricing.tsx"));
const SkyeProfile = React.lazy(() => import("./pages/SkyeProfile.tsx"));
const SystemMonitor = React.lazy(() => import("./pages/SystemMonitor.tsx"));
const ProductHunt = React.lazy(() => import("./pages/ProductHunt.tsx"));
const Press = React.lazy(() => import("./pages/Press.tsx"));
const SocialContent = React.lazy(() => import("./pages/SocialContent.tsx"));
const AgentsForSale = React.lazy(() => import("./pages/AgentsForSale.tsx"));
const Academy = React.lazy(() => import("./pages/Academy.tsx"));
const Launch = React.lazy(() => import("./pages/Launch.tsx"));
const SimulationLab = React.lazy(() => import("./pages/SimulationLab.tsx"));
const Skills = React.lazy(() => import("./pages/Skills.tsx"));
const Activity = React.lazy(() => import("./pages/Activity.tsx"));
const Reports = React.lazy(() => import("./pages/Reports.tsx"));
const Chat = React.lazy(() => import("./pages/Chat.tsx"));
const Leaderboard = React.lazy(() => import("./pages/Leaderboard.tsx"));
const IntellraMarketplace = React.lazy(() => import("./pages/IntellraMarketplace.tsx"));
const Partners = React.lazy(() => import("./pages/Partners.tsx"));
const Discord = React.lazy(() => import("./pages/Discord.tsx"));
const Install = React.lazy(() => import("./pages/Install.tsx"));
const Token = React.lazy(() => import("./pages/Token.tsx"));
const Mission = React.lazy(() => import("./pages/Mission.tsx"));
const Passport = React.lazy(() => import("./pages/Passport.tsx"));
const DIDDocument = React.lazy(() => import("./pages/DIDDocument.tsx"));
const Staking = React.lazy(() => import("./pages/Staking.tsx"));
const GovernancePage = React.lazy(() => import("./pages/Governance.tsx"));
const Attestations = React.lazy(() => import("./pages/Attestations.tsx"));
const VeroQ = React.lazy(() => import("./pages/VeroQ.tsx"));
const SocialGraph = React.lazy(() => import("./pages/SocialGraph.tsx"));
const ArenaEnhanced = React.lazy(() => import("./pages/ArenaEnhanced.tsx"));
const AgentStudio = React.lazy(() => import("./pages/AgentStudio.tsx"));
const ConnectorHub = React.lazy(() => import("./pages/ConnectorHub.tsx"));
const AgentAnalytics = React.lazy(() => import("./pages/AgentAnalytics.tsx"));
const AgentDetailPage = React.lazy(() => import("./pages/AgentDetailPage.tsx"));
const Developer = React.lazy(() => import("./pages/Developer.tsx"));
const Terms = React.lazy(() => import("./pages/Terms.tsx"));
const Privacy = React.lazy(() => import("./pages/Privacy.tsx"));
const Cookies = React.lazy(() => import("./pages/Cookies.tsx"));
const Disclaimer = React.lazy(() => import("./pages/Disclaimer.tsx"));
const NotFound = React.lazy(() => import("./pages/NotFound.tsx"));
const Sara = React.lazy(() => import("./pages/Sara.tsx"));
const Explorer = React.lazy(() => import("./pages/Explorer.tsx"));
const Explore = React.lazy(() => import("./pages/Explore.tsx"));
const Roles = React.lazy(() => import("./pages/Roles.tsx"));
const Callback = React.lazy(() => import("./pages/Callback.tsx"));
const LiveDashboard = React.lazy(() => import("./pages/LiveDashboard.tsx"));
const DeveloperPortal = React.lazy(() => import("./pages/DeveloperPortal.tsx"));
const MolTrust = React.lazy(() => import("./pages/MolTrust.tsx"));
const SocialBot = React.lazy(() => import("./pages/SocialBot.tsx"));
const Newsletter = React.lazy(() => import("./pages/Newsletter.tsx"));
const ApiDocs = React.lazy(() => import("./pages/ApiDocs.tsx"));
const Bounties = React.lazy(() => import("./pages/Bounties.tsx"));
const BountyDetail = React.lazy(() => import("./pages/BountyDetail.tsx"));
const WorldMapPage = React.lazy(() => import("./pages/WorldMap.tsx"));
const LaunchPad = React.lazy(() => import("./pages/LaunchPad.tsx"));
const Playground = React.lazy(() => import("./pages/Playground.tsx"));
const Calculator = React.lazy(() => import("./pages/Calculator.tsx"));
const AITools = React.lazy(() => import("./pages/AITools.tsx"));
const TrustApi = React.lazy(() => import("./pages/TrustApi.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="space-y-4 flex flex-col items-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <div className="flex gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-20 h-3 rounded bg-muted animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

const ScrollToTop = React.lazy(() => import("@/components/ScrollToTop"));
const FloatingAgentCounter = React.lazy(() => import("@/components/FloatingAgentCounter"));
const AchievementTicker = React.lazy(() => import("@/components/AchievementTicker"));
const ExitIntentPopup = React.lazy(() => import("@/components/ExitIntentPopup"));
const FloatingTokenBanner = React.lazy(() => import("@/components/FloatingTokenBanner"));
const ShareEarnButton = React.lazy(() => import("@/components/ShareEarnButton"));

const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  useRealtimeNotifications();
  useOnlineStatus();
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Routes location={location}>
          <Route path="/" element={<RouteErrorBoundary><Index /></RouteErrorBoundary>} />
          <Route path="/live" element={<RouteErrorBoundary><LiveDashboard /></RouteErrorBoundary>} />
          <Route path="/map" element={<RouteErrorBoundary><LiveMap /></RouteErrorBoundary>} />
          <Route path="/quests" element={<RouteErrorBoundary><Quests /></RouteErrorBoundary>} />
          <Route path="/daily-quests" element={<RouteErrorBoundary><DailyQuests /></RouteErrorBoundary>} />
          <Route path="/achievements" element={<RouteErrorBoundary><Achievements /></RouteErrorBoundary>} />
          <Route path="/auth" element={<RouteErrorBoundary><Auth /></RouteErrorBoundary>} />
          <Route path="/rankings" element={<RouteErrorBoundary><Rankings /></RouteErrorBoundary>} />
          <Route path="/dashboard" element={<RouteErrorBoundary><Dashboard /></RouteErrorBoundary>} />
          <Route path="/dashboard/agents" element={<RouteErrorBoundary><AgentDashboard /></RouteErrorBoundary>} />
          <Route path="/parliament" element={<RouteErrorBoundary><Parliament /></RouteErrorBoundary>} />
          <Route path="/herald" element={<RouteErrorBoundary><Herald /></RouteErrorBoundary>} />
          <Route path="/onboarding" element={<RouteErrorBoundary><Onboarding /></RouteErrorBoundary>} />
          <Route path="/profile" element={<RouteErrorBoundary><ProfilePage /></RouteErrorBoundary>} />
          <Route path="/tokenomics" element={<RouteErrorBoundary><Tokenomics /></RouteErrorBoundary>} />
          <Route path="/arena" element={<RouteErrorBoundary><ArenaEnhanced /></RouteErrorBoundary>} />
          <Route path="/social" element={<RouteErrorBoundary><Social /></RouteErrorBoundary>} />
          <Route path="/social-graph" element={<RouteErrorBoundary><SocialGraph /></RouteErrorBoundary>} />
          <Route path="/admin" element={<RouteErrorBoundary><Admin /></RouteErrorBoundary>} />
          <Route path="/connect" element={<RouteErrorBoundary><Connect /></RouteErrorBoundary>} />
          <Route path="/join" element={<RouteErrorBoundary><Join /></RouteErrorBoundary>} />
          <Route path="/tools/badge" element={<RouteErrorBoundary><BadgeGenerator /></RouteErrorBoundary>} />
          <Route path="/dashboard/referrals" element={<RouteErrorBoundary><Referrals /></RouteErrorBoundary>} />
          <Route path="/referrals" element={<RouteErrorBoundary><Referrals /></RouteErrorBoundary>} />
          <Route path="/about" element={<RouteErrorBoundary><About /></RouteErrorBoundary>} />
          <Route path="/world" element={<RouteErrorBoundary><World /></RouteErrorBoundary>} />
          <Route path="/world/rankings" element={<RouteErrorBoundary><WorldRankings /></RouteErrorBoundary>} />
          <Route path="/country/:code" element={<RouteErrorBoundary><CountryPage /></RouteErrorBoundary>} />
          <Route path="/discoveries" element={<RouteErrorBoundary><Discoveries /></RouteErrorBoundary>} />
          <Route path="/oracle" element={<RouteErrorBoundary><Oracle /></RouteErrorBoundary>} />
          <Route path="/oracle/consensus" element={<RouteErrorBoundary><OracleConsensus /></RouteErrorBoundary>} />
          <Route path="/warnings" element={<RouteErrorBoundary><Warnings /></RouteErrorBoundary>} />
          <Route path="/deploy" element={<RouteErrorBoundary><Deploy /></RouteErrorBoundary>} />
          <Route path="/strategies" element={<RouteErrorBoundary><Strategies /></RouteErrorBoundary>} />
          <Route path="/marketplace" element={<RouteErrorBoundary><AgentMarketplace /></RouteErrorBoundary>} />
          <Route path="/marketplace/:agentId" element={<RouteErrorBoundary><AgentDetailPage /></RouteErrorBoundary>} />
          <Route path="/guilds" element={<RouteErrorBoundary><Guilds /></RouteErrorBoundary>} />
          <Route path="/agent/:name" element={<RouteErrorBoundary><AgentProfile /></RouteErrorBoundary>} />
          <Route path="/agents/:agentId" element={<RouteErrorBoundary><AgentById /></RouteErrorBoundary>} />
          <Route path="/breeding" element={<RouteErrorBoundary><BreedingLab /></RouteErrorBoundary>} />
          <Route path="/tg" element={<RouteErrorBoundary><TelegramApp /></RouteErrorBoundary>} />
          <Route path="/guide" element={<RouteErrorBoundary><Guide /></RouteErrorBoundary>} />
          <Route path="/pricing" element={<RouteErrorBoundary><Pricing /></RouteErrorBoundary>} />
          <Route path="/skyeprofile" element={<RouteErrorBoundary><SkyeProfile /></RouteErrorBoundary>} />
          <Route path="/monitor" element={<RouteErrorBoundary><SystemMonitor /></RouteErrorBoundary>} />
          <Route path="/product-hunt" element={<RouteErrorBoundary><ProductHunt /></RouteErrorBoundary>} />
          <Route path="/press" element={<RouteErrorBoundary><Press /></RouteErrorBoundary>} />
          <Route path="/social-content" element={<RouteErrorBoundary><SocialContent /></RouteErrorBoundary>} />
          <Route path="/agents-for-sale" element={<RouteErrorBoundary><AgentsForSale /></RouteErrorBoundary>} />
          <Route path="/academy" element={<RouteErrorBoundary><Academy /></RouteErrorBoundary>} />
          <Route path="/launch" element={<RouteErrorBoundary><Launch /></RouteErrorBoundary>} />
          <Route path="/simulation" element={<RouteErrorBoundary><SimulationLab /></RouteErrorBoundary>} />
          <Route path="/skills" element={<RouteErrorBoundary><Skills /></RouteErrorBoundary>} />
          <Route path="/partners" element={<RouteErrorBoundary><Partners /></RouteErrorBoundary>} />
          <Route path="/discord" element={<RouteErrorBoundary><Discord /></RouteErrorBoundary>} />
          <Route path="/install" element={<RouteErrorBoundary><Install /></RouteErrorBoundary>} />
          <Route path="/token" element={<RouteErrorBoundary><Token /></RouteErrorBoundary>} />
          <Route path="/mission" element={<RouteErrorBoundary><Mission /></RouteErrorBoundary>} />
          <Route path="/passport" element={<RouteErrorBoundary><Passport /></RouteErrorBoundary>} />
          <Route path="/passport/:agentId" element={<RouteErrorBoundary><Passport /></RouteErrorBoundary>} />
          <Route path="/did" element={<RouteErrorBoundary><DIDDocument /></RouteErrorBoundary>} />
          <Route path="/did/:agentId" element={<RouteErrorBoundary><DIDDocument /></RouteErrorBoundary>} />
          <Route path="/activity" element={<RouteErrorBoundary><Activity /></RouteErrorBoundary>} />
          <Route path="/reports" element={<RouteErrorBoundary><Reports /></RouteErrorBoundary>} />
          <Route path="/chat" element={<RouteErrorBoundary><Chat /></RouteErrorBoundary>} />
          <Route path="/leaderboard" element={<Navigate to="/arena" replace />} />
          <Route path="/intellra" element={<Navigate to="/marketplace" replace />} />
          <Route path="/staking" element={<RouteErrorBoundary><Staking /></RouteErrorBoundary>} />
          <Route path="/governance" element={<Navigate to="/parliament" replace />} />
          <Route path="/attestations" element={<RouteErrorBoundary><Attestations /></RouteErrorBoundary>} />
          <Route path="/veroq" element={<RouteErrorBoundary><VeroQ /></RouteErrorBoundary>} />
          <Route path="/agent-studio" element={<RouteErrorBoundary><AgentStudio /></RouteErrorBoundary>} />
          <Route path="/studio" element={<Navigate to="/agent-studio" replace />} />
          <Route path="/connector-hub" element={<RouteErrorBoundary><ConnectorHub /></RouteErrorBoundary>} />
          <Route path="/agent-analytics/:agentId" element={<RouteErrorBoundary><AgentAnalytics /></RouteErrorBoundary>} />
          <Route path="/developer" element={<RouteErrorBoundary><DeveloperPortal /></RouteErrorBoundary>} />
          <Route path="/terms" element={<RouteErrorBoundary><Terms /></RouteErrorBoundary>} />
          <Route path="/privacy" element={<RouteErrorBoundary><Privacy /></RouteErrorBoundary>} />
          <Route path="/cookies" element={<RouteErrorBoundary><Cookies /></RouteErrorBoundary>} />
          <Route path="/disclaimer" element={<RouteErrorBoundary><Disclaimer /></RouteErrorBoundary>} />
          <Route path="/sara" element={<RouteErrorBoundary><Sara /></RouteErrorBoundary>} />
          <Route path="/explore" element={<Navigate to="/discoveries" replace />} />
          <Route path="/explorer" element={<RouteErrorBoundary><Explorer /></RouteErrorBoundary>} />
          <Route path="/roles" element={<RouteErrorBoundary><Roles /></RouteErrorBoundary>} />
          <Route path="/callback" element={<RouteErrorBoundary><Callback /></RouteErrorBoundary>} />
          <Route path="/moltrust" element={<RouteErrorBoundary><MolTrust /></RouteErrorBoundary>} />
          <Route path="/social-bot" element={<RouteErrorBoundary><SocialBot /></RouteErrorBoundary>} />
          <Route path="/newsletter" element={<RouteErrorBoundary><Newsletter /></RouteErrorBoundary>} />
          <Route path="/agents" element={<Navigate to="/marketplace" replace />} />
          <Route path="/economy" element={<Navigate to="/token" replace />} />
          <Route path="/referral" element={<Navigate to="/referrals" replace />} />
          <Route path="/api" element={<RouteErrorBoundary><ApiDocs /></RouteErrorBoundary>} />
          <Route path="/bounties" element={<RouteErrorBoundary><Bounties /></RouteErrorBoundary>} />
          <Route path="/bounties/:id" element={<RouteErrorBoundary><BountyDetail /></RouteErrorBoundary>} />
          <Route path="/world-map" element={<Navigate to="/world" replace />} />
          <Route path="/launchpad" element={<RouteErrorBoundary><LaunchPad /></RouteErrorBoundary>} />
          <Route path="/playground" element={<RouteErrorBoundary><Playground /></RouteErrorBoundary>} />
          <Route path="/calculator" element={<RouteErrorBoundary><Calculator /></RouteErrorBoundary>} />
          <Route path="/ai-tools" element={<RouteErrorBoundary><AITools /></RouteErrorBoundary>} />
          <Route path="/trust-api" element={<RouteErrorBoundary><TrustApi /></RouteErrorBoundary>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
             <a href="#main-content" className="skip-to-content">Skip to main content</a>
             <RealtimeProvider>
                <Suspense fallback={<PageLoader />}>
                 <div id="main-content">
                 <AnimatedRoutes />
                 <MobileBottomNav />
                  <Suspense fallback={null}>
                    <ScrollToTop />
                    <FloatingAgentCounter />
                    <AchievementTicker />
                    <ExitIntentPopup />
                    <FloatingTokenBanner />
                    <ShareEarnButton />
                  </Suspense>
                 </div>
                </Suspense>
            </RealtimeProvider>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
