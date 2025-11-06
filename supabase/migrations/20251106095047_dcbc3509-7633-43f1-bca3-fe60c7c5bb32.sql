-- Fix message_reads RLS policy for realtime compatibility
-- The issue is that the JOIN in the policy can cause realtime to fail
-- We need a simpler approach that still maintains security

DROP POLICY IF EXISTS "Participants can view read receipts" ON message_reads;

-- Create a simpler policy that works with realtime
-- Users can see read receipts for messages they have access to
CREATE POLICY "Users can view read receipts"
ON message_reads FOR SELECT
USING (
  -- Either it's their own read receipt
  user_id = (auth.uid())::text
  OR
  -- Or they're a participant in the conversation that contains this message
  EXISTS (
    SELECT 1 
    FROM messages m
    WHERE m.id = message_reads.message_id
    AND EXISTS (
      SELECT 1 
      FROM conversation_participants cp
      WHERE cp.conversation_id = m.conversation_id
      AND cp.user_id = (auth.uid())::text
    )
  )
);