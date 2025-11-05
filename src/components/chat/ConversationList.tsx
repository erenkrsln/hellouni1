import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Users, MessageSquarePlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  participants: {
    id: string;
    full_name: string | null;
    email: string | null;
  }[];
}

interface ConversationListProps {
  currentUserId: string;
  onConversationSelect: (conversation: {
    id: string;
    name: string | null;
    isGroup: boolean;
    otherUserId?: string;
  }) => void;
  selectedConversationId: string | null;
}

export const ConversationList = ({ 
  currentUserId, 
  onConversationSelect, 
  selectedConversationId 
}: ConversationListProps) => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [currentUserId]);

  const fetchConversations = async () => {
    try {
      // Get all conversations for the current user
      const { data: userConvs, error: convsError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      if (convsError) throw convsError;

      const conversationIds = userConvs.map(c => c.conversation_id);

      if (conversationIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get conversation details
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("id, name, is_group")
        .in("id", conversationIds);

      if (convError) throw convError;

      // Get all participants for these conversations
      const conversationsWithParticipants = await Promise.all(
        (convData || []).map(async (conv) => {
          const { data: participantData } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conv.id)
            .neq("user_id", currentUserId);

          const userIds = participantData?.map(p => p.user_id) || [];
          
          let participants: { id: string; full_name: string | null; email: string | null }[] = [];
          
          if (userIds.length > 0) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", userIds);
              
            participants = profileData?.map(p => ({
              id: p.id,
              full_name: p.full_name,
              email: p.email,
            })) || [];
          }

          return {
            ...conv,
            participants,
          };
        })
      );

      setConversations(conversationsWithParticipants);
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

  const handleConversationClick = async (conv: Conversation) => {
    if (conv.is_group) {
      onConversationSelect({
        id: conv.id,
        name: conv.name,
        isGroup: true,
      });
    } else {
      // For 1-on-1, get or create conversation
      const otherUser = conv.participants[0];
      if (otherUser) {
        const { data, error } = await supabase
          .rpc('get_or_create_conversation', { other_user_id: otherUser.id });

        if (error) {
          toast({
            title: "Fehler",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        onConversationSelect({
          id: data,
          name: otherUser.full_name,
          isGroup: false,
          otherUserId: otherUser.id,
        });
      }
    }
  };

  const getConversationDisplay = (conv: Conversation) => {
    if (conv.is_group) {
      return {
        name: conv.name || "Unbenannte Gruppe",
        subtitle: `${conv.participants.length + 1} Teilnehmer`,
        avatar: <Users className="h-5 w-5" />,
      };
    } else {
      const otherUser = conv.participants[0];
      return {
        name: otherUser?.full_name || "Unbekannter Nutzer",
        subtitle: otherUser?.email || "",
        avatar: otherUser?.full_name?.[0]?.toUpperCase() || "U",
      };
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchQuery.toLowerCase();
    const display = getConversationDisplay(conv);
    return (
      display.name.toLowerCase().includes(searchLower) ||
      display.subtitle.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Card className="h-full flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Nachrichten</h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowCreateGroup(true)}
            >
              <MessageSquarePlus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Konversationen suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Keine Konversationen gefunden
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conv) => {
                const display = getConversationDisplay(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleConversationClick(conv)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors ${
                      selectedConversationId === conv.id ? "bg-accent" : ""
                    }`}
                  >
                    <Avatar>
                      <AvatarFallback>
                        {typeof display.avatar === 'string' ? display.avatar : display.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="font-medium truncate">{display.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {display.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        currentUserId={currentUserId}
        onGroupCreated={fetchConversations}
      />
    </>
  );
};
