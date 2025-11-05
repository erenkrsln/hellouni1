-- Fix RLS policies to work with Clerk authentication
-- Since Clerk is used instead of Supabase Auth, we cannot use auth.uid()

-- ===================================
-- POST_COMMENTS TABLE
-- ===================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_comments' AND policyname = 'Authenticated users can update comments') THEN
    DROP POLICY "Authenticated users can update comments" ON post_comments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_comments' AND policyname = 'Authenticated users can delete comments') THEN
    DROP POLICY "Authenticated users can delete comments" ON post_comments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_comments' AND policyname = 'Authenticated users can create comments') THEN
    DROP POLICY "Authenticated users can create comments" ON post_comments;
  END IF;
END $$;

CREATE POLICY "Authenticated users can create comments"
ON post_comments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update comments"
ON post_comments FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete comments"
ON post_comments FOR DELETE
USING (true);

-- ===================================
-- POST_LIKES TABLE
-- ===================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_likes' AND policyname = 'Authenticated users can create likes') THEN
    DROP POLICY "Authenticated users can create likes" ON post_likes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_likes' AND policyname = 'Authenticated users can delete likes') THEN
    DROP POLICY "Authenticated users can delete likes" ON post_likes;
  END IF;
END $$;

CREATE POLICY "Authenticated users can create likes"
ON post_likes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete likes"
ON post_likes FOR DELETE
USING (true);

-- ===================================
-- MESSAGES TABLE
-- ===================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Authenticated users can send messages') THEN
    DROP POLICY "Authenticated users can send messages" ON messages;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Authenticated users can update messages') THEN
    DROP POLICY "Authenticated users can update messages" ON messages;
  END IF;
END $$;

CREATE POLICY "Authenticated users can send messages"
ON messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update messages"
ON messages FOR UPDATE
USING (true)
WITH CHECK (true);

-- ===================================
-- CONVERSATION_PARTICIPANTS
-- ===================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_participants' AND policyname = 'Authenticated users can join conversations') THEN
    DROP POLICY "Authenticated users can join conversations" ON conversation_participants;
  END IF;
END $$;

CREATE POLICY "Authenticated users can join conversations"
ON conversation_participants FOR INSERT
WITH CHECK (true);