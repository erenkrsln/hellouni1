import { useState, useEffect } from "react";
import { useNavigate, BrowserRouter, Routes, Route } from "react-router-dom"; // Importiere BrowserRouter von react-router-dom
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // Hole den Authentifizierungsstatus
  const navigate = useNavigate(); // useNavigate innerhalb des Router-Kontexts verwenden

  useEffect(() => {
    const checkAuth = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Warte für Authentifizierung
      if (user) {
        navigate("/home"); // Wenn der Nutzer eingeloggt ist, leite ihn direkt nach /home weiter
      } else {
        navigate("/auth"); // Wenn nicht, zeige die Authentifizierung
      }
    };

    checkAuth();
  }, [user, navigate]);

  if (loading) {
    return <SplashScreen onFinish={() => setLoading(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {" "}
        {/* BrowserRouter umschließt die gesamte App */}
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
