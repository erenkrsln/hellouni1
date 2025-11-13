import { Home, MessageCircle, Bell, Search, Calendar, MoreVertical, User, Settings, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import HelloUniLogo from "@/assets/HelloUni_Logo.svg";

export const Navigation = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState<{ username: string | null; full_name: string | null } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", user.id)
        .maybeSingle();

      setUserProfile(profile);

      // Fetch unread count
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setUnreadCount(count || 0);
    };

    if (user) {
      fetchUserData();

      // Subscribe to new notifications
      const channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUserData();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUserData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  return <nav className="sticky top-0 z-50 bg-card border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <NavLink to="/home" className="flex-shrink-0 hover:opacity-80 transition-opacity">
            <img src={HelloUniLogo} alt="HelloUni" className="h-20 w-auto" />
          </NavLink>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Suchen..." className="pl-10 w-full" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>

          {/* Navigation Items - Desktop only */}
          <div className="hidden md:flex items-center gap-2 sm:gap-4">
            <NavLink to="/home" className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent">
              <Home className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs hidden sm:inline">Startseite</span>
            </NavLink>

            <NavLink to="/messages" className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent">
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs hidden sm:inline">Nachrichten</span>
            </NavLink>

            <NavLink to="/notifications" className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent">
              <div className="relative">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-5 px-1 flex items-center justify-center text-xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs hidden sm:inline">Benachrichtigungen</span>
            </NavLink>

            {/* Calendar Popover */}
            <Popover>
              <PopoverTrigger asChild>
                
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent mode="single" selected={date} onSelect={setDate} className="rounded-md" />
              </PopoverContent>
            </Popover>

            {/* Desktop User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarFallback>
                      {userProfile?.full_name?.[0]?.toUpperCase() || 
                       userProfile?.username?.[0]?.toUpperCase() || 
                       user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mein Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Einstellungen</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Abmelden</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Navigation - Only Profile Avatar */}
          <div className="flex md:hidden items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/profile/' + user?.email?.split('@')[0])}>
              <Avatar>
                <AvatarFallback>
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </div>
      </div>
    </nav>;
};