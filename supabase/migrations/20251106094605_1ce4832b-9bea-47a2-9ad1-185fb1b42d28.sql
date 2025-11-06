-- Fix all critical RLS security issues

-- ============================================
-- 1. CONVERSATIONS & MESSAGES PRIVACY
-- ============================================

-- Conversations: Only participants can view
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

-- Messages: Only conversation participants can view
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

-- Conversation participants: Only participants can view participant list
DROP POLICY IF EXISTS "Allow viewing conversation participants" ON conversation_participants;
CREATE POLICY "Participants can view participant list"
ON conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = (auth.uid())::text
  )
);

-- Message reads: Only participants can view read receipts
DROP POLICY IF EXISTS "Allow viewing read receipts" ON message_reads;
CREATE POLICY "Participants can view read receipts"
ON message_reads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reads.message_id
    AND cp.user_id = (auth.uid())::text
  )
);

-- ============================================
-- 2. POSTS - OWNERSHIP VALIDATION
-- ============================================

-- Posts UPDATE: Only owners can update their posts
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
CREATE POLICY "Users can update their own posts"
ON posts FOR UPDATE
USING (user_id = (auth.uid())::text)
WITH CHECK (user_id = (auth.uid())::text);

-- Posts DELETE: Only owners can delete their posts
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
CREATE POLICY "Users can delete their own posts"
ON posts FOR DELETE
USING (user_id = (auth.uid())::text);

-- Posts INSERT: Verify user_id matches authenticated user
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Users can create their own posts"
ON posts FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

-- ============================================
-- 3. POST COMMENTS - OWNERSHIP VALIDATION
-- ============================================

-- Comments UPDATE: Only owners can update
DROP POLICY IF EXISTS "Authenticated users can update comments" ON post_comments;
CREATE POLICY "Users can update their own comments"
ON post_comments FOR UPDATE
USING (user_id = (auth.uid())::text)
WITH CHECK (user_id = (auth.uid())::text);

-- Comments DELETE: Only owners can delete
DROP POLICY IF EXISTS "Authenticated users can delete comments" ON post_comments;
CREATE POLICY "Users can delete their own comments"
ON post_comments FOR DELETE
USING (user_id = (auth.uid())::text);

-- Comments INSERT: Verify user_id matches authenticated user
DROP POLICY IF EXISTS "Authenticated users can create comments" ON post_comments;
CREATE POLICY "Users can create their own comments"
ON post_comments FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

-- ============================================
-- 4. POST LIKES - OWNERSHIP VALIDATION
-- ============================================

-- Likes INSERT: Verify user_id matches authenticated user
DROP POLICY IF EXISTS "Authenticated users can create likes" ON post_likes;
CREATE POLICY "Users can create their own likes"
ON post_likes FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

-- Likes DELETE: Only owners can delete their likes
DROP POLICY IF EXISTS "Authenticated users can delete likes" ON post_likes;
CREATE POLICY "Users can delete their own likes"
ON post_likes FOR DELETE
USING (user_id = (auth.uid())::text);

-- ============================================
-- 5. MESSAGES - OWNERSHIP VALIDATION
-- ============================================

-- Messages UPDATE: Only sender can update
DROP POLICY IF EXISTS "Authenticated users can update messages" ON messages;
CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
USING (sender_id = (auth.uid())::text)
WITH CHECK (sender_id = (auth.uid())::text);

-- Messages INSERT: Verify sender_id matches authenticated user
DROP POLICY IF EXISTS "Authenticated users can send messages" ON messages;
CREATE POLICY "Users can send their own messages"
ON messages FOR INSERT
WITH CHECK (sender_id = (auth.uid())::text);

-- ============================================
-- 6. MESSAGE READS - OWNERSHIP VALIDATION
-- ============================================

-- Message reads INSERT: Verify user_id matches authenticated user
DROP POLICY IF EXISTS "Allow marking messages as read" ON message_reads;
CREATE POLICY "Users can mark messages as read for themselves"
ON message_reads FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

-- ============================================
-- 7. PROFILES - OWNERSHIP VALIDATION
-- ============================================

-- Profiles INSERT: Verify id matches authenticated user
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile only"
ON profiles FOR INSERT
WITH CHECK (id = (auth.uid())::text);

-- ============================================
-- 8. CONVERSATION PARTICIPANTS - REMOVE DIRECT INSERT
-- ============================================

-- Remove direct INSERT access - force use of RPC functions
-- This prevents users from adding themselves to any conversation
DROP POLICY IF EXISTS "Authenticated users can join conversations" ON conversation_participants;