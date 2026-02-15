import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { VoiceProvider } from "@/contexts/VoiceContext";
import VoiceController from "@/components/voice/VoiceController";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OfficialLogin from "./pages/OfficialLogin";
import OfficialRegister from "./pages/OfficialRegister";
import Schemes from "./pages/Schemes";
import About from "./pages/About";
import Feedback from "./pages/Feedback";
import CitizenDashboard from "./pages/citizen/CitizenDashboard";
import BookToken from "./pages/citizen/BookToken";
import MyTokens from "./pages/citizen/MyTokens";
import AIAssistant from "./pages/citizen/AIAssistant";
import AIAdvisor from "./pages/citizen/AIAdvisor";
import Notifications from "./pages/citizen/Notifications";
import OfficialDashboard from "./pages/official/OfficialDashboard";
import QueueManagement from "./pages/official/QueueManagement";
import Analytics from "./pages/official/Analytics";
import ScanPage from "./pages/official/ScanPage";
import VerificationPage from "./pages/official/VerificationPage";
import LiveQueue from "./pages/official/LiveQueue";
import Settings from "./pages/official/Settings";
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
            <VoiceProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/official/login" element={<OfficialLogin />} />
                <Route path="/official/register" element={<OfficialRegister />} />
                <Route path="/schemes" element={<Schemes />} />
                <Route path="/about" element={<About />} />
                <Route path="/feedback" element={<Feedback />} />

                {/* Citizen Routes */}
                <Route path="/citizen/dashboard" element={
                  <ProtectedRoute role="citizen">
                    <CitizenDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/citizen/book-token" element={
                  <ProtectedRoute role="citizen">
                    <BookToken />
                  </ProtectedRoute>
                } />
                <Route path="/citizen/my-tokens" element={
                  <ProtectedRoute role="citizen">
                    <MyTokens />
                  </ProtectedRoute>
                } />
                <Route path="/citizen/advisor" element={
                  <ProtectedRoute role="citizen">
                    <AIAdvisor />
                  </ProtectedRoute>
                } />
                <Route path="/citizen/assistant" element={
                  <ProtectedRoute role="citizen">
                    <AIAssistant />
                  </ProtectedRoute>
                } />
                <Route path="/citizen/notifications" element={
                  <ProtectedRoute role="citizen">
                    <Notifications />
                  </ProtectedRoute>
                } />

                {/* Official Routes */}
                <Route path="/official/dashboard" element={
                  <ProtectedRoute role="official">
                    <OfficialDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/official/queue" element={
                  <ProtectedRoute role="official">
                    <QueueManagement />
                  </ProtectedRoute>
                } />
                <Route path="/official/scan" element={
                  <ProtectedRoute role="official">
                    <ScanPage />
                  </ProtectedRoute>
                } />
                <Route path="/official/analytics" element={
                  <ProtectedRoute role="official">
                    <Analytics />
                  </ProtectedRoute>
                } />
                <Route path="/official/queue" element={
                  <ProtectedRoute role="official">
                    <LiveQueue />
                  </ProtectedRoute>
                } />
                <Route path="/official/settings" element={
                  <ProtectedRoute role="official">
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/official/verify/:tokenId" element={
                  <ProtectedRoute role="official">
                    <VerificationPage />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <VoiceController />
            </VoiceProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider >
);

export default App;
