import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search as SearchIcon, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const Search = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Fehler bei der Suche",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleProfileClick = (username: string | null) => {
    if (username) {
      navigate(`/profile/${username}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />
      
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Suche</h1>
          
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Nutzer suchen..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          {isSearching ? (
            <p className="text-center text-muted-foreground py-8">Suche läuft...</p>
          ) : searchQuery.trim().length < 2 ? (
            <p className="text-center text-muted-foreground py-8">
              Gib mindestens 2 Zeichen ein, um zu suchen
            </p>
          ) : results.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Keine Ergebnisse gefunden
            </p>
          ) : (
            results.map((profile) => (
              <Card
                key={profile.id}
                className="p-4 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleProfileClick(profile.username)}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    {profile.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.username || "User"} />
                    ) : null}
                    <AvatarFallback>
                      {profile.full_name?.[0]?.toUpperCase() || 
                       profile.username?.[0]?.toUpperCase() || 
                       <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {profile.full_name || "Unbekannt"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{profile.username || "unbekannt"}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
};

export default Search;
