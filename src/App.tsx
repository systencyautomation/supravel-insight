import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import MasterDashboard from "./pages/master/MasterDashboard";
import Onboarding from "./pages/onboarding/Onboarding";
import ProfileSettings from "./pages/settings/ProfileSettings";
import OrganizationSettings from "./pages/settings/OrganizationSettings";
import TeamSettings from "./pages/settings/TeamSettings";
import IntegrationsSettings from "./pages/settings/IntegrationsSettings";
import JoinOrganization from "./pages/JoinOrganization";
import SalesApproval from "./pages/SalesApproval";
import NotFound from "./pages/NotFound";

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
            <Route path="/auth" element={<Auth />} />
            <Route path="/master" element={<MasterDashboard />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/settings/profile" element={<ProfileSettings />} />
            <Route path="/settings/organization" element={<OrganizationSettings />} />
            <Route path="/settings/team" element={<TeamSettings />} />
            <Route path="/settings/integrations" element={<IntegrationsSettings />} />
            <Route path="/aprovacao" element={<SalesApproval />} />
            <Route path="/profile" element={<Navigate to="/settings/profile" replace />} />
            <Route path="/join" element={<JoinOrganization />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
