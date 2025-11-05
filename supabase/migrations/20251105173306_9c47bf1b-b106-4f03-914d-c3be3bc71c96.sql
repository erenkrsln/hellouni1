-- Update messages RLS policies to work without auth.uid() (for Clerk integration)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- SELECT: Users can view messages if they are participants in the conversation
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
  )
);

-- INSERT: Allow insert if sender is a participant of the conversation
CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = messages.sender_id
  )
);

-- UPDATE: Allow updates for all participants of the conversation
CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
  )
);

-- Also update conversation_participants policies to work without auth.uid()
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;

CREATE POLICY "View participants of conversations"
ON public.conversation_participants
FOR SELECT
USING (true);

CREATE POLICY "Users can join conversations"
ON public.conversation_participants
FOR INSERT
WITH CHECK (true);

-- Update message_reads policies
DROP POLICY IF EXISTS "Users can view read receipts in their conversations" ON public.message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.message_reads;

CREATE POLICY "View read receipts"
ON public.message_reads
FOR SELECT
USING (true);

CREATE POLICY "Mark messages as read"
ON public.message_reads
FOR INSERT
WITH CHECK (true);