import { Navigation } from "@/components/Navigation";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Loader2 } from "lucide-react";
import { useSyncClerkProfile } from "@/hooks/useSyncClerkProfile";

const Messages = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    name: string | null;
    isGroup: boolean;
    otherUserId?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Sync Clerk profile to Supabase
  useSyncClerkProfile();

  const handleConversationSelect = (conversation: {
    id: string;
    name: string | null;
    isGroup: boolean;
    otherUserId?: string;
  }) => {
    setSelectedConversation(conversation);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="container max-w-6xl mx-auto px-4 py-6 flex-1 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          {/* Conversation List */}
          <div className="md:col-span-1">
            <ConversationList 
              currentUserId={user.id}
              onConversationSelect={handleConversationSelect}
              selectedConversationId={selectedConversation?.id || null}
            />
          </div>

          {/* Chat Interface */}
          <div className="md:col-span-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : selectedConversation ? (
              <ChatInterface
                conversationId={selectedConversation.id}
                currentUserId={user.id}
                conversationName={selectedConversation.name}
                isGroup={selectedConversation.isGroup}
                otherUserId={selectedConversation.otherUserId}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Wähle eine Konversation aus, um zu chatten
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;
