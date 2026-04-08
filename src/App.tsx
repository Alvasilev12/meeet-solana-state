import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/query-core";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import MobileBottomNav from "@/components/MobileBottomNav";
import React, { Suspense } from "react";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import ErrorBoundary from "@/components/ErrorBoundary";

// Lazy load all pages for code splitting
const Index = React.lazy(() => import("./pages/Index.tsx"));
const LiveMap = React.lazy(() => import("./pages/LiveMap.tsx"));
const Quests = React.lazy(() => import("./pages/Quests.tsx"));
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
const TelegramApp = React.lazy(() => import("./pages/TelegramApp.tsx"));
const BreedingLab = React.lazy(() => import("./pages/BreedingLab.tsx"));
const Guide = React.lazy(() => import("./pages/Guide.tsx"));
const Pricing = React.lazy(() => import("./pages/Pricing.tsx"));
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
const Roles = React.lazy(() => import("./pages/Roles.tsx"));
const Callback = React.lazy(() => import("./pages/Callback.tsx"));
const LiveDashboard = React.lazy(() => import("./pages/LiveDashboard.tsx"));
const DeveloperPortal = React.lazy(() => import("./pages/DeveloperPortal.tsx"));
const MolTrust = React.lazy(() => import("./pages/MolTrust.tsx"));
const SocialBot = React.lazy(() => import("./pages/SocialBot.tsx"));
const Newsletter = React.lazy(() => import("./pages/Newsletter.tsx"));

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

const FloatingAgentCounter = React.lazy(() => import("@/components/FloatingAgentCounter"));
const AchievementTicker = React.lazy(() => import("@/components/AchievementTicker"));
const ExitIntentPopup = React.lazy(() => import("@/components/ExitIntentPopup"));

const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  useRealtimeNotifications();
  return <>{children}</>;
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
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/live" element={<LiveDashboard />} />
                  <Route path="/map" element={<LiveMap />} />
                  <Route path="/quests" element={<Quests />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/rankings" element={<Rankings />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/dashboard/agents" element={<AgentDashboard />} />
                  <Route path="/parliament" element={<Parliament />} />
                  <Route path="/herald" element={<Herald />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/tokenomics" element={<Tokenomics />} />
                  <Route path="/arena" element={<ArenaEnhanced />} />
                  <Route path="/social" element={<Social />} />
                  <Route path="/social-graph" element={<SocialGraph />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/connect" element={<Connect />} />
                  <Route path="/join" element={<Join />} />
                  <Route path="/tools/badge" element={<BadgeGenerator />} />
                  <Route path="/dashboard/referrals" element={<Referrals />} />
                  <Route path="/referrals" element={<Referrals />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/world" element={<World />} />
                  <Route path="/world/rankings" element={<WorldRankings />} />
                  <Route path="/country/:code" element={<CountryPage />} />
                  <Route path="/discoveries" element={<Discoveries />} />
                  <Route path="/oracle" element={<Oracle />} />
                  <Route path="/oracle/consensus" element={<OracleConsensus />} />
                  <Route path="/warnings" element={<Warnings />} />
                  <Route path="/deploy" element={<Deploy />} />
                  <Route path="/strategies" element={<Strategies />} />
                  <Route path="/marketplace" element={<AgentMarketplace />} />
                  <Route path="/marketplace/:agentId" element={<AgentDetailPage />} />
                  <Route path="/guilds" element={<Guilds />} />
                  <Route path="/agent/:name" element={<AgentProfile />} />
                  <Route path="/breeding" element={<BreedingLab />} />
                  <Route path="/tg" element={<TelegramApp />} />
                  <Route path="/guide" element={<Guide />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/monitor" element={<SystemMonitor />} />
                  <Route path="/product-hunt" element={<ProductHunt />} />
                  <Route path="/press" element={<Press />} />
                  <Route path="/social-content" element={<SocialContent />} />
                  <Route path="/agents-for-sale" element={<AgentsForSale />} />
                  <Route path="/academy" element={<Academy />} />
                  <Route path="/launch" element={<Launch />} />
                  <Route path="/simulation" element={<SimulationLab />} />
                  <Route path="/skills" element={<Skills />} />
                  <Route path="/partners" element={<Partners />} />
                  <Route path="/discord" element={<Discord />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/token" element={<Token />} />
                  <Route path="/mission" element={<Mission />} />
                  <Route path="/passport" element={<Passport />} />
                  <Route path="/passport/:agentId" element={<Passport />} />
                  <Route path="/did" element={<DIDDocument />} />
                  <Route path="/did/:agentId" element={<DIDDocument />} />
                  <Route path="/activity" element={<Activity />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/leaderboard" element={<Navigate to="/rankings" replace />} />
                  <Route path="/intellra" element={<Navigate to="/marketplace" replace />} />
                  <Route path="/staking" element={<Staking />} />
                  <Route path="/governance" element={<GovernancePage />} />
                  <Route path="/attestations" element={<Attestations />} />
                  <Route path="/veroq" element={<VeroQ />} />
                  <Route path="/agent-studio" element={<AgentStudio />} />
                  <Route path="/studio" element={<Navigate to="/agent-studio" replace />} />
                  <Route path="/connector-hub" element={<ConnectorHub />} />
                  <Route path="/agent-analytics/:agentId" element={<AgentAnalytics />} />
                  <Route path="/developer" element={<DeveloperPortal />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/cookies" element={<Cookies />} />
                  <Route path="/disclaimer" element={<Disclaimer />} />
                   <Route path="/sara" element={<Sara />} />
                   <Route path="/explorer" element={<Explorer />} />
                   <Route path="/roles" element={<Roles />} />
                   <Route path="/callback" element={<Callback />} />
                    <Route path="/moltrust" element={<MolTrust />} />
                    <Route path="/social-bot" element={<SocialBot />} />
                    <Route path="/newsletter" element={<Newsletter />} />
                     {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                 <MobileBottomNav />
                 <Suspense fallback={null}>
                   <FloatingAgentCounter />
                   <AchievementTicker />
                   <ExitIntentPopup />
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
