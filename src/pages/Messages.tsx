import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Loader2 } from "lucide-react";

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    name: string | null;
    isGroup: boolean;
    otherUserId?: string;
  } | null>(null);
  const [loading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile?.username) {
          navigate('/onboarding');
        }
      } catch (error) {
        // Silent fail
      } finally {
        setCheckingProfile(false);
      }
    };

    if (user) {
      checkProfile();
    }
  }, [user, navigate]);

  const handleConversationSelect = (conversation: {
    id: string;
    name: string | null;
    isGroup: boolean;
    otherUserId?: string;
  }) => {
    setSelectedConversation(conversation);
  };

  if (!user || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden pb-16 md:pb-0">
      {/* Navigation - Hidden on mobile when chat is open */}
      <div className={selectedConversation ? "hidden md:block" : ""}>
        <Navigation />
      </div>
      
      {/* Mobile View: Stack conversations and chat */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden">
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ConversationList
              currentUserId={user.id}
              onConversationSelect={handleConversationSelect}
              selectedConversationId={selectedConversation?.id || null}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <ChatInterface
              conversationId={selectedConversation.id}
              currentUserId={user.id}
              conversationName={selectedConversation.name}
              isGroup={selectedConversation.isGroup}
              otherUserId={selectedConversation.otherUserId}
              onBack={() => setSelectedConversation(null)}
            />
          </div>
        )}
      </div>

      {/* Desktop View: Side by side */}
      <main className="hidden md:flex container max-w-6xl mx-auto px-4 py-6 flex-1 flex-col overflow-hidden">
        <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
          <div className="col-span-1 h-[calc(100vh-12rem)]">
            <ConversationList
              currentUserId={user.id}
              onConversationSelect={handleConversationSelect}
              selectedConversationId={selectedConversation?.id || null}
            />
          </div>

          <div className="col-span-2 h-[calc(100vh-12rem)] flex flex-col min-h-0">
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
      <BottomNavigation />
    </div>
  );
};

export default Messages;
