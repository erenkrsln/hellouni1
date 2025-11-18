import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Heart, MessageCircle, UserPlus, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useQueryClient } from "@tanstack/react-query";

const Notifications = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: notifications = [], isLoading } = useNotifications(user?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);


  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
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

      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
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
    <div className="min-h-screen bg-background">
      <main className="container max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Benachrichtigungen</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} ungelesene Benachrichtigung{unreadCount !== 1 ? "en" : ""}
              </p>
            )}
          </div>
          
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
            >
              Alle als gelesen markieren
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Keine Benachrichtigungen
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  !notification.is_read ? "border-primary" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      {notification.actor?.avatar_url && (
                        <AvatarImage src={notification.actor.avatar_url} alt="Avatar" />
                      )}
                      <AvatarFallback>
                        {notification.actor?.full_name?.[0]?.toUpperCase() || 
                         notification.actor?.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        {getNotificationIcon(notification.type)}
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
                      </div>
                    </div>

                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notifications;
