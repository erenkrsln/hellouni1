import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PostWithProfile {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  post_likes: { user_id: string }[];
  post_comments: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }[];
}

export const usePosts = () => {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      if (!postsData || postsData.length === 0) return [];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url");

      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id, user_id");

      const { data: commentsData } = await supabase
        .from("post_comments")
        .select("*");

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const likesMap = new Map<string, any[]>();
      likesData?.forEach(like => {
        if (!likesMap.has(like.post_id)) {
          likesMap.set(like.post_id, []);
        }
        likesMap.get(like.post_id)!.push(like);
      });

      const commentsMap = new Map<string, any[]>();
      commentsData?.forEach(comment => {
        if (!commentsMap.has(comment.post_id)) {
          commentsMap.set(comment.post_id, []);
        }
        commentsMap.get(comment.post_id)!.push({
          ...comment,
          profiles: profilesMap.get(comment.user_id) || null,
        });
      });

      const enrichedPosts: PostWithProfile[] = postsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || null,
        post_likes: likesMap.get(post.id) || [],
        post_comments: commentsMap.get(post.id) || [],
      }));

      return enrichedPosts;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useUserPosts = (userId?: string) => {
  return useQuery({
    queryKey: ['posts', 'user', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      if (!postsData || postsData.length === 0) return [];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url");

      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id, user_id");

      const { data: commentsData } = await supabase
        .from("post_comments")
        .select("*");

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const likesMap = new Map<string, any[]>();
      likesData?.forEach(like => {
        if (!likesMap.has(like.post_id)) {
          likesMap.set(like.post_id, []);
        }
        likesMap.get(like.post_id)!.push(like);
      });

      const commentsMap = new Map<string, any[]>();
      commentsData?.forEach(comment => {
        if (!commentsMap.has(comment.post_id)) {
          commentsMap.set(comment.post_id, []);
        }
        commentsMap.get(comment.post_id)!.push({
          ...comment,
          profiles: profilesMap.get(comment.user_id) || null,
        });
      });

      const enrichedPosts: PostWithProfile[] = postsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || null,
        post_likes: likesMap.get(post.id) || [],
        post_comments: commentsMap.get(post.id) || [],
      }));

      return enrichedPosts;
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
};
