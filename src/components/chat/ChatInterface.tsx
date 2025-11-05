import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Check, CheckCheck, Users, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { z } from "zod";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_profile?: {
    full_name: string | null;
  };
  read_by?: string[];
}

interface ChatInterfaceProps {
  conversationId: string;
  currentUserId: string;
  conversationName: string | null;
  isGroup: boolean;
  otherUserId?: string;
  onBack?: () => void;
}

const messageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Nachricht darf nicht leer sein')
    .max(10000, 'Nachricht zu lang (max 10.000 Zeichen)')
});

export const ChatInterface = ({
  conversationId, 
  currentUserId, 
  conversationName,
  isGroup,
  otherUserId,
  onBack
}: ChatInterfaceProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participants, setParticipants] = useState<{ id: string; full_name: string | null }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    fetchParticipants();
    
    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", newMsg.sender_id)
            .single();
            
          setMessages((current) => [
            ...current, 
            { ...newMsg, sender_profile: profile }
          ]);
          
          // Mark as read if not own message
          if (newMsg.sender_id !== currentUserId) {
            const { error: readError } = await supabase.rpc('mark_message_read', { 
              msg_id: newMsg.id,
              reader_user_id: currentUserId 
            });
            if (readError) {
              console.error('Error marking message as read:', readError);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to read receipts for this conversation only
    const readsChannel = supabase
      .channel(`message_reads:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
        },
        async (payload) => {
          const read = payload.new as { message_id: string; user_id: string };
          console.log('New read receipt:', read);
          
          // Update read_by for the matching message if it exists in current state
          setMessages((current) =>
            current.map((msg) =>
              msg.id === read.message_id
                ? { ...msg, read_by: [...(msg.read_by || []), read.user_id] }
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(readsChannel);
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchParticipants = async () => {
    try {
      const { data: participantData, error } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId);

      if (error) throw error;
      
      const userIds = participantData?.map(p => p.user_id) || [];
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
          
        setParticipants(
          profileData?.map(p => ({
            id: p.id,
            full_name: p.full_name,
          })) || []
        );
      }
    } catch (error) {
      console.error("Error fetching participants:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Fetch sender profiles and read receipts
      const messagesWithDetails = await Promise.all(
        (messagesData || []).map(async (msg) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", msg.sender_id)
            .single();

          const { data: reads } = await supabase
            .from("message_reads")
            .select("user_id")
            .eq("message_id", msg.id);

          return {
            ...msg,
            sender_profile: profile,
            read_by: reads?.map(r => r.user_id) || [],
          };
        })
      );

      setMessages(messagesWithDetails);

      // Mark unread messages as read
      const unreadMessages = messagesWithDetails.filter(
        msg => msg.sender_id !== currentUserId && !msg.read_by.includes(currentUserId)
      );

      for (const msg of unreadMessages) {
        const { error: readError } = await supabase.rpc('mark_message_read', { 
          msg_id: msg.id,
          reader_user_id: currentUserId 
        });
        if (readError) {
          console.error('Error marking message as read:', readError);
        }
      }
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    setSending(true);
    const messageContent = newMessage;
    
    try {
      // Validate input
      const validated = messageSchema.parse({ content: messageContent });
      
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: validated.content,
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validierungsfehler",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Fehler",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setSending(false);
    }
  };

  const getReadStatus = (message: Message) => {
    if (message.sender_id !== currentUserId) return null;
    
    const readByOthers = (message.read_by || []).filter(id => id !== currentUserId);
    
    if (isGroup) {
      const totalOthers = participants.length - 1;
      if (readByOthers.length === totalOthers && totalOthers > 0) {
        return <CheckCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      } else if (readByOthers.length > 0) {
        return <CheckCheck className="h-4 w-4 text-foreground/60" />;
      }
    } else {
      if (readByOthers.length > 0) {
        return <CheckCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      }
    }
    
    return <Check className="h-4 w-4 text-foreground/60" />;
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 p-4 border-b flex items-center gap-3 flex-shrink-0">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar>
          <AvatarFallback>
            {isGroup ? <Users className="h-5 w-5" /> : conversationName?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{conversationName || "Unbekannte Konversation"}</p>
          <p className="text-sm text-muted-foreground">
            {isGroup ? `${participants.length} Teilnehmer` : ""}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {/* Skeleton für eingehende Nachricht */}
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
              <div className="bg-muted rounded-2xl px-4 py-2 max-w-[70%]">
                <div className="h-4 bg-muted-foreground/20 rounded w-32 mb-1" />
                <div className="h-3 bg-muted-foreground/20 rounded w-20" />
              </div>
            </div>
            
            {/* Skeleton für ausgehende Nachricht */}
            <div className="flex items-start gap-2 justify-end">
              <div className="bg-primary/20 rounded-2xl px-4 py-2 max-w-[70%]">
                <div className="h-4 bg-primary/30 rounded w-40 mb-1" />
                <div className="h-3 bg-primary/30 rounded w-16" />
              </div>
            </div>
            
            {/* Skeleton für eingehende Nachricht */}
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
              <div className="bg-muted rounded-2xl px-4 py-2 max-w-[70%]">
                <div className="h-4 bg-muted-foreground/20 rounded w-48 mb-1" />
                <div className="h-3 bg-muted-foreground/20 rounded w-20" />
              </div>
            </div>

            {/* Skeleton für ausgehende Nachricht */}
            <div className="flex items-start gap-2 justify-end">
              <div className="bg-primary/20 rounded-2xl px-4 py-2 max-w-[70%]">
                <div className="h-4 bg-primary/30 rounded w-36 mb-1" />
                <div className="h-3 bg-primary/30 rounded w-16" />
              </div>
            </div>

            {/* Skeleton für eingehende Nachricht */}
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
              <div className="bg-muted rounded-2xl px-4 py-2 max-w-[70%]">
                <div className="h-4 bg-muted-foreground/20 rounded w-44 mb-1" />
                <div className="h-3 bg-muted-foreground/20 rounded w-20" />
              </div>
            </div>

            {/* Skeleton für ausgehende Nachricht */}
            <div className="flex items-start gap-2 justify-end">
              <div className="bg-primary/20 rounded-2xl px-4 py-2 max-w-[70%]">
                <div className="h-4 bg-primary/30 rounded w-52 mb-1" />
                <div className="h-3 bg-primary/30 rounded w-16" />
              </div>
            </div>

            {/* Skeleton für eingehende Nachricht */}
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
              <div className="bg-muted rounded-2xl px-4 py-2 max-w-[70%]">
                <div className="h-4 bg-muted-foreground/20 rounded w-40 mb-1" />
                <div className="h-3 bg-muted-foreground/20 rounded w-20" />
              </div>
            </div>

            {/* Skeleton für ausgehende Nachricht */}
            <div className="flex items-start gap-2 justify-end">
              <div className="bg-primary/20 rounded-2xl px-4 py-2 max-w-[70%]">
                <div className="h-4 bg-primary/30 rounded w-48 mb-1" />
                <div className="h-3 bg-primary/30 rounded w-16" />
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Noch keine Nachrichten. Schreib die erste Nachricht!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === currentUserId;
              const senderName = message.sender_profile?.full_name || "Unbekannt";
              
              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                >
                  {isGroup && !isOwn && (
                    <p className="text-xs text-muted-foreground mb-1 px-2">
                      {senderName}
                    </p>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className={`flex items-center gap-1 mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      <p className="text-xs">
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </p>
                      {getReadStatus(message)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t flex-shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder="Nachricht schreiben..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};
