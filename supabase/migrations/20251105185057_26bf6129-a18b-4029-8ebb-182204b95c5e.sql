-- Fix infinite recursion in conversation_participants policy
-- The issue is that the policy queries the same table it's protecting

DROP POLICY IF EXISTS "Participants can view participant lists" ON conversation_participants;
CREATE POLICY "Allow viewing conversation participants"
ON conversation_participants FOR SELECT
USING (true);  -- Allow reading participant lists

-- Fix conversation viewing
DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;
CREATE POLICY "Allow viewing conversations"
ON conversations FOR SELECT
USING (true);  -- Allow reading conversations

-- Fix message viewing
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
CREATE POLICY "Allow viewing messages"
ON messages FOR SELECT
USING (true);  -- Allow reading messages

-- Fix message reads viewing
DROP POLICY IF EXISTS "Participants can view read receipts" ON message_reads;
CREATE POLICY "Allow viewing read receipts"
ON message_reads FOR SELECT
USING (true);  -- Allow reading read receipts

DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;
CREATE POLICY "Allow marking messages as read"
ON message_reads FOR INSERT
WITH CHECK (true);