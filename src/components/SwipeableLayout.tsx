import { ReactNode, useEffect, useRef, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface SwipeableLayoutProps {
  children: ReactNode;
}

export function SwipeableLayout({ children }: SwipeableLayoutProps) {
  const [open, setOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only start tracking if swipe starts from left edge (first 50px)
      if (e.touches[0].clientX < 50) {
        setStartX(e.touches[0].clientX);
        setIsSwiping(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping) return;
      setCurrentX(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (!isSwiping) return;
      
      const diff = currentX - startX;
      
      // If swiped right more than 100px, open sidebar
      if (diff > 100) {
        setOpen(true);
      }
      
      setIsSwiping(false);
      setStartX(0);
      setCurrentX(0);
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isSwiping, startX, currentX]);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <div ref={containerRef} className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
