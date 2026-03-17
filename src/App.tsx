import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import LiveMap from "./pages/LiveMap.tsx";
import Quests from "./pages/Quests.tsx";
import Auth from "./pages/Auth.tsx";
import Rankings from "./pages/Rankings.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Parliament from "./pages/Parliament.tsx";
import Herald from "./pages/Herald.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
