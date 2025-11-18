import { useEffect, useState } from "react";

export const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false); // Verstecke den Splash Screen
      setTimeout(onFinish, 300); // Warte für fade-out Animation und rufe den onFinish-Callback auf
    }, 500); // 500ms für den Splash Screen anzeige

    return () => clearTimeout(timer); // Bereinigen des Timers
  }, [onFinish]);

  if (!isVisible) return null; // Verstecke den Splash Screen nach dem Fade-out

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
    >
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
        <img src="/logo.jpg" alt="HelloUni" className="w-48 h-48 object-contain" />
      </div>
    </div>
  );
};
