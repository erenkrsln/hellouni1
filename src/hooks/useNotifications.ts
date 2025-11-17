import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
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

export const useNotifications = (userId?: string) => {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data: notificationsData, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!notificationsData || notificationsData.length === 0) return [];

      const actorIds = [...new Set(notificationsData.map(n => n.actor_id))];
      const { data: actorsData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", actorIds);

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

      return enrichedNotifications;
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
};
