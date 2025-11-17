import { useState } from "react";
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
import { useConversations } from "@/hooks/useConversations";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);

  const { data: conversations = [], isLoading } = useConversations(currentUserId);

  const handleConversationClick = async (conversation: any) => {
    try {
      if (conversation.is_group) {
        onConversationSelect({
          id: conversation.id,
          name: conversation.name,
          isGroup: true,
        });
      } else {
        const otherUser = conversation.participants[0];
        if (!otherUser) return;

        const { data: conversationId, error } = await supabase.rpc(
          "get_or_create_conversation",
          {
            current_user_id: currentUserId,
            other_user_id: otherUser.id,
          }
        );

        if (error) throw error;

        onConversationSelect({
          id: conversationId,
          name: otherUser.full_name || otherUser.email || "Unknown",
          isGroup: false,
          otherUserId: otherUser.id,
        });
      }
    } catch (error: any) {
      console.error("Error handling conversation click:", error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Öffnen der Konversation",
        variant: "destructive",
      });
    }
  };

  const getConversationDisplay = (conversation: any) => {
    if (conversation.is_group) {
      return {
        name: conversation.name || "Gruppe",
        subtitle: `${conversation.participants.length} Mitglieder`,
        avatar: null,
      };
    } else {
      const otherUser = conversation.participants[0];
      return {
        name: otherUser?.full_name || otherUser?.email || "Unbekannt",
        subtitle: otherUser?.email || "",
        avatar: otherUser?.avatar_url,
      };
    }
  };

  const filteredConversations = conversations.filter((conv: any) => {
    const display = getConversationDisplay(conv);
    return display.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const directConversations = filteredConversations.filter((c: any) => !c.is_group);
  const groupConversations = filteredConversations.filter((c: any) => c.is_group);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Nachrichten</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNewDM(true)}
              title="Neue Direktnachricht"
            >
              <MessageSquarePlus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCreateGroup(true)}
              title="Neue Gruppe erstellen"
            >
              <Users className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Konversationen durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="all" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Alle
          </TabsTrigger>
          <TabsTrigger value="direct" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Direkt
          </TabsTrigger>
          <TabsTrigger value="groups" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            Gruppen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            {isLoading && conversations.length === 0 ? (
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
                    size="sm"
                    onClick={() => setShowNewDM(true)}
                    className="mx-auto"
                  >
                    <MessageSquarePlus className="h-4 w-4 mr-2" />
                    Neue Nachricht
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateGroup(true)}
                    className="mx-auto"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Gruppe erstellen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conversation: any) => {
                  const display = getConversationDisplay(conversation);
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleConversationClick(conversation)}
                      className={`w-full p-4 hover:bg-accent transition-colors text-left ${
                        selectedConversationId === conversation.id ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {display.avatar && <AvatarImage src={display.avatar} />}
                          <AvatarFallback>
                            {conversation.is_group ? (
                              <Users className="h-4 w-4" />
                            ) : (
                              display.name[0]?.toUpperCase() || "U"
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{display.name}</p>
                            {conversation.is_group && (
                              <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {display.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="direct" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            {directConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-muted-foreground text-sm mb-4">
                  Keine Direktnachrichten
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewDM(true)}
                  className="mx-auto"
                >
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Neue Nachricht
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {directConversations.map((conversation: any) => {
                  const display = getConversationDisplay(conversation);
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleConversationClick(conversation)}
                      className={`w-full p-4 hover:bg-accent transition-colors text-left ${
                        selectedConversationId === conversation.id ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {display.avatar && <AvatarImage src={display.avatar} />}
                          <AvatarFallback>
                            {display.name[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{display.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {display.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="groups" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            {groupConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-muted-foreground text-sm mb-4">
                  Keine Gruppen
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateGroup(true)}
                  className="mx-auto"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Gruppe erstellen
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {groupConversations.map((conversation: any) => {
                  const display = getConversationDisplay(conversation);
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleConversationClick(conversation)}
                      className={`w-full p-4 hover:bg-accent transition-colors text-left ${
                        selectedConversationId === conversation.id ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            <Users className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{display.name}</p>
                            <Users className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {display.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        currentUserId={currentUserId}
        onGroupCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['conversations', currentUserId] });
        }}
      />

      <NewDirectMessageDialog
        open={showNewDM}
        onOpenChange={setShowNewDM}
        currentUserId={currentUserId}
        onConversationCreated={(data) => {
          onConversationSelect(data);
          setShowNewDM(false);
        }}
      />
    </Card>
  );
};
