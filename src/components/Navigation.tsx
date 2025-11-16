import { Home, MessageCircle, Bell, Search, Calendar, MoreVertical, User, Settings, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import HelloUniLogo from "@/assets/HelloUni_Logo.svg";

export const Navigation = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState<{ username: string | null; full_name: string | null; avatar_url: string | null } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
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
                    {userProfile?.avatar_url && (
                      <AvatarImage src={userProfile.avatar_url} alt="Avatar" />
                    )}
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
                <DropdownMenuItem onClick={() => navigate(`/profile/${userProfile?.username || user?.email?.split('@')[0]}`)}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
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

          {/* Mobile Navigation - Profile Avatar with Sheet */}
          <div className="flex md:hidden items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar>
                    {userProfile?.avatar_url && (
                      <AvatarImage src={userProfile.avatar_url} alt="Avatar" />
                    )}
                    <AvatarFallback>
                      {userProfile?.full_name?.[0]?.toUpperCase() || 
                       userProfile?.username?.[0]?.toUpperCase() || 
                       user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0">
                <div className="flex flex-col h-full">
                  {/* User Info Header */}
                  <div className="p-6 border-b">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-12 w-12">
                        {userProfile?.avatar_url && (
                          <AvatarImage src={userProfile.avatar_url} alt="Avatar" />
                        )}
                        <AvatarFallback>
                          {userProfile?.full_name?.[0]?.toUpperCase() || 
                           userProfile?.username?.[0]?.toUpperCase() || 
                           user?.email?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {userProfile?.full_name || userProfile?.username || "User"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          @{userProfile?.username || user?.email?.split('@')[0]}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="flex-1 py-4">
                    <button
                      onClick={() => {
                        navigate(`/profile/${userProfile?.username || user?.email?.split('@')[0]}`);
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-4 px-6 py-4 w-full hover:bg-accent transition-colors"
                    >
                      <User className="h-6 w-6" />
                      <span className="text-lg font-medium">Profil</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-4 px-6 py-4 w-full hover:bg-accent transition-colors"
                    >
                      <Settings className="h-6 w-6" />
                      <span className="text-lg font-medium">Einstellungen</span>
                    </button>

                    <div className="border-t my-2" />

                    <button
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-4 px-6 py-4 w-full hover:bg-accent transition-colors"
                    >
                      <LogOut className="h-6 w-6" />
                      <span className="text-lg font-medium">Abmelden</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>;
};