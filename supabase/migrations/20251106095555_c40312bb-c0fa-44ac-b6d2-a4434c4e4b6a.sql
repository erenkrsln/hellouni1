-- Fix infinite recursion in conversation_participants policy
-- The issue is that the policy queries the same table it's applied to
-- We need a SECURITY DEFINER function to break the recursion

-- Create a function to check if user is a participant
CREATE OR REPLACE FUNCTION public.is_user_in_conversation(conv_id uuid, check_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = check_user_id
  )
$$;

-- Drop the problematic policy and recreate it using the function
DROP POLICY IF EXISTS "Participants can view participant list" ON conversation_participants;

CREATE POLICY "Participants can view participant list"
ON conversation_participants FOR SELECT
USING (
  public.is_user_in_conversation(conversation_id, (auth.uid())::text)
);