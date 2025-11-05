-- Drop old function first
DROP FUNCTION IF EXISTS public.is_conversation_participant(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_or_create_conversation(UUID);
DROP FUNCTION IF EXISTS public.create_group_conversation(TEXT, UUID[]);
DROP FUNCTION IF EXISTS public.mark_message_read(UUID);

-- Drop all policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view read receipts in their conversations" ON public.message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.message_reads;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.post_likes;
DROP POLICY IF EXISTS "Users can create their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.post_comments;
DROP POLICY IF EXISTS "Users can create their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.post_comments;

-- Drop foreign keys
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.post_likes DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey;
ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;
ALTER TABLE public.conversation_participants DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.message_reads DROP CONSTRAINT IF EXISTS message_reads_user_id_fkey;

-- Drop and recreate profiles
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Update all user_id columns to TEXT
ALTER TABLE public.posts ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.post_likes ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.post_comments ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.conversation_participants ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.messages ALTER COLUMN sender_id TYPE TEXT;
ALTER TABLE public.message_reads ALTER COLUMN user_id TYPE TEXT;

-- Create new functions with TEXT parameters
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID, user_id TEXT)
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

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id UUID;
BEGIN
  SELECT c.id INTO conversation_id
  FROM conversations c
  WHERE EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
  )
  AND (
    SELECT COUNT(*) FROM conversation_participants cp
    WHERE cp.conversation_id = c.id
  ) = 2
  LIMIT 1;

  IF conversation_id IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id INTO conversation_id;

    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conversation_id, auth.uid()::text), (conversation_id, other_user_id);
  END IF;

  RETURN conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_conversation(
  group_name TEXT,
  participant_ids TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id UUID;
  participant_id TEXT;
BEGIN
  INSERT INTO conversations (name, is_group)
  VALUES (group_name, true)
  RETURNING id INTO conversation_id;

  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conversation_id, auth.uid()::text);

  FOREACH participant_id IN ARRAY participant_ids
  LOOP
    IF participant_id != auth.uid()::text THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (conversation_id, participant_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_message_read(message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO message_reads (message_id, user_id)
  VALUES (message_id, auth.uid()::text)
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$;

-- Create all policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (id = auth.uid()::text);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Posts are viewable by everyone"
ON public.posts FOR SELECT USING (true);

CREATE POLICY "Users can create their own posts"
ON public.posts FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own posts"
ON public.posts FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own posts"
ON public.posts FOR DELETE USING (user_id = auth.uid()::text);

CREATE POLICY "Likes are viewable by everyone"
ON public.post_likes FOR SELECT USING (true);

CREATE POLICY "Users can create their own likes"
ON public.post_likes FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own likes"
ON public.post_likes FOR DELETE USING (user_id = auth.uid()::text);

CREATE POLICY "Comments are viewable by everyone"
ON public.post_comments FOR SELECT USING (true);

CREATE POLICY "Users can create their own comments"
ON public.post_comments FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own comments"
ON public.post_comments FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own comments"
ON public.post_comments FOR DELETE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()::text));

CREATE POLICY "Users can join conversations"
ON public.conversation_participants FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can send messages to their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can view read receipts in their conversations"
ON public.message_reads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    INNER JOIN public.conversation_participants cp 
    ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reads.message_id
    AND cp.user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can mark messages as read"
ON public.message_reads FOR INSERT
WITH CHECK (
  user_id = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM public.messages m
    INNER JOIN public.conversation_participants cp 
    ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reads.message_id
    AND cp.user_id = auth.uid()::text
  )
);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();