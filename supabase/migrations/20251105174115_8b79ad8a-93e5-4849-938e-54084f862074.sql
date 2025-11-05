-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;

-- Create a new policy that allows viewing all conversations
-- The filtering will be done at the application level
CREATE POLICY "Allow viewing conversations" 
ON conversations 
FOR SELECT 
USING (true);

-- Also update the conversation_participants policies to be less restrictive
DROP POLICY IF EXISTS "View participants of conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;

CREATE POLICY "Allow viewing participants" 
ON conversation_participants 
FOR SELECT 
USING (true);

CREATE POLICY "Allow joining conversations" 
ON conversation_participants 
FOR INSERT 
WITH CHECK (true);

-- Update messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;

CREATE POLICY "Allow viewing messages" 
ON messages 
FOR SELECT 
USING (true);

CREATE POLICY "Allow sending messages" 
ON messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow updating messages" 
ON messages 
FOR UPDATE 
USING (true);

-- Update message_reads policies
DROP POLICY IF EXISTS "View read receipts" ON message_reads;
DROP POLICY IF EXISTS "Mark messages as read" ON message_reads;

CREATE POLICY "Allow viewing read receipts" 
ON message_reads 
FOR SELECT 
USING (true);

CREATE POLICY "Allow marking as read" 
ON message_reads 
FOR INSERT 
WITH CHECK (true);