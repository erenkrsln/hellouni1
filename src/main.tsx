import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { BrowserRouter, useNavigate, useLocation } from "react-router-dom";
import App from "./App.tsx";
import { SplashScreen } from "./components/SplashScreen";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./index.css";

const SplashAndRouter = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [initialAuthCheck, setInitialAuthCheck] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if splash has been shown this session
  useEffect(() => {
    const hasShownSplash = sessionStorage.getItem('hasShownSplash');
    if (hasShownSplash) {
      setShowSplash(false);
    } else {
      sessionStorage.setItem('hasShownSplash', 'true');
    }
  }, []);

  // Handle initial auth redirect after splash
  useEffect(() => {
    if (!loading && !initialAuthCheck) {
      setInitialAuthCheck(true);
      
      // If user is logged in and on landing page, redirect to home immediately
      if (user && location.pathname === '/') {
        navigate('/home', { replace: true });
      }
    }
  }, [loading, user, initialAuthCheck, location.pathname, navigate]);

  // Show splash screen
  if (showSplash && !initialAuthCheck) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return <App />;
};

const Root = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SplashAndRouter />
      </AuthProvider>
    </BrowserRouter>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
