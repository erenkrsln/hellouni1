import { Home, MessageCircle, Bell, Search, Calendar, MoreVertical, User, Settings, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Input } from "@/components/ui/input";
import { UserButton, useClerk } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import HelloUniLogo from "@/assets/HelloUni_Logo.svg";
export const Navigation = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const {
    signOut
  } = useClerk();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
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
              <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
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
            <div className="flex-shrink-0">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            {/* Mobile Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Menü</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/home" className="flex items-center cursor-pointer">
                    <Home className="mr-2 h-4 w-4" />
                    <span>Startseite</span>
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <NavLink to="/messages" className="flex items-center cursor-pointer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    <span>Nachrichten</span>
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <NavLink to="/notifications" className="flex items-center cursor-pointer">
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Benachrichtigungen</span>
                  </NavLink>
                </DropdownMenuItem>
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
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Suchen..." className="pl-10 w-full" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </div>
    </nav>;
};