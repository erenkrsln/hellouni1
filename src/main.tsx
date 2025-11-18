import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import App from "./App.tsx";
import { SplashScreen } from "./components/SplashScreen";
import "./index.css";

const Root = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check if this is the first load or a refresh
    const hasShownSplash = sessionStorage.getItem('hasShownSplash');
    if (hasShownSplash) {
      setShowSplash(false);
    } else {
      sessionStorage.setItem('hasShownSplash', 'true');
    }
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return <App />;
};

createRoot(document.getElementById("root")!).render(<Root />);
