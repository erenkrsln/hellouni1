import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClerkSupabaseProxy } from "@/lib/clerkSupabase";
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
  const proxy = useClerkSupabaseProxy();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participants, setParticipants] = useState<{ id: string; full_name: string | null }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const convChannelRef = useRef<any>(null);

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
        },
        async (payload) => {
          const newMsg: any = payload.new;

          // Only process messages for the active conversation
          if (newMsg.conversation_id !== conversationId) {
            console.log('Ignoring message for other conversation', newMsg.conversation_id);
            return;
          }

          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", newMsg.sender_id)
            .single();

          // Avoid duplicates (e.g., optimistic UI + realtime insert)
          setMessages((current) => {
            if (current.some((m) => m.id === newMsg.id)) return current;
            return [...current, { ...newMsg, sender_profile: profile }];
          });

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
      .subscribe((status) => {
        console.log('Realtime messages channel status:', status);
      });

    // Subscribe to read receipts - filter in code to only process relevant ones
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
          
          // Only update if this message exists in our current conversation
          setMessages((current) => {
            const messageExists = current.some(msg => msg.id === read.message_id);
            if (!messageExists) {
              console.log('Ignoring read receipt for message not in this conversation');
              return current;
            }
            
            return current.map((msg) =>
              msg.id === read.message_id && !msg.read_by?.includes(read.user_id)
                ? { ...msg, read_by: [...(msg.read_by || []), read.user_id] }
                : msg
            );
          });
        }
      )
      .subscribe();

    // Broadcast channel for immediate cross-tab updates
    const convChannel = supabase
      .channel(`conversation:${conversationId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'message:new' }, async ({ payload }) => {
        const newMsg = payload as any;
        if (!newMsg || newMsg.conversation_id !== conversationId) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", newMsg.sender_id)
          .single();

        setMessages((current) => {
          if (current.some((m) => m.id === newMsg.id)) return current;
          return [...current, { ...newMsg, sender_profile: profile }];
        });
      })
      .subscribe((status) => console.log('Broadcast channel status:', status));

    convChannelRef.current = convChannel;

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(readsChannel);
      if (convChannelRef.current) supabase.removeChannel(convChannelRef.current);
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
      const participantData = await proxy.from("conversation_participants")
        .select("user_id", undefined, { conversation_id: conversationId });

      if (!participantData.data) return;
      
      const userIds = participantData.data.map((p: any) => p.user_id);
      
      if (userIds.length > 0) {
        const profileData = await proxy.from("profiles").select("id, full_name");
          
        setParticipants(
          profileData.data?.filter((p: any) => userIds.includes(p.id)).map((p: any) => ({
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
      const messagesData = await proxy.from("messages")
        .select("*", { column: 'created_at', ascending: true }, { conversation_id: conversationId });

      if (!messagesData.data || messagesData.data.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // Batch fetch all sender profiles
      const senderIds = [...new Set(messagesData.data.map((msg: any) => msg.sender_id))];
      const profilesResult = await proxy.from("profiles").select("id, full_name");
      
      const profilesMap = new Map(
        (profilesResult.data || [])
          .filter((p: any) => senderIds.includes(p.id))
          .map((p: any) => [p.id, p])
      );

      // Batch fetch all read receipts
      const messageIds = messagesData.data.map((msg: any) => msg.id);
      const readsResult = await proxy.from("message_reads").select("message_id, user_id");

      const readsMap = new Map<string, string[]>();
      (readsResult.data || [])
        .filter((read: any) => messageIds.includes(read.message_id))
        .forEach((read: any) => {
          if (!readsMap.has(read.message_id)) {
            readsMap.set(read.message_id, []);
          }
          readsMap.get(read.message_id)!.push(read.user_id);
        });

      // Combine data
      const messagesWithDetails = messagesData.data.map((msg: any) => ({
        ...msg,
        sender_profile: profilesMap.get(msg.sender_id) || null,
        read_by: readsMap.get(msg.id) || [],
      }));

      setMessages(messagesWithDetails);

      // Mark unread messages as read
      const unreadMessages = messagesWithDetails.filter(
        (msg: any) => msg.sender_id !== currentUserId && !msg.read_by.includes(currentUserId)
      );

      for (const msg of unreadMessages) {
        await proxy.rpc('mark_message_read', { 
          msg_id: msg.id,
          reader_user_id: currentUserId 
        });
      }
    } catch (error: any) {
      console.error("Error fetching messages:", error);
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
      
      // Optimistic update: Add message immediately to UI
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: currentUserId,
        content: validated.content,
        created_at: new Date().toISOString(),
        sender_profile: {
          full_name: null,
        },
        read_by: [currentUserId],
      };
      
      setMessages((current) => [...current, tempMessage]);
      setNewMessage("");
      
      const data = await proxy.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: validated.content,
      });

      if (!data.data) throw new Error("Failed to send message");
      
      // Replace temp message with real one
      if (data.data) {
        const realMessage = Array.isArray(data.data) ? data.data[0] : data.data;
        setMessages((current) => 
          current.map((msg) => 
            msg.id === tempMessage.id 
              ? { ...realMessage, sender_profile: tempMessage.sender_profile, read_by: tempMessage.read_by }
              : msg
          )
        );

        // Broadcast to other clients in this conversation for instant updates
        try {
          convChannelRef.current?.send({
            type: 'broadcast',
            event: 'message:new',
            payload: realMessage,
          });
        } catch (e) {
          console.log('Broadcast send failed:', e);
        }
      }
    } catch (error: any) {
      // Remove optimistic message on error
      setMessages((current) => current.filter((msg) => !msg.id.startsWith('temp-')));
      
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
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
