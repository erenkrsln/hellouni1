-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

-- Create a security definer function to check if user is in conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND conversation_participants.user_id = user_id
  );
$$;

-- Create new policy using the function
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants FOR SELECT
USING (
  public.is_conversation_participant(conversation_id, auth.uid())
);