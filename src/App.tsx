import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext"; // useAuth hinzufügen
import { ScrollToTop } from "@/components/ScrollToTop";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import SplashScreen from "@/components/SplashScreen"; // SplashScreen importieren

const queryClient = new QueryClient();

const App = () => {
  const [loading, setLoading] = useState(true); // Ladezustand
  const { user } = useAuth(); // Hole den Authentifizierungsstatus
  const navigate = useNavigate();

  const handleSplashFinish = () => {
    setLoading(false); // Wenn der Splash Screen verschwindet, wird der Rest der App geladen
  };

  useEffect(() => {
    // Überprüfe den Authentifizierungsstatus und leite den Nutzer weiter
    const checkAuth = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Warte für Authentifizierung
      if (user) {
        navigate("/home"); // Wenn der Nutzer eingeloggt ist, leite ihn nach /home weiter
      } else {
        navigate("/"); // Wenn nicht, zeige die Startseite
      }
    };

    checkAuth();
  }, [user, navigate]);

  // Zeige den Splash Screen, solange die App lädt
  if (loading) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route element={<AppLayout />}>
                <Route path="/home" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile/:username" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
