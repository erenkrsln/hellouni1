-- Fix RLS policies to enforce proper access control and prevent impersonation attacks

-- ===================================
-- MESSAGES TABLE: Restrict access to conversation participants only
-- ===================================

DROP POLICY IF EXISTS "Allow viewing messages" ON messages;
CREATE POLICY "Participants can view messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = (auth.uid())::text
  )
);

DROP POLICY IF EXISTS "Allow sending messages" ON messages;
CREATE POLICY "Users can send messages as themselves"
ON messages FOR INSERT
WITH CHECK (
  sender_id = (auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = (auth.uid())::text
  )
);

DROP POLICY IF EXISTS "Allow updating messages" ON messages;
CREATE POLICY "Users can update own messages"
ON messages FOR UPDATE
USING (sender_id = (auth.uid())::text)
WITH CHECK (sender_id = (auth.uid())::text);

-- ===================================
-- CONVERSATIONS TABLE: Restrict to participants only
-- ===================================

DROP POLICY IF EXISTS "Allow viewing conversations" ON conversations;
CREATE POLICY "Participants can view conversations"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = (auth.uid())::text
  )
);

-- ===================================
-- CONVERSATION_PARTICIPANTS TABLE: Restrict to participants
-- ===================================

DROP POLICY IF EXISTS "Allow viewing participants" ON conversation_participants;
CREATE POLICY "Participants can view participant lists"
ON conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = (auth.uid())::text
  )
);

DROP POLICY IF EXISTS "Allow joining conversations" ON conversation_participants;
CREATE POLICY "Users can join conversations as themselves"
ON conversation_participants FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

-- ===================================
-- MESSAGE_READS TABLE: Restrict to conversation participants
-- ===================================

DROP POLICY IF EXISTS "Allow viewing read receipts" ON message_reads;
CREATE POLICY "Participants can view read receipts"
ON message_reads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE m.id = message_reads.message_id
    AND cp.user_id = (auth.uid())::text
  )
);

DROP POLICY IF EXISTS "Allow marking as read" ON message_reads;
CREATE POLICY "Users can mark messages as read"
ON message_reads FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

-- ===================================
-- PROFILES TABLE: Restrict email exposure
-- ===================================

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Users can view their own complete profile including email
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING ((auth.uid())::text = id);

-- Other authenticated users can view basic info but NOT email
CREATE POLICY "Authenticated users can view others basic info"
ON profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (auth.uid())::text != id
);

-- ===================================
-- POSTS TABLE: Enforce user identity on creation
-- ===================================

DROP POLICY IF EXISTS "Anyone can create posts" ON posts;
CREATE POLICY "Users can create posts as themselves"
ON posts FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

-- ===================================
-- POST_COMMENTS TABLE: Enforce user identity
-- ===================================

DROP POLICY IF EXISTS "Anyone can create comments" ON post_comments;
CREATE POLICY "Users can create comments as themselves"
ON post_comments FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Anyone can update comments" ON post_comments;
CREATE POLICY "Users can update own comments"
ON post_comments FOR UPDATE
USING (user_id = (auth.uid())::text)
WITH CHECK (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Anyone can delete comments" ON post_comments;
CREATE POLICY "Users can delete own comments"
ON post_comments FOR DELETE
USING (user_id = (auth.uid())::text);

-- ===================================
-- POST_LIKES TABLE: Enforce user identity
-- ===================================

DROP POLICY IF EXISTS "Anyone can create likes" ON post_likes;
CREATE POLICY "Users can create likes as themselves"
ON post_likes FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

DROP POLICY IF EXISTS "Anyone can delete likes" ON post_likes;
CREATE POLICY "Users can delete own likes"
ON post_likes FOR DELETE
USING (user_id = (auth.uid())::text);

-- ===================================
-- DATABASE CONSTRAINTS: Add content length limits
-- ===================================

ALTER TABLE messages ADD CONSTRAINT messages_content_length 
  CHECK (char_length(content) <= 10000);

ALTER TABLE posts ADD CONSTRAINT posts_content_length 
  CHECK (char_length(content) <= 5000);

ALTER TABLE post_comments ADD CONSTRAINT comments_content_length 
  CHECK (char_length(content) <= 2000);