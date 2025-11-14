import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Users, MessageSquarePlus, UserPlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { NewDirectMessageDialog } from "./NewDirectMessageDialog";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  participants: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
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
  const [showNewDM, setShowNewDM] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [currentUserId]);

  const fetchConversations = async () => {
    try {
      const { data: userConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      if (!userConvs) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = userConvs.map(c => c.conversation_id);

      if (conversationIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get conversation details and participants
      const [convResult, allParticipantsResult, profilesResult] = await Promise.all([
        supabase.from("conversations").select("id, name, is_group").in("id", conversationIds),
        supabase.from("conversation_participants").select("conversation_id, user_id"),
        supabase.from("profiles").select("id, full_name, email, avatar_url"),
      ]);

      const convData = convResult.data || [];
      const allParticipants = allParticipantsResult.data || [];
      const allProfiles = profilesResult.data || [];

      // Build conversations with participants
      const conversationsWithParticipants = convData.map((conv: any) => {
        const convParticipants = allParticipants
          .filter((p: any) => p.conversation_id === conv.id && p.user_id !== currentUserId)
          .map((p: any) => p.user_id);

        const participants = allProfiles
          .filter((profile: any) => convParticipants.includes(profile.id))
          .map((profile: any) => ({
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
          }));

        return {
          ...conv,
          participants,
        };
      });

      setConversations(conversationsWithParticipants);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Laden der Konversationen",
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
        try {
          const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', { 
            other_user_id: otherUser.id 
          });

          if (error) throw error;

          onConversationSelect({
            id: conversationId,
            name: otherUser.full_name,
            isGroup: false,
            otherUserId: otherUser.id,
          });
        } catch (error: any) {
          console.error("Error getting conversation:", error);
          toast({
            title: "Fehler",
            description: error.message || "Fehler beim Öffnen der Konversation",
            variant: "destructive",
          });
        }
      }
    }
  };

  const getConversationDisplay = (conv: Conversation) => {
    if (conv.is_group) {
      return {
        name: conv.name || "Unbenannte Gruppe",
        subtitle: `${conv.participants.length + 1} Teilnehmer`,
        avatar: <Users className="h-5 w-5" />,
        avatarUrl: null,
      };
    } else {
      const otherUser = conv.participants[0];
      return {
        name: otherUser?.full_name || "Unbekannter Nutzer",
        subtitle: otherUser?.email || "",
        avatar: otherUser?.full_name?.[0]?.toUpperCase() || "U",
        avatarUrl: otherUser?.avatar_url || null,
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

  const directMessages = filteredConversations.filter(c => !c.is_group);
  const groupChats = filteredConversations.filter(c => c.is_group);

  return (
    <>
      <div className="h-full flex flex-col bg-background md:rounded-lg md:border md:shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 space-y-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-2xl md:text-3xl">Chats</h1>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowNewDM(true)}
                title="Neue Direktnachricht"
                className="rounded-full"
              >
                <UserPlus className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowCreateGroup(true)}
                title="Neue Gruppe"
                className="rounded-full"
              >
                <Users className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full bg-muted/50 border-0"
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 grid w-auto grid-cols-3 gap-2 bg-transparent">
            <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-muted">
              Alle
            </TabsTrigger>
            <TabsTrigger value="direct" className="rounded-full data-[state=active]:bg-muted">
              Direkt
            </TabsTrigger>
            <TabsTrigger value="groups" className="rounded-full data-[state=active]:bg-muted">
              Gruppen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 mt-2 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-muted-foreground text-sm mb-4">
                    Keine Konversationen gefunden
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewDM(true)}
                      className="mx-auto rounded-full"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Neue Direktnachricht
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateGroup(true)}
                      className="mx-auto rounded-full"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Neue Gruppe erstellen
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {filteredConversations.map((conv) => {
                    const display = getConversationDisplay(conv);
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleConversationClick(conv)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                          selectedConversationId === conv.id ? "bg-muted/50" : ""
                        }`}
                      >
                        <Avatar className="h-12 w-12">
                          {display.avatarUrl && (
                            <AvatarImage src={display.avatarUrl} alt="Avatar" />
                          )}
                          <AvatarFallback className="text-base">
                            {typeof display.avatar === 'string' ? display.avatar : display.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left overflow-hidden min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-semibold truncate">{display.name}</p>
                            <span className="text-xs text-muted-foreground flex-shrink-0">12:30</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {display.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="direct" className="flex-1 mt-2 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : directMessages.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-muted-foreground text-sm mb-4">
                    Noch keine Direktnachrichten
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewDM(true)}
                    className="mx-auto rounded-full"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Neue Direktnachricht starten
                  </Button>
                </div>
              ) : (
                <div>
                  {directMessages.map((conv) => {
                    const display = getConversationDisplay(conv);
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleConversationClick(conv)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                          selectedConversationId === conv.id ? "bg-muted/50" : ""
                        }`}
                      >
                        <Avatar className="h-12 w-12">
                          {display.avatarUrl && (
                            <AvatarImage src={display.avatarUrl} alt="Avatar" />
                          )}
                          <AvatarFallback className="text-base">
                            {typeof display.avatar === 'string' ? display.avatar : display.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left overflow-hidden min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-semibold truncate">{display.name}</p>
                            <span className="text-xs text-muted-foreground flex-shrink-0">12:30</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {display.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="groups" className="flex-1 mt-2 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : groupChats.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-muted-foreground text-sm mb-4">
                    Noch keine Gruppen
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateGroup(true)}
                    className="mx-auto rounded-full"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Neue Gruppe erstellen
                  </Button>
                </div>
              ) : (
                <div>
                  {groupChats.map((conv) => {
                    const display = getConversationDisplay(conv);
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleConversationClick(conv)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                          selectedConversationId === conv.id ? "bg-muted/50" : ""
                        }`}
                      >
                        <Avatar className="h-12 w-12">
                          {display.avatarUrl && (
                            <AvatarImage src={display.avatarUrl} alt="Avatar" />
                          )}
                          <AvatarFallback className="text-base">
                            {typeof display.avatar === 'string' ? display.avatar : display.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left overflow-hidden min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-semibold truncate">{display.name}</p>
                            <span className="text-xs text-muted-foreground flex-shrink-0">12:30</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {display.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <NewDirectMessageDialog
        open={showNewDM}
        onOpenChange={setShowNewDM}
        currentUserId={currentUserId}
        onConversationCreated={(conversation) => {
          setShowNewDM(false);
          fetchConversations();
          onConversationSelect(conversation);
        }}
      />

      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        currentUserId={currentUserId}
        onGroupCreated={fetchConversations}
      />
    </>
  );
};
