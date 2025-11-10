import { Home, MessageCircle, Bell, Plus } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PostForm } from "@/components/PostForm";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const BottomNavigation = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
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

  const handlePostCreated = () => {
    setIsPostDialogOpen(false);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg pb-safe">
      <div className="flex items-center justify-around h-16 px-4">
        <NavLink
          to="/home"
          className="flex items-center justify-center p-3 rounded-lg transition-colors hover-scale"
          activeClassName="text-primary"
        >
          <Home className="h-6 w-6" />
        </NavLink>

        <NavLink
          to="/messages"
          className="flex items-center justify-center p-3 rounded-lg transition-colors hover-scale"
          activeClassName="text-primary"
        >
          <MessageCircle className="h-6 w-6" />
        </NavLink>

        <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
            >
              <Plus className="h-7 w-7" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neuen Beitrag erstellen</DialogTitle>
            </DialogHeader>
            <PostForm onPostCreated={handlePostCreated} />
          </DialogContent>
        </Dialog>

        <NavLink
          to="/notifications"
          className="flex items-center justify-center p-3 rounded-lg transition-colors hover-scale"
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
        </NavLink>

        {/* Placeholder for balance - empty space */}
        <div className="w-6" />
      </div>
    </nav>
  );
};
