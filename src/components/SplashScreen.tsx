import { useEffect, useState } from 'react';

export const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <img 
          src="/logo.jpg" 
          alt="HelloUni" 
          className="w-48 h-48 object-contain"
        />
      </div>
    </div>
  );
};
