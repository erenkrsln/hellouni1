import { Home, MessageCircle, Bell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const BottomNavigation = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return;

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setUnreadCount(count || 0);
    };

    if (user) {
      fetchUnreadCount();

      const channel = supabase
        .channel("bottom-nav-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg pb-safe">
      <div className="flex items-center justify-around h-16 px-4">
        <NavLink
          to="/home"
          className="flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg transition-colors"
          activeClassName="text-primary"
        >
          <Home className="h-6 w-6" />
          <span className="text-xs">Startseite</span>
        </NavLink>

        <NavLink
          to="/messages"
          className="flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg transition-colors"
          activeClassName="text-primary"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="text-xs">Nachrichten</span>
        </NavLink>

        <NavLink
          to="/notifications"
          className="flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg transition-colors"
          activeClassName="text-primary"
        >
          <div className="relative">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 min-w-5 px-1 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </div>
          <span className="text-xs">Benachricht.</span>
        </NavLink>
      </div>
    </nav>
  );
};
