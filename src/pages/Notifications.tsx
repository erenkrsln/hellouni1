import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Heart, MessageCircle, UserPlus, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow";
  actor_id: string;
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  post?: {
    content: string;
  } | null;
}

const Notifications = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data: notificationsData, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!notificationsData || notificationsData.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      // Fetch actor profiles
      const actorIds = [...new Set(notificationsData.map(n => n.actor_id))];
      const { data: actorsData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", actorIds);

      // Fetch post content for like and comment notifications
      const postIds = notificationsData
        .filter(n => n.post_id)
        .map(n => n.post_id);
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, content")
        .in("id", postIds);

      const actorsMap = new Map(actorsData?.map(a => [a.id, a]) || []);
      const postsMap = new Map(postsData?.map(p => [p.id, p]) || []);

      const enrichedNotifications: Notification[] = notificationsData.map(n => ({
        ...n,
        type: n.type as "like" | "comment" | "follow",
        actor: actorsMap.get(n.actor_id) || null,
        post: n.post_id ? postsMap.get(n.post_id) : null,
      }));

      setNotifications(enrichedNotifications);
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast({
        title: "Erledigt",
        description: "Alle Benachrichtigungen als gelesen markiert",
      });
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on type
    if (notification.type === "follow") {
      navigate(`/profile/${notification.actor?.username}`);
    } else if (notification.type === "like" || notification.type === "comment") {
      navigate("/home");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-5 w-5 text-red-500 fill-current" />;
      case "comment":
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case "follow":
        return <UserPlus className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const actorName = notification.actor?.full_name || `@${notification.actor?.username}` || "Jemand";
    
    switch (notification.type) {
      case "like":
        return (
          <>
            <span className="font-semibold">{actorName}</span> hat deinen Beitrag geliked
            {notification.post && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                "{notification.post.content}"
              </p>
            )}
          </>
        );
      case "comment":
        return (
          <>
            <span className="font-semibold">{actorName}</span> hat deinen Beitrag kommentiert
            {notification.post && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                "{notification.post.content}"
              </p>
            )}
          </>
        );
      case "follow":
        return <><span className="font-semibold">{actorName}</span> folgt dir jetzt</>;
      default:
        return null;
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />
      
      <main className="container max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Benachrichtigungen</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} ungelesen{unreadCount !== 1 ? "e" : ""}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm">
              <Check className="h-4 w-4 mr-2" />
              Alle als gelesen markieren
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Keine Benachrichtigungen vorhanden
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
                  !notification.is_read ? "bg-accent/50" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    {notification.actor?.avatar_url && (
                      <AvatarImage src={notification.actor.avatar_url} alt="Avatar" />
                    )}
                    <AvatarFallback>
                      {notification.actor?.full_name?.[0]?.toUpperCase() ||
                        notification.actor?.username?.[0]?.toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          {getNotificationText(notification)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Notifications;
