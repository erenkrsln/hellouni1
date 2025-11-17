import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export const useConversations = (currentUserId?: string) => {
  return useQuery({
    queryKey: ['conversations', currentUserId],
    queryFn: async () => {
      if (!currentUserId) throw new Error('User ID is required');

      const { data: userConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      if (!userConvs || userConvs.length === 0) return [];

      const conversationIds = userConvs.map(c => c.conversation_id);

      const [convResult, allParticipantsResult, profilesResult] = await Promise.all([
        supabase.from("conversations").select("id, name, is_group").in("id", conversationIds),
        supabase.from("conversation_participants").select("conversation_id, user_id"),
        supabase.from("profiles").select("id, full_name, email, avatar_url"),
      ]);

      const convData = convResult.data || [];
      const allParticipants = allParticipantsResult.data || [];
      const allProfiles = profilesResult.data || [];

      const conversationsWithParticipants: Conversation[] = convData.map((conv: any) => {
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

      return conversationsWithParticipants;
    },
    enabled: !!currentUserId,
    staleTime: 1000 * 60, // 1 minute
  });
};
