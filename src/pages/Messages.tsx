import { Navigation } from "@/components/Navigation";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserList } from "@/components/chat/UserList";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Loader2 } from "lucide-react";

const Messages = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUserSelect = async (userId: string) => {
    setSelectedUserId(userId);
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .rpc('get_or_create_conversation', { other_user_id: userId });

      if (error) throw error;
      setConversationId(data);
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
          {/* User List */}
          <div className="md:col-span-1">
            <UserList 
              currentUserId={user.id}
              onUserSelect={handleUserSelect}
              selectedUserId={selectedUserId}
            />
          </div>

          {/* Chat Interface */}
          <div className="md:col-span-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : conversationId && selectedUserId ? (
              <ChatInterface
                conversationId={conversationId}
                currentUserId={user.id}
                otherUserId={selectedUserId}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Wähle einen Nutzer aus, um zu chatten
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;
