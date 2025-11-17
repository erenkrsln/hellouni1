import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FollowStats {
  followers: number;
  following: number;
  isFollowing: boolean;
}

export const useFollowStats = (profileId?: string, currentUserId?: string) => {
  return useQuery({
    queryKey: ['followStats', profileId, currentUserId],
    queryFn: async () => {
      if (!profileId || !currentUserId) throw new Error('Profile ID and current user ID are required');

      const [followersResult, followingResult, followDataResult] = await Promise.all([
        supabase
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profileId),
        supabase
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profileId),
        supabase
          .from("user_follows")
          .select("id")
          .eq("follower_id", currentUserId)
          .eq("following_id", profileId)
          .maybeSingle(),
      ]);

      return {
        followers: followersResult.count || 0,
        following: followingResult.count || 0,
        isFollowing: !!followDataResult.data,
      } as FollowStats;
    },
    enabled: !!profileId && !!currentUserId,
    staleTime: 1000 * 60, // 1 minute
  });
};
