import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { ScrollToTop } from "./components/ScrollToTop";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import SavedJobs from "./pages/SavedJobs";
import CandidateProfile from "./pages/CandidateProfile";
import CVBuilderPage from "./pages/CVBuilder";
import FuelUp from "./pages/FuelUp";
import Credits from "./pages/Credits";
import InterviewPrep from "./pages/InterviewPrep";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CreditsProvider>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/p/:userId" element={<PublicProfile />} />
                <Route path="/saved-jobs" element={<SavedJobs />} />
                <Route path="/candidate/:candidateId" element={<CandidateProfile />} />
                <Route path="/cv-builder" element={<CVBuilderPage />} />
                <Route path="/fuel-up" element={<FuelUp />} />
                <Route path="/credits" element={<Credits />} />
                <Route path="/interview-prep" element={<InterviewPrep />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CreditsProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
